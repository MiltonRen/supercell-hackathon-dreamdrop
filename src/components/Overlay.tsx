import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';

export function Overlay() {
  const messages = useStore(state => state.messages);
  const currentPlayerId = useStore(state => state.currentPlayerId);
  const addMessage = useStore(state => state.addMessage);
  const worldDescription = useStore(state => state.worldDescription);
  const isDreaming = useStore(state => state.isDreaming);

  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!inputValue.trim() || !currentPlayerId) return;
    addMessage(currentPlayerId, inputValue);
    setInputValue("");
    inputRef.current?.blur();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If already focused, do nothing (let default input behavior happen)
      if (document.activeElement === inputRef.current) return;

      // Ignore special keys used for game control
      // Arrow keys are length > 1.
      // Space is ' ' or 'Space'
      // Brackets used for player switch? '[' and ']'
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return; // Ignore F1, Enter, ArrowUp, etc.
      if (e.key === ' ') return; // Space is interaction
      if (e.key === '[' || e.key === ']') return; // Player switching

      // It is a letter/number/symbol
      inputRef.current?.focus();
      setInputValue(prev => prev + e.key);
      e.preventDefault();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '300px',
      background: '#202020',
      borderLeft: '1px solid #444',
      pointerEvents: 'auto'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #444' }}>
        <h3 style={{ margin: 0, color: '#fff' }}>DreamDrop</h3>
        <small style={{ color: '#888' }}>Playing as: {currentPlayerId}</small>

        <style>
          {`
            @keyframes breathe {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
          `}
        </style>
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid #444',
          fontSize: '0.9em',
          color: '#cae4ff',
          fontStyle: 'italic',
          lineHeight: '1.4',
          transition: 'all 0.3s ease',
          animation: isDreaming ? 'breathe 2s infinite ease-in-out' : 'none',
          opacity: isDreaming ? 0.7 : 1
        }}>
          {worldDescription}
        </div>
        {isDreaming && (
          <div style={{
            fontSize: '0.7em',
            color: '#888',
            textAlign: 'center',
            marginTop: '5px',
            letterSpacing: '2px',
            animation: 'breathe 1.5s infinite ease-in-out'
          }}>
            DREAMING...
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            background: msg.playerId === currentPlayerId ? '#1d9dffff' : '#e9e9e9ff',
            padding: '8px',
            borderRadius: '8px',
            alignSelf: msg.playerId === currentPlayerId ? 'flex-end' : 'flex-start',
            maxWidth: '90%'
          }}>
            {msg.playerId !== currentPlayerId && (
              <div style={{ fontSize: '0.8em', color: '#656565ff', marginBottom: '2px', textAlign: 'left' }}>{msg.playerId}</div>
            )}
            <div style={{ color: msg.playerId === currentPlayerId ? '#ffffffff' : '#131313ff', textAlign: msg.playerId === currentPlayerId ? 'right' : 'left' }}>{msg.text}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px', borderTop: '1px solid #444' }}>
        <input
          ref={inputRef}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #555',
            background: '#111',
            color: 'white'
          }}
          placeholder={currentPlayerId ? "Type a message..." : "Select a player..."}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!currentPlayerId}
        />
        <div style={{ fontSize: '0.7em', color: '#666', marginTop: '5px' }}>
          Try: "make a red box" or "world is underwater"
        </div>
      </div>
    </div>
  );
}
