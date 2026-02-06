import { useStore, GameObject } from '../store';
import { RigidBody } from '@react-three/rapier';

function GameObj({ obj }: { obj: GameObject }) {
  const { position, color, shape, scale } = obj;

  // Basic geometry mapping
  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[scale?.[0] || 1, scale?.[0] || 1, scale?.[1] || 1]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[scale?.[0] || 1]} />;

  // Collision shape mapping for Rapier (RigidBody handles auto-shape usually, but precise colliders can be added if needed)
  // For now, allow auto hull generation or basic primities by RigidBody type
  // To keep it simple, we use "Fixed" for static objects

  return (
    <RigidBody type={obj.type === 'static' ? 'fixed' : 'dynamic'} position={position} colliders="hull">
      <mesh castShadow receiveShadow>
        {Geometry}
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Simple Text Label */}
      <group position={[0, (scale?.[1] || 1) / 2 + 1, 0]}>
        {/* Text rendering in R3F needs 'Text' from drei, let's import it */}
      </group>
    </RigidBody>
  );
}

import { Text, Billboard } from '@react-three/drei';

function ObjectLabel({ obj }: { obj: GameObject }) {
  const yOffset = (obj.scale?.[1] || 1) / 2 + 0.5;
  return (
    <Billboard
      position={[obj.position[0], obj.position[1] + yOffset, obj.position[2]]}
    >
      <Text
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {obj.label}
      </Text>
    </Billboard>
  );
}

export function World() {
  const objects = useStore(state => state.objects);
  const players = useStore(state => state.players);

  const heldObjectIds = new Set(Object.values(players).map(p => p.heldObjectId).filter(Boolean));

  return (
    <group>
      {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#5C4033" />
        </mesh>
      </RigidBody>

      {/* Game Objects */}
      {objects.filter(obj => !heldObjectIds.has(obj.id)).map(obj => (
        <group key={obj.id}>
          <GameObj obj={obj} />
          <ObjectLabel obj={obj} />
        </group>
      ))}
    </group>
  );
}
