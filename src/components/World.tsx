import { useStore, GameObject } from '../store';
import { RigidBody } from '@react-three/rapier';

function GameObj({ obj }: { obj: GameObject }) {
  const { position, color, shape, scale } = obj;

  const width = scale?.[0] || 1;
  const height = scale?.[1] || 1;

  // Calculate local offset to sit on ground (pivot at bottom)
  let meshYOffset = height / 2;
  if (shape === 'sphere') meshYOffset = width; // Radius

  // Basic geometry mapping
  let Geometry = <boxGeometry args={scale || [1, 1, 1]} />;
  if (shape === 'cylinder') Geometry = <cylinderGeometry args={[width, width, height]} />;
  if (shape === 'sphere') Geometry = <sphereGeometry args={[width]} />;

  // Collision shape mapping for Rapier (RigidBody handles auto-shape usually, but precise colliders can be added if needed)
  // For now, allow auto hull generation or basic primities by RigidBody type
  // To keep it simple, we use "Fixed" for static objects

  return (
    <RigidBody type={obj.type === 'static' ? 'fixed' : 'dynamic'} position={position} colliders="hull" userData={{ id: obj.id }}>
      <mesh castShadow receiveShadow position={[0, meshYOffset, 0]}>
        {Geometry}
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
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
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#5C4033" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 5, -25.5]} visible={false}>
          <boxGeometry args={[51, 10, 1]} />
        </mesh>
        <mesh position={[0, 5, 25.5]} visible={false}>
          <boxGeometry args={[51, 10, 1]} />
        </mesh>
        <mesh position={[-25.5, 5, 0]} visible={false}>
          <boxGeometry args={[1, 10, 51]} />
        </mesh>
        <mesh position={[25.5, 5, 0]} visible={false}>
          <boxGeometry args={[1, 10, 51]} />
        </mesh>
      </RigidBody>

      {/* Game Objects */}
      {objects.filter(obj => !heldObjectIds.has(obj.id)).map(obj => (
        <group key={obj.id}>
          <GameObj obj={obj} />
        </group>
      ))}
    </group>
  );
}
