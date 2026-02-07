import { soundSynthesizer } from '../utils/SoundSynthesizer';

interface WinPopupProps {
  onLaunch: () => void;
}

export function WinPopup({ onLaunch }: WinPopupProps) {
  const handleLaunch = () => {
    soundSynthesizer.playPickupSound();
    onLaunch();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      color: 'white',
      gap: '30px'
    }}>
      <div style={{
        fontSize: '56px',
        fontWeight: 'bold',
        background: 'linear-gradient(45deg, #FFD700, #FFA500, #FFD700)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
        textAlign: 'center',
        lineHeight: 1.1
      }}>
        You built a rocket ship!
      </div>

      <div style={{
        fontSize: '24px',
        color: '#ccc',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        Ready to launch into the next world?
      </div>

      <button
        onClick={handleLaunch}
        style={{
          padding: '20px 50px',
          fontSize: '28px',
          fontWeight: 'bold',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease',
          marginTop: '20px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
        }}
      >
        launch
      </button>
    </div>
  );
}
