import { useState } from 'react';
import { useStore } from '../store';

export function Overlay() {
  const messages = useStore(state => state.messages);
  const currentPlayerId = useStore(state => state.currentPlayerId);
  const addMessage = useStore(state => state.addMessage);

  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim() || !currentPlayerId) return;
    addMessage(currentPlayerId, inputValue);
    setInputValue("");
  };

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
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            background: '#333',
            padding: '8px',
            borderRadius: '8px',
            alignSelf: msg.playerId === currentPlayerId ? 'flex-end' : 'flex-start',
            maxWidth: '90%'
          }}>
            <div style={{ fontSize: '0.8em', color: '#aaa', marginBottom: '2px' }}>{msg.playerId}</div>
            <div style={{ color: '#ddd' }}>{msg.text}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px', borderTop: '1px solid #444' }}>
        <input
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
