import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier } from '@react-three/rapier';
import { useStore, Player as PlayerType, GameObject } from '../store';

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

function CharacterModel({ color, moveDirection }: { color: string, moveDirection: THREE.Vector3 }) {
  const modelRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);

  // Load OBJ model
  const obj = useLoader(OBJLoader, '/src/assets/character_noeye/base.obj');

  // Load textures
  const diffuseMap = useLoader(THREE.TextureLoader, '/src/assets/character_noeye/texture_diffuse.png');
  const normalMap = useLoader(THREE.TextureLoader, '/src/assets/character_noeye/texture_normal.png');
  const roughnessMap = useLoader(THREE.TextureLoader, '/src/assets/character_noeye/texture_roughness.png');
  const metalnessMap = useLoader(THREE.TextureLoader, '/src/assets/character_noeye/texture_metallic.png');

  // Clone the model to avoid sharing materials between instances
  const clonedModel = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: diffuseMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          metalnessMap: metalnessMap,
          color: color,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj, diffuseMap, normalMap, roughnessMap, metalnessMap, color]);

  // Update rotation to face movement direction
  useFrame(() => {
    if (!modelRef.current) return;

    // Calculate target rotation based on movement direction
    if (moveDirection.length() > 0.1) {
      targetRotation.current = Math.atan2(moveDirection.x, moveDirection.z);
    }

    // Smoothly interpolate rotation
    const currentRotation = modelRef.current.rotation.y;
    const diff = targetRotation.current - currentRotation;
    // Normalize angle difference to [-PI, PI]
    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    modelRef.current.rotation.y += normalizedDiff * 0.15; // Smooth interpolation
  });

  return (
    <group ref={modelRef} position={[0, 0, 0]} scale={0.8}>
      <primitive object={clonedModel} />
    </group>
  );
}

function HeldObject({ objectId }: { objectId: string }) {
  const objects = useStore(state => state.objects);
  const obj = objects.find(o => o.id === objectId);

  if (!obj) return null;

  const { color, shape, scale } = obj;
  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[scale?.[0] || 1, scale?.[0] || 1, scale?.[1] || 1]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[scale?.[0] || 1]} />;
  if (shape === 'cone') Geometry = <coneGeometry args={[scale?.[0] || 1, scale?.[1] || 1, 24]} />;
  if (shape === 'rocket') Geometry = <coneGeometry args={[scale?.[0] || 1, scale?.[1] || 1, 24]} />;

  return (
    <group position={[0, 1.5, 0]}>
      <mesh castShadow receiveShadow>
        {Geometry}
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

const Player = React.memo(({ id, isControlled }: { id: string, isControlled: boolean }) => {
  const player = useStore(state => state.players[id]);
  if (!player) return null;

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const objects = useStore(state => state.objects);
  const updatePlayerPosition = useStore(state => state.updatePlayerPosition);
  const pickupObject = useStore(state => state.pickupObject);
  const dropObject = useStore(state => state.dropObject);
  const { world } = useRapier();

  // Movement Logic
  const keys = useRef<{ [key: string]: boolean }>({});
  const currentMoveDirection = useRef(new THREE.Vector3(0, 0, 0));

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
  }, [isControlled, player.heldObjectId]); // Removed 'objects' from deps, we use world query instead for performance

  const handleInteraction = () => {
    if (!rigidBodyRef.current) return;
    const playerPos = rigidBodyRef.current.translation();

    if (player.heldObjectId) {
      // Drop with Stacking Logic
      let targetPos: [number, number, number] | null = null;
      const SNAP_RADIUS = 2.5;
      const DROP_GAP = 0.001;

      const heldObj = objects.find(o => o.id === player.heldObjectId);
      const heldScale = heldObj?.scale || [1, 1, 1];
      const heldHeight = heldScale[1] || 1;

      // Find closest object in XZ plane within snap radius
      let stackTarget: { x: number; z: number; topY: number } | null = null;
      let closestDistSq = SNAP_RADIUS * SNAP_RADIUS;

      world.forEachRigidBody((body) => {
        if (body.handle === rigidBodyRef.current?.handle) return;

        const userData = body.userData as { id?: string, scale?: [number, number, number] };
        if (!userData || !userData.id || userData.id === player.heldObjectId) return;

        const bPos = body.translation();
        const scale = userData.scale || [1, 1, 1];
        const dx = playerPos.x - bPos.x;
        const dz = playerPos.z - bPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq > closestDistSq) return;

        const topY = bPos.y + (scale[1] || 1) / 2;
        closestDistSq = distSq;
        stackTarget = { x: bPos.x, z: bPos.z, topY };
      });

      if (stackTarget) {
        targetPos = [
          stackTarget.x,
          stackTarget.topY + heldHeight / 2 + DROP_GAP,
          stackTarget.z
        ];
      }

      const finalPos: [number, number, number] = targetPos || [
        playerPos.x + (Math.random() - 0.5) * 2,
        playerPos.y + 1, // Drop from character height
        playerPos.z + (Math.random() - 0.5) * 2
      ];

      dropObject(player.id, finalPos);
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
        const userData = body.userData as { id?: string; type?: string };
        if (!userData || !userData.id) return;
        if (userData.type !== 'dynamic') return;

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

    // Only update the store if the position has changed significantly to avoid spam
    updatePlayerPosition(player.id, [pos.x, pos.y, pos.z]);

    let moveDirection = new THREE.Vector3(0, 0, 0);

    if (isControlled) {
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
        aiState.current.nextActionTime = state.clock.elapsedTime + 1 + Math.random() * 2;

        // Random Move
        const angle = Math.random() * Math.PI * 2;
        const speed = 1;
        aiState.current.direction.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);

        // Random Action
        if (Math.random() < 0.3) {
          handleInteraction();
        }
      }
      moveDirection.copy(aiState.current.direction);
    }

    // Store move direction for character rotation
    currentMoveDirection.current.copy(moveDirection);

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
        {/* 3D Character Model */}
        <CharacterModel color={player.color} moveDirection={currentMoveDirection.current} />

        {/* Held Object Visual */}
        {player.heldObjectId && <HeldObject objectId={player.heldObjectId} />}
      </RigidBody>
    </group>
  );
});

export function Players() {
  const playerIdsStr = useStore(state => Object.keys(state.players).sort().join(','));
  const playerIds = useMemo(() => playerIdsStr.split(',').filter(Boolean), [playerIdsStr]);
  const currentPlayerId = useStore(state => state.currentPlayerId);
  const setCurrentPlayer = useStore(state => state.setCurrentPlayer);

  // Keyboard listener for switching players '[' and ']'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

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
  }, [playerIds, currentPlayerId, setCurrentPlayer]);


  return (
    <>
      {playerIds.map(id => (
        <Player
          key={id}
          id={id}
          isControlled={id === currentPlayerId}
        />
      ))}
    </>
  );
}
