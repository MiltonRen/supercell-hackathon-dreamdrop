import { useStore } from '../store';

interface WinPopupProps {
  onBackToHome: () => void;
}

export function WinPopup({ onBackToHome }: WinPopupProps) {
  const resetGame = useStore(state => state.resetGame);

  const handleBackToHome = () => {
    resetGame();
    onBackToHome();
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
      gap: '30px',
      animation: 'fadeIn 0.5s ease-in-out'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes celebrate {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}
      </style>

      <div style={{
        fontSize: '72px',
        fontWeight: 'bold',
        background: 'linear-gradient(45deg, #FFD700, #FFA500, #FFD700)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'celebrate 1s ease-in-out infinite',
        textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
      }}>
        🎉 You Win! 🎉
      </div>

      <div style={{
        fontSize: '24px',
        color: '#ccc',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        Congratulations! You've successfully stacked blocks to reach the goal height!
      </div>

      <button
        onClick={handleBackToHome}
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
        Back to Home
      </button>
    </div>
  );
}
