import { useEffect, useState } from 'react';
import { Scene } from './components/Scene'
import { DecartStream } from './components/DecartStream'
import { Overlay } from './components/Overlay'
import { WinPopup } from './components/WinPopup'
import { FlightScene } from './components/FlightScene'
import { useGameLogic } from './logic/GameLogic'
import { useStore } from './store'
import './App.css'
import { soundSynthesizer } from './utils/SoundSynthesizer';

function StartScreen({ onStart }: { onStart: (mode: 'local' | 'decart') => void }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      color: 'white',
      gap: '20px'
    }}>
      <img
        src="/dream.png"
        alt="DreamStack Logo"
        style={{
          width: '270px',
          height: '180px',
          objectFit: 'cover',
        }}
      />
      <h1 style={{ fontSize: 64, marginTop: -20 }}>DreamStack</h1>
      <div style={{ fontSize: 18, marginTop: -40, width: '33%', textAlign: 'center' }}>
        How to play: arrow keys to move, space to pick up / drop off blocks, keyboard to chat, enter to send message. Include "world" in your message to change the world, include "make" in your message to create new blocks. Set up your own API keys!
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: 20 }}>
        <button
          onClick={() => { soundSynthesizer.playPickupSound(); onStart('decart') }}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: '#3e71ff',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Start Game
        </button>
        <button
          onClick={() => { soundSynthesizer.playPickupSound(); onStart('local') }}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            cursor: 'pointer',
            background: '#505050',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Debug Mode
        </button>
      </div>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#4a4a4aff', marginTop: 40, width: '33%', textAlign: 'center' }}>
        SUPERCELL HACKATHON 2026
      </div>
    </div>
  );
}

function App() {
  // Initialize Game Logic (listeners etc)
  useGameLogic();

  const [mode, setMode] = useState<'menu' | 'local' | 'decart'>('menu');
  const [phase, setPhase] = useState<'build' | 'flight'>('build');
  const hasWon = useStore(state => state.hasWon);
  const resetRound = useStore(state => state.resetRound);
  const setWorldDescription = useStore(state => state.setWorldDescription);
  const [showWinPopup, setShowWinPopup] = useState(false);

  const createRandomWorldDescription = () => {
    const settings = [
      "world of Amazon shipping center",
      "world of surreal dreamscape",
      "world of square candies",
      "world of cosmos galaxy",
      "world of Minecraft",
    ];
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    const setting = pick(settings);
    return `A ${setting}. Keep the background stable. Render high quality video game graphics in the Studio Ghibli animation art style.`;
  };

  const handleStart = (nextMode: 'local' | 'decart') => {
    setPhase('build');
    setMode(nextMode);
  };

  const handleLaunch = () => {
    setPhase('flight');
  };

  const handleLand = () => {
    setWorldDescription(createRandomWorldDescription());
    resetRound();
    setPhase('build');
  };

  useEffect(() => {
    if (!hasWon || phase !== 'build') {
      setShowWinPopup(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowWinPopup(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [hasWon, phase]);

  return (
    <div className="App" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {mode === 'menu' && <StartScreen onStart={handleStart} />}

      {/* 
         Structure varies by mode:
         - Local: Full screen Scene
         - Decart: DecartStream (Main) + Small Scene (Debug)
      */}

      {/* Full Screen Scene Container (Used in Local Mode) */}
      {mode === 'local' && phase === 'build' && (
        <div style={{ flex: 1, position: 'relative' }}>
          <Scene />
          <div className="vignette" />
        </div>
      )}

      {mode === 'local' && phase === 'flight' && (
        <div style={{ flex: 1, position: 'relative' }}>
          <FlightScene onLand={handleLand} />
          <div className="vignette" />
        </div>
      )}

      {/* Decart Mode Structure */}
      {mode === 'decart' && phase === 'build' && (
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <DecartStream />
          <div className="vignette" />

          {/* Raw Debug View (Small) */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: '320px',
            height: '240px',
            border: '2px solid #555',
            background: '#000',
            zIndex: 10 // On top of video
          }}>
            <Scene />
          </div>
        </div>
      )}

      {mode === 'decart' && phase === 'flight' && (
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <DecartStream />
          <div className="vignette" />

          {/* Raw Debug View (Small) */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: '320px',
            height: '240px',
            border: '2px solid #555',
            background: '#000',
            zIndex: 10
          }}>
            <FlightScene onLand={handleLand} />
          </div>
        </div>
      )}

      {/* Overlay is always present (Chat, etc), but maybe hidden in menu? Let's keep it visible or hide? 
          Hide in menu for clean look.
      */}
      {mode !== 'menu' && phase === 'build' && <Overlay />}

      {/* Win Popup */}
      {showWinPopup && mode !== 'menu' && phase === 'build' && <WinPopup onLaunch={handleLaunch} />}

    </div>
  )
}

export default App
