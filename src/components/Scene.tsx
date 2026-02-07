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
      <Canvas shadows camera={{ position: [20, 10, 30], fov: 25 }}>
        <color attach="background" args={['#afdeff']} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[30, 30, 30]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-camera-near={0.1}
          shadow-camera-far={200}
          shadow-bias={-0.0001}
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
