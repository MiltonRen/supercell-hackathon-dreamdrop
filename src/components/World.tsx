import React, { useMemo } from 'react';
import { useStore, GameObject } from '../store';
import { RigidBody, useRapier } from '@react-three/rapier';
import { useFrame, useLoader } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

useLoader.preload(OBJLoader, '/src/assets/rocket/base.obj');
useLoader.preload(THREE.TextureLoader, '/src/assets/rocket/texture_diffuse.png');
useLoader.preload(THREE.TextureLoader, '/src/assets/rocket/texture_normal.png');
useLoader.preload(THREE.TextureLoader, '/src/assets/rocket/texture_roughness.png');
useLoader.preload(THREE.TextureLoader, '/src/assets/rocket/texture_metallic.png');

const RocketModel = React.memo(({ color, scale }: { color: string; scale: [number, number, number] }) => {
  const obj = useLoader(OBJLoader, '/src/assets/rocket/base.obj');
  const diffuseMap = useLoader(THREE.TextureLoader, '/src/assets/rocket/texture_diffuse.png');
  const normalMap = useLoader(THREE.TextureLoader, '/src/assets/rocket/texture_normal.png');
  const roughnessMap = useLoader(THREE.TextureLoader, '/src/assets/rocket/texture_roughness.png');
  const metalnessMap = useLoader(THREE.TextureLoader, '/src/assets/rocket/texture_metallic.png');

  const clonedModel = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: diffuseMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          metalnessMap: metalnessMap,
          color
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj, diffuseMap, normalMap, roughnessMap, metalnessMap, color]);

  return <primitive object={clonedModel} scale={scale} />;
});

const GameObj = React.memo(({ obj }: { obj: GameObject }) => {
  const { position, color, shape, scale } = obj;

  const width = scale?.[0] || 1;
  const height = scale?.[1] || 1;

  let meshYOffset = height / 2;
  if (shape === 'sphere') meshYOffset = width;
  if (shape === 'rocket') meshYOffset = 0;

  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[width, width, height]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[width]} />;
  if (shape === 'cone') Geometry = <coneGeometry args={[width, height, 24]} />;

  const rigidBodyPosition: [number, number, number] = shape === 'rocket'
    ? [position[0], 0, position[2]]
    : position;

  return (
    <RigidBody
      type={obj.type === 'static' ? 'fixed' : 'dynamic'}
      position={rigidBodyPosition}
      colliders="cuboid"
      userData={{ id: obj.id, type: obj.type, scale: scale || [1, 1, 1] }}
      lockRotations
    >
      {shape === 'rocket' ? (
        <group position={[0, meshYOffset, 0]}>
          <RocketModel color={color} scale={scale || [1, 1, 1]} />
        </group>
      ) : (
        <mesh castShadow receiveShadow position={[0, meshYOffset, 0]}>
          {Geometry}
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </RigidBody>
  );
});

export function World() {
  const objects = useStore(state => state.objects);

  // Return a simple primitive string to ensure maximum stability in React's render cycle.
  // This avoids any issues with custom equality functions and "getSnapshot" caching warnings.
  const heldObjectIdsKey = useStore(state => {
    return Object.values(state.players)
      .map(p => p.heldObjectId)
      .filter(Boolean)
      .sort()
      .join(',');
  });

  // Reconstruct the Set only when the underlying IDs string changes
  const heldObjectIds = useMemo(() => new Set(heldObjectIdsKey.split(',')), [heldObjectIdsKey]);

  const visibleObjects = useMemo(() =>
    objects.filter(obj => !heldObjectIds.has(obj.id)),
    [objects, heldObjectIds]);

  // Win detection - track objects in contact with goal plane
  const winHeight = useStore(state => state.winHeight);
  const hasWon = useStore(state => state.hasWon);
  const setHasWon = useStore(state => state.setHasWon);
  const mergeObjectsIntoRocket = useStore(state => state.mergeObjectsIntoRocket);
  const { world } = useRapier();

  // Track which objects are touching the goal plane and for how long
  const contactTimesRef = React.useRef<Map<string, number>>(new Map());
  const WIN_CONTACT_DURATION = 10000; // 10 seconds in milliseconds
  const RAINBOW_START_DURATION = 3000; // 3 seconds - when rainbow starts
  const hasMergedRef = React.useRef(false);

  // State for visual feedback
  const [currentContactDuration, setCurrentContactDuration] = React.useState(0);

  const hasDynamicObjects = React.useMemo(
    () => objects.some(obj => obj.type === 'dynamic'),
    [objects]
  );

  React.useEffect(() => {
    if (!hasWon && hasDynamicObjects) {
      hasMergedRef.current = false;
      contactTimesRef.current.clear();
      setCurrentContactDuration(0);
    }
  }, [hasWon, hasDynamicObjects]);

  useFrame(() => {
    if (hasWon || hasMergedRef.current) return; // Already won or merged

    const currentTime = Date.now();
    let maxContactDuration = 0;

    // Check all rigid bodies in the physics world
    world.forEachRigidBody((body) => {
      const userData = body.userData as { id?: string; type?: string; scale?: [number, number, number] };
      if (userData?.type !== 'dynamic' || !userData.id) return;

      const translation = body.translation();
      const velocity = body.linvel();
      const scale = userData.scale || [1, 1, 1];
      const topY = translation.y + scale[1] / 2;

      // Check if object is at the goal height and relatively stable (not just passing through)
      const isAtGoalHeight = Math.abs(topY - winHeight) < 0.5;
      const isStable = Math.abs(velocity.y) < 0.5; // Not moving too fast vertically

      if (isAtGoalHeight && isStable) {
        // Object is in contact with goal plane
        if (!contactTimesRef.current.has(userData.id)) {
          contactTimesRef.current.set(userData.id, currentTime);
        }

        const contactStartTime = contactTimesRef.current.get(userData.id)!;
        const contactDuration = currentTime - contactStartTime;

        // Track the maximum contact duration for visual effects
        maxContactDuration = Math.max(maxContactDuration, contactDuration);

        if (contactDuration >= WIN_CONTACT_DURATION && !hasMergedRef.current) {
          hasMergedRef.current = true;
          // Merge all blocks into a rocket cone at the center of mass of blocks.
          let count = 0;
          let sumX = 0;
          let sumZ = 0;
          let maxTopY = 0;
          world.forEachRigidBody((rb) => {
            const rbData = rb.userData as { type?: string; scale?: [number, number, number] };
            if (rbData?.type !== 'dynamic') return;
            const rbPos = rb.translation();
            const rbScale = rbData.scale || [1, 1, 1];
            const rbTopY = rbPos.y + rbScale[1] / 2;
            sumX += rbPos.x;
            sumZ += rbPos.z;
            count += 1;
            maxTopY = Math.max(maxTopY, rbTopY);
          });
          const rocketHeight = Math.max(4, maxTopY);
          const rocketX = count > 0 ? sumX / count : 0;
          const rocketZ = count > 0 ? sumZ / count : 0;
          const clearRadius = rocketHeight;
          const clearIds: string[] = [];
          world.forEachRigidBody((rb) => {
            const rbData = rb.userData as { id?: string; type?: string };
            if (!rbData?.id || rbData.type !== 'dynamic') return;
            const rbPos = rb.translation();
            const dx = rbPos.x - rocketX;
            const dz = rbPos.z - rocketZ;
            if ((dx * dx + dz * dz) < clearRadius * clearRadius) {
              clearIds.push(rbData.id);
            }
          });
          mergeObjectsIntoRocket({
            position: [rocketX, rocketHeight / 2, rocketZ],
            height: rocketHeight,
            clearIds
          });
          setHasWon(true);
        }
      } else {
        // Object is no longer in contact, reset timer
        contactTimesRef.current.delete(userData.id);
      }
    });

    // Update visual state
    setCurrentContactDuration(maxContactDuration);
  });

  return (
    <group>
      {/* Ground - thick box for stability */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[50, 1, 50]} />
          <meshStandardMaterial color="#814900" />
        </mesh>
      </RigidBody>

      {/* Invisible boundaries */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 5, -25.5]} visible={false}><boxGeometry args={[51, 10, 1]} /></mesh>
        <mesh position={[0, 5, 25.5]} visible={false}><boxGeometry args={[51, 10, 1]} /></mesh>
        <mesh position={[-25.5, 5, 0]} visible={false}><boxGeometry args={[1, 10, 51]} /></mesh>
        <mesh position={[25.5, 5, 0]} visible={false}><boxGeometry args={[1, 10, 51]} /></mesh>
      </RigidBody>

      {/* Game Objects */}
      {visibleObjects.map(obj => (
        <GameObj key={obj.id} obj={obj} />
      ))}

      {/* Win Height Indicator - Transparent plane with dotted green border */}
      <group position={[0, winHeight, 0]}>
        {/* Dotted border lines forming a square */}
        {(() => {
          // Calculate color based on contact duration
          let lineColor = '#00ff00'; // Default green
          const isRainbowActive = currentContactDuration >= RAINBOW_START_DURATION;

          if (isRainbowActive) {
            // Rainbow colors: Red, Orange, Yellow, Green, Blue, Indigo, Violet
            const rainbowColors = [
              '#FF0000', // Red
              '#FF7F00', // Orange
              '#FFFF00', // Yellow
              '#00FF00', // Green
              '#0000FF', // Blue
              '#4B0082', // Indigo
              '#9400D3', // Violet
            ];

            // Calculate which color to show based on time
            // Cycle through all 7 colors over the remaining time (10s - 3s = 7s)
            const rainbowDuration = WIN_CONTACT_DURATION - RAINBOW_START_DURATION;
            const timeSinceRainbowStart = currentContactDuration - RAINBOW_START_DURATION;
            const progress = timeSinceRainbowStart / rainbowDuration;

            // Map progress to color index with smooth transitions
            const colorIndex = (progress * rainbowColors.length) % rainbowColors.length;
            const currentColorIndex = Math.floor(colorIndex);
            const nextColorIndex = (currentColorIndex + 1) % rainbowColors.length;
            const blend = colorIndex - currentColorIndex;

            // For simplicity, just use the current color (smooth blending would require more complex logic)
            lineColor = rainbowColors[currentColorIndex];
          }

          return (
            <>
              {/* Semi-transparent colored plane during rainbow stage */}
              {isRainbowActive && (
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[50, 50]} />
                  <meshBasicMaterial
                    color={lineColor}
                    transparent
                    opacity={0.33}
                    side={2} // DoubleSide
                  />
                </mesh>
              )}

              {/* Border lines */}
              <Line
                points={[[-25, 0, -25], [25, 0, -25]]}  // Front edge
                color={lineColor}
                lineWidth={3}
                dashed
                dashScale={2}
                dashSize={0.5}
                gapSize={0.3}
              />
              <Line
                points={[[25, 0, -25], [25, 0, 25]]}   // Right edge
                color={lineColor}
                lineWidth={3}
                dashed
                dashScale={2}
                dashSize={0.5}
                gapSize={0.3}
              />
              <Line
                points={[[25, 0, 25], [-25, 0, 25]]}   // Back edge
                color={lineColor}
                lineWidth={3}
                dashed
                dashScale={2}
                dashSize={0.5}
                gapSize={0.3}
              />
              <Line
                points={[[-25, 0, 25], [-25, 0, -25]]} // Left edge
                color={lineColor}
                lineWidth={3}
                dashed
                dashScale={2}
                dashSize={0.5}
                gapSize={0.3}
              />
            </>
          );
        })()}
      </group>
    </group>
  );
}
