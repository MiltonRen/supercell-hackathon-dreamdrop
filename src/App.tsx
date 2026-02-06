import { useState } from 'react';
import { Scene } from './components/Scene'
import { DecartStream } from './components/DecartStream'
import { Overlay } from './components/Overlay'
import { useGameLogic } from './logic/GameLogic'
import './App.css'

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
      <h1>Welcome to DreamDrop</h1>
      <p>Choose your experience:</p>
      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          onClick={() => onStart('decart')}
          style={{
            padding: '20px 40px',
            fontSize: '18px',
            cursor: 'pointer',
            background: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Start with Decart AI
        </button>
        <button
          onClick={() => onStart('local')}
          style={{
            padding: '20px 40px',
            fontSize: '18px',
            cursor: 'pointer',
            background: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          Start Local (No AI)
        </button>
      </div>
    </div>
  );
}

function App() {
  // Initialize Game Logic (listeners etc)
  useGameLogic();

  const [mode, setMode] = useState<'menu' | 'local' | 'decart'>('menu');

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
        </div>
      )}

      {/* Decart Mode Structure */}
      {mode === 'decart' && (
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <DecartStream />

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
            <div style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', padding: '2px' }}>RAW VIEW</div>
          </div>
        </div>
      )}

      {/* Overlay is always present (Chat, etc), but maybe hidden in menu? Let's keep it visible or hide? 
          Hide in menu for clean look.
      */}
      {mode !== 'menu' && <Overlay />}

    </div>
  )
}

export default App
