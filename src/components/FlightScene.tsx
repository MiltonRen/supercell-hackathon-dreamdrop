import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { soundSynthesizer } from '../utils/SoundSynthesizer';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { createPortal } from 'react-dom';

const HAZARD_SPAWN_INTERVAL = 0.55; // seconds
const GOAL_SPAWN_INTERVAL = 20; // seconds
const PLAYER_SPEED = 8;
const PLAYER_RADIUS = 0.6;
const PLAYER_BOUNDS = { x: 6, y: 4.5 };
const HAZARD_BOUNDS = { x: 10, y: 7.5 };
const LASER_SPEED = 28;
const LASER_RADIUS = 0.2;
const LASER_COOLDOWN = 0.2; // seconds
const GOAL_RADIUS = 4.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Orb = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  speed: number;
  kind: 'hazard' | 'goal';
};

type Laser = {
  id: string;
  x: number;
  y: number;
  z: number;
  speed: number;
};

const AstroidModel = ({ scale, tint }: { scale: number; tint: THREE.ColorRepresentation }) => {
  const obj = useLoader(OBJLoader, '/src/assets/astroid/base.obj');
  const diffuseMap = useLoader(THREE.TextureLoader, '/src/assets/astroid/texture_diffuse.png');
  const normalMap = useLoader(THREE.TextureLoader, '/src/assets/astroid/texture_normal.png');
  const roughnessMap = useLoader(THREE.TextureLoader, '/src/assets/astroid/texture_roughness.png');
  const metalnessMap = useLoader(THREE.TextureLoader, '/src/assets/astroid/texture_metallic.png');

  const clonedModel = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: diffuseMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          metalnessMap: metalnessMap,
          color: tint
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj, diffuseMap, normalMap, roughnessMap, metalnessMap, tint]);

  return <primitive object={clonedModel} scale={[scale, scale, scale]} />;
};

function FlightStage({ paused, onCrash, onLand }: { paused: boolean; onCrash: () => void; onLand: () => void }) {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const lasersRef = useRef<Laser[]>([]);

  const keys = useRef<Record<string, boolean>>({});
  const playerPos = useRef(new THREE.Vector3(0, 1.6, 2));
  const lastHazardSpawn = useRef(0);
  const lastGoalSpawn = useRef(0);
  const lastShot = useRef(0);
  const idCounter = useRef(0);
  const pausedRef = useRef(paused);
  const endedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (pausedRef.current) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      keys.current[e.code.toLowerCase()] = true;

      if (e.code === 'Space') {
        const now = performance.now() / 1000;
        if (now - lastShot.current < LASER_COOLDOWN) return;
        lastShot.current = now;
        soundSynthesizer.playPickupSound();

        const newLaser: Laser = {
          id: `laser_${idCounter.current++}`,
          x: playerPos.current.x,
          y: playerPos.current.y,
          z: playerPos.current.z - 1,
          speed: LASER_SPEED
        };
        const nextLasers = [...lasersRef.current, newLaser];
        lasersRef.current = nextLasers;
        setLasers(nextLasers);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      keys.current[e.code.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (paused || endedRef.current) return;

    const now = state.clock.elapsedTime;

    // Player movement (screen plane)
    const direction = new THREE.Vector3(
      (keys.current['arrowright'] ? 1 : 0) - (keys.current['arrowleft'] ? 1 : 0),
      (keys.current['arrowup'] ? 1 : 0) - (keys.current['arrowdown'] ? 1 : 0),
      0
    );
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(PLAYER_SPEED * delta);
      playerPos.current.add(direction);
      playerPos.current.x = clamp(playerPos.current.x, -PLAYER_BOUNDS.x, PLAYER_BOUNDS.x);
      playerPos.current.y = clamp(playerPos.current.y, 0.5, PLAYER_BOUNDS.y);
    }

    state.camera.position.copy(playerPos.current);
    state.camera.lookAt(playerPos.current.x, playerPos.current.y, playerPos.current.z - 1);

    // Spawn new hazards
    let workingOrbs = orbsRef.current;
    if (now - lastHazardSpawn.current >= HAZARD_SPAWN_INTERVAL) {
      lastHazardSpawn.current = now;
      const radius = 0.3 + Math.random() * 1.5;
      const newOrb: Orb = {
        id: `hazard_${idCounter.current++}`,
        x: (Math.random() * 2 - 1) * HAZARD_BOUNDS.x,
        y: 0.6 + Math.random() * (HAZARD_BOUNDS.y - 0.6),
        z: -70 - Math.random() * 40,
        radius,
        speed: 6 + Math.random() * 8,
        kind: 'hazard'
      };
      workingOrbs = [...workingOrbs, newOrb];
    }

    // Spawn goal orb
    if (now - lastGoalSpawn.current >= GOAL_SPAWN_INTERVAL) {
      lastGoalSpawn.current = now;
      const newGoal: Orb = {
        id: `goal_${idCounter.current++}`,
        x: (Math.random() * 2 - 1) * (HAZARD_BOUNDS.x * 0.8),
        y: 1 + Math.random() * (HAZARD_BOUNDS.y - 1),
        z: -90,
        radius: GOAL_RADIUS,
        speed: 5,
        kind: 'goal'
      };
      workingOrbs = [...workingOrbs, newGoal];
    }

    // Move lasers
    const movedLasers = lasersRef.current
      .map((laser) => ({ ...laser, z: laser.z - laser.speed * delta }))
      .filter((laser) => laser.z > -110);

    // Move orbs
    const movedOrbs = workingOrbs
      .map((orb) => ({ ...orb, z: orb.z + orb.speed * delta }))
      .filter((orb) => orb.z < 6);

    // Laser-orb collisions (hazards only)
    const destroyedOrbIds = new Set<string>();
    const destroyedLaserIds = new Set<string>();

    for (const orb of movedOrbs) {
      if (orb.kind !== 'hazard') continue;
      for (const laser of movedLasers) {
        const dx = orb.x - laser.x;
        const dy = orb.y - laser.y;
        const dz = orb.z - laser.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < (orb.radius + LASER_RADIUS) ** 2) {
          destroyedOrbIds.add(orb.id);
          destroyedLaserIds.add(laser.id);
          break;
        }
      }
    }

    // Player collisions
    let landed = false;
    let crashed = false;
    for (const orb of movedOrbs) {
      if (destroyedOrbIds.has(orb.id)) continue;
      const dx = orb.x - playerPos.current.x;
      const dy = orb.y - playerPos.current.y;
      const dz = orb.z - playerPos.current.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < (orb.radius + PLAYER_RADIUS) ** 2) {
        if (orb.kind === 'goal') {
          landed = true;
        } else {
          crashed = true;
        }
        break;
      }
    }

    if (landed) {
      endedRef.current = true;
      onLand();
      return;
    }

    if (crashed) {
      endedRef.current = true;
      onCrash();
      return;
    }

    const survivingOrbs = movedOrbs.filter((orb) => !destroyedOrbIds.has(orb.id));
    const survivingLasers = movedLasers.filter((laser) => !destroyedLaserIds.has(laser.id));

    orbsRef.current = survivingOrbs;
    lasersRef.current = survivingLasers;
    setOrbs(survivingOrbs);
    setLasers(survivingLasers);
  });

  return (
    <>
      <color attach="background" args={['#06070c']} />
      <fog attach="fog" args={['#06070c', 20, 120]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} />

      {/* Ground plane */}
      <mesh position={[0, -8, -40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1b2133" />
      </mesh>

      {/* Orbs */}
      {orbs.map((orb) => (
        <group key={orb.id} position={[orb.x, orb.y, orb.z]}>
          {orb.kind === 'goal' ? (
            <mesh castShadow>
              <sphereGeometry args={[orb.radius, 24, 24]} />
              <meshStandardMaterial color="#3fb6ff" emissive="#2b8fff" emissiveIntensity={1.2} />
            </mesh>
          ) : (
            <AstroidModel scale={Math.max(0.5, orb.radius * 0.8)} tint="#ff3b3b" />
          )}
        </group>
      ))}

      {/* Lasers */}
      {lasers.map((laser) => (
        <mesh key={laser.id} position={[laser.x, laser.y, laser.z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.2, 8]} />
          <meshStandardMaterial color="#7fd9ff" emissive="#4cc3ff" emissiveIntensity={1.2} />
        </mesh>
      ))}

    </>
  );
}

function LandingPopup({ onLand }: { onLand: () => void }) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const content = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      color: 'white',
      gap: '24px'
    }}>
      <div style={{
        fontSize: '54px',
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.1,
        textShadow: '0 0 20px rgba(255,255,255,0.25)'
      }}>
        new world discovered!
      </div>
      <button
        onClick={onLand}
        style={{
          padding: '18px 46px',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(0, 176, 155, 0.4)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 176, 155, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 176, 155, 0.4)';
        }}
      >
        land
      </button>
    </div>
  );
  return portalTarget ? createPortal(content, portalTarget) : content;
}

function CrashPopup({ onRetry }: { onRetry: () => void }) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const content = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      color: 'white',
      gap: '24px'
    }}>
      <div style={{
        fontSize: '52px',
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.1,
        textShadow: '0 0 20px rgba(255,80,80,0.35)'
      }}>
        oops you hit a astroid
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: '18px 46px',
          fontSize: '24px',
          fontWeight: 'bold',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(221, 36, 118, 0.4)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(221, 36, 118, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(221, 36, 118, 0.4)';
        }}
      >
        try again
      </button>
    </div>
  );
  return portalTarget ? createPortal(content, portalTarget) : content;
}

export function FlightScene({ onLand }: { onLand: () => void }) {
  const [status, setStatus] = useState<'flying' | 'crashed' | 'landed'>('flying');
  const [runId, setRunId] = useState(0);

  const handleCrash = () => {
    setStatus('crashed');
  };

  const handleLand = () => {
    setStatus('landed');
  };

  const handleRetry = () => {
    setRunId((prev) => prev + 1);
    setStatus('flying');
  };

  const handleLandConfirm = () => {
    onLand();
    setRunId((prev) => prev + 1);
    setStatus('flying');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 1.6, 2], fov: 70 }}>
        <FlightStage
          key={runId}
          paused={status !== 'flying'}
          onCrash={handleCrash}
          onLand={handleLand}
        />
      </Canvas>

      {status === 'landed' && <LandingPopup onLand={handleLandConfirm} />}
      {status === 'crashed' && <CrashPopup onRetry={handleRetry} />}
    </div>
  );
}
