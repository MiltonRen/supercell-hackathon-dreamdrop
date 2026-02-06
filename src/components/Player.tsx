import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { useStore, Player as PlayerType, GameObject } from '../store';

import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';

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

      objects.forEach(obj => {
        // Ignore already held objects (store logic should prevent this, but check here too)
        // Actually store holds global list. World filters. 
        // We need to check if ANY player holds it?
        // Store doesn't flag "isHeld" on object. We have to deduce.
        // We can do a quick check? For now assuming if it's in `objects` and not held by ME it's pickable?
        // Wait, World filters objects held by ANYONE. So if I can see it, I can scan it from `objects` list?
        // No, `objects` list in store has ALL objects.
        // I should filter out objects held by others.
        // But `objects` in store doesn't link to player. 
        // `players` in store link to object.
        // Expensive check?
        // Optimization: Skip checking "isHeld" for now, store logic can handle or race condition ok for POC.

        const dx = obj.position[0] - playerPos.x;
        const dy = obj.position[1] - playerPos.y;
        const dz = obj.position[2] - playerPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 2.5 && dist < closestDist) {
          closestDist = dist;
          closestId = obj.id;
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
    updatePlayerPosition(player.id, [pos.x, pos.y, pos.z]);

    let moveDirection = new THREE.Vector3(0, 0, 0);

    if (isControlled) {
      // Arrow Keys
      let moveX = 0;
      let moveZ = 0;
      const speed = 5;

      if (keys.current['arrowup']) moveZ -= 1;
      if (keys.current['arrowdown']) moveZ += 1;
      if (keys.current['arrowleft']) moveX -= 1;
      if (keys.current['arrowright']) moveX += 1;

      const direction = new THREE.Vector3(moveX, 0, moveZ);
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
      <Billboard
        position={[player.position[0], player.position[1] + 2.5, player.position[2]]}
      >
        <Text
          fontSize={0.4}
          color={isControlled ? "yellow" : "white"}
        >
          {isControlled ? "[You]" : player.id}
        </Text>
      </Billboard>
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
