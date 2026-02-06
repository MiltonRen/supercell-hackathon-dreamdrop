import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier } from '@react-three/rapier';
import { useStore, Player as PlayerType, GameObject } from '../store';

import * as THREE from 'three';

function HeldObject({ objectId }: { objectId: string }) {
  const objects = useStore(state => state.objects);
  const obj = objects.find(o => o.id === objectId);

  if (!obj) return null;

  const { color, shape, scale } = obj;
  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[scale?.[0] || 1, scale?.[0] || 1, scale?.[1] || 1]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[scale?.[0] || 1]} />;

  return (
    <group position={[0, 2.5, 0]}>
      <mesh castShadow receiveShadow>
        {Geometry}
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Player({ player, isControlled }: { player: PlayerType, isControlled: boolean }) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const updatePlayerPosition = useStore(state => state.updatePlayerPosition);
  const pickupObject = useStore(state => state.pickupObject);
  const dropObject = useStore(state => state.dropObject);
  const objects = useStore(state => state.objects);
  const { world } = useRapier();

  // Movement Logic
  const keys = useRef<{ [key: string]: boolean }>({});

  // AI State
  const aiState = useRef({
    direction: new THREE.Vector3(0, 0, 0),
    nextActionTime: 0
  });

  useEffect(() => {
    if (!isControlled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keys.current[e.key.toLowerCase()] = true;

      // Interaction
      if (e.code === 'Space') {
        handleInteraction();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isControlled, player.heldObjectId, objects]); // Deps for interaction closure

  const handleInteraction = () => {
    if (!rigidBodyRef.current) return;
    const playerPos = rigidBodyRef.current.translation();

    if (player.heldObjectId) {
      // Drop
      // Calculate drop position in front of player
      // We need player rotation ideally, but currently we lock rotations. 
      // We can infer forward from movement or just drop at current pos + offset

      // Since we don't track rotation explicitly (lockRotations), let's assume "Forward" is based on last movement or just Z+? 
      // Better: Drop slightly in front or just at same x,z but distinct.
      // Actually, without rotation, "front" is ambiguous. Let's drop at random offset close by.
      const dropPos: [number, number, number] = [
        playerPos.x + (Math.random() - 0.5) * 2,
        playerPos.y, // Let physics resolve height
        playerPos.z + (Math.random() - 0.5) * 2
      ];
      dropObject(player.id, dropPos);

    } else {
      // Pickup
      // Find closest object
      let closestDist = Infinity;
      let closestId = null;

      // Iterate via Physics World to get ACTUAL positions (not potentially stale store positions)
      world.forEachRigidBody((body) => {
        // Skip self
        if (body.handle === rigidBodyRef.current?.handle) return;

        // check userData for ID
        const userData = body.userData as { id?: string };
        if (!userData || !userData.id) return;

        const pos = body.translation();
        const dx = pos.x - playerPos.x;
        const dy = pos.y - playerPos.y;
        const dz = pos.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Increased range from 2.5 to 5.0 to handle larger objects and LLM objects that might be slightly offset
        if (dist < 5.0 && dist < closestDist) {
          closestDist = dist;
          closestId = userData.id;
        }
      });

      if (closestId) {
        // Double check not held (lazy way: check if it disappears from world?)
        // Let's just pickup.
        pickupObject(player.id, closestId);
      }
    }
  };

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const pos = rigidBodyRef.current.translation();

    // Safety check: if player falls off map, reset position
    if (pos.y < -10) {
      rigidBodyRef.current.setTranslation({ x: 0, y: 5, z: 0 }, true);
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    updatePlayerPosition(player.id, [pos.x, pos.y, pos.z]);

    let moveDirection = new THREE.Vector3(0, 0, 0);

    if (isControlled) {
      // Arrow Keys
      // Arrow Keys
      const speed = 5;
      const direction = new THREE.Vector3(0, 0, 0);

      // Get camera facing direction (projected to ground plane)
      const front = new THREE.Vector3();
      state.camera.getWorldDirection(front);
      front.y = 0;
      front.normalize();

      // Get camera right direction
      const right = new THREE.Vector3();
      right.crossVectors(front, new THREE.Vector3(0, 1, 0)).normalize();

      if (keys.current['arrowup']) direction.add(front);
      if (keys.current['arrowdown']) direction.sub(front);
      if (keys.current['arrowleft']) direction.sub(right);
      if (keys.current['arrowright']) direction.add(right);

      if (direction.length() > 0) direction.normalize().multiplyScalar(speed);
      moveDirection.copy(direction);

    } else {
      // AI Logic
      if (state.clock.elapsedTime > aiState.current.nextActionTime) {
        // New Plan
        aiState.current.nextActionTime = state.clock.elapsedTime + 1 + Math.random() * 3;

        // Random Move
        const angle = Math.random() * Math.PI * 2;
        const speed = 2;
        aiState.current.direction.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);

        // Random Action
        if (Math.random() < 0.3) {
          handleInteraction();
        }
      }
      moveDirection.copy(aiState.current.direction);
    }

    // Apply Velocity
    const currentVel = rigidBodyRef.current.linvel();
    // Maintain Y velocity (gravity), replace X/Z
    // Linear interpolation for smoother AI movement? No, instant is fine.

    // For AI, stop if hitting wall? RigidBody handles collision.

    rigidBodyRef.current.setLinvel({
      x: moveDirection.x,
      y: currentVel.y,
      z: moveDirection.z
    }, true);
  });

  return (
    <group>
      <RigidBody
        ref={rigidBodyRef}
        position={player.position}
        enabledRotations={[false, false, false]}
        colliders="cuboid"
        lockRotations
        friction={0}
      >
        <mesh castShadow receiveShadow position={[0, 1, 0]}>
          <capsuleGeometry args={[0.5, 1, 4, 8]} />
          <meshStandardMaterial color={player.color} />
        </mesh>

        {/* Held Object Visual */}
        {player.heldObjectId && <HeldObject objectId={player.heldObjectId} />}

      </RigidBody>

      {/* Name Tag */}
      {/* Name Tag Removed */}
    </group>
  );
}

export function Players() {
  const players = useStore(state => state.players);
  const currentPlayerId = useStore(state => state.currentPlayerId);
  const setCurrentPlayer = useStore(state => state.setCurrentPlayer);
  const addPlayer = useStore(state => state.addPlayer);

  // Keyboard listener for switching players '[' and ']'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const playerIds = Object.keys(players);
      if (playerIds.length === 0) return;

      const currentIndex = playerIds.indexOf(currentPlayerId || "");

      if (e.key === '[') {
        const nextIndex = (currentIndex - 1 + playerIds.length) % playerIds.length;
        setCurrentPlayer(playerIds[nextIndex]);
      } else if (e.key === ']') {
        const nextIndex = (currentIndex + 1) % playerIds.length;
        setCurrentPlayer(playerIds[nextIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [players, currentPlayerId, setCurrentPlayer]);


  return (
    <>
      {Object.values(players).map(p => (
        <Player
          key={p.id}
          player={p}
          isControlled={p.id === currentPlayerId}
        />
      ))}
    </>
  );
}
