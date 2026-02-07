import { useState } from 'react';
import { Scene } from './components/Scene'
import { DecartStream } from './components/DecartStream'
import { Overlay } from './components/Overlay'
import { WinPopup } from './components/WinPopup'
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
  const hasWon = useStore(state => state.hasWon);

  return (
    <div className="App" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {mode === 'menu' && <StartScreen onStart={setMode} />}

      {/* 
         Structure varies by mode:
         - Local: Full screen Scene
         - Decart: DecartStream (Main) + Small Scene (Debug)
      */}

      {/* Full Screen Scene Container (Used in Local Mode) */}
      {mode === 'local' && (
        <div style={{ flex: 1, position: 'relative' }}>
          <Scene />
          <div className="vignette" />
        </div>
      )}

      {/* Decart Mode Structure */}
      {mode === 'decart' && (
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

      {/* Overlay is always present (Chat, etc), but maybe hidden in menu? Let's keep it visible or hide? 
          Hide in menu for clean look.
      */}
      {mode !== 'menu' && <Overlay />}

      {/* Win Popup */}
      {hasWon && mode !== 'menu' && <WinPopup onBackToHome={() => setMode('menu')} />}

    </div>
  )
}

export default App
