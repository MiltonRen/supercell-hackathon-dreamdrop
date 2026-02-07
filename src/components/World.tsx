import React, { useMemo } from 'react';
import { useStore, GameObject } from '../store';
import { RigidBody, useRapier } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';

const GameObj = React.memo(({ obj }: { obj: GameObject }) => {
  const { position, color, shape, scale } = obj;

  const width = scale?.[0] || 1;
  const height = scale?.[1] || 1;

  let meshYOffset = height / 2;
  if (shape === 'sphere') meshYOffset = width;

  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[width, width, height]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[width]} />;

  return (
    <RigidBody
      type={obj.type === 'static' ? 'fixed' : 'dynamic'}
      position={position}
      colliders="cuboid"
      userData={{ id: obj.id, type: obj.type, scale: scale || [1, 1, 1] }}
    >
      <mesh castShadow receiveShadow position={[0, meshYOffset, 0]}>
        {Geometry}
        <meshStandardMaterial color={color} />
      </mesh>
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
  const { world } = useRapier();

  // Track which objects are touching the goal plane and for how long
  const contactTimesRef = React.useRef<Map<string, number>>(new Map());
  const WIN_CONTACT_DURATION = 13000; // 13 seconds in milliseconds
  const RAINBOW_START_DURATION = 3000; // 3 seconds - when rainbow starts

  // State for visual feedback
  const [currentContactDuration, setCurrentContactDuration] = React.useState(0);

  useFrame((_, delta) => {
    if (hasWon) return; // Already won, don't check anymore

    const currentTime = Date.now();
    const deltaMs = delta * 1000;

    let maxContactDuration = 0;

    // Check all rigid bodies in the physics world
    world.forEachRigidBody((body) => {
      const userData = body.userData as { id?: string; type?: string };
      if (userData?.type === 'dynamic' && userData?.id) {
        const translation = body.translation();
        const velocity = body.linvel();

        // Check if object is at the goal height and relatively stable (not just passing through)
        const isAtGoalHeight = Math.abs(translation.y - winHeight) < 0.5;
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

          if (contactDuration >= WIN_CONTACT_DURATION) {
            setHasWon(true);
          }
        } else {
          // Object is no longer in contact, reset timer
          contactTimesRef.current.delete(userData.id);
        }
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
          <meshStandardMaterial color="#808080" />
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
            // Cycle through all 7 colors over the remaining time (13s - 3s = 10s)
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
