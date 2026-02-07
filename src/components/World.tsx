import React, { useMemo } from 'react';
import { useStore, GameObject } from '../store';
import { RigidBody } from '@react-three/rapier';

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
    </group>
  );
}
