import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { World } from './World';
import { Players } from './Player'; // We will create a component that maps players
import { OrbitControls } from '@react-three/drei';
import { useStore } from '../store';
import { useEffect } from 'react';

export function Scene() {
  const addPlayer = useStore(state => state.addPlayer);
  const setCurrentPlayer = useStore(state => state.setCurrentPlayer);
  const players = useStore(state => state.players);

  useEffect(() => {
    // Initialize default players if none exist
    if (Object.keys(players).length === 0) {
      addPlayer("Millie", "white");
      addPlayer("Boba", "red");
      addPlayer("Poco", "yellow");
      addPlayer("Superbad", "green");
      setCurrentPlayer("Millie");
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas shadows camera={{ position: [20, 10, 20], fov: 40 }}>
        <color attach="background" args={['#ffffff']} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <Physics debug={false}>
          <World />
          <Players />
        </Physics>

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
