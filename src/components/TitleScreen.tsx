import { useGameStore } from '../stores/gameStore';

export function TitleScreen() {
  const started = useGameStore((s) => s.started);
  const startGame = useGameStore((s) => s.startGame);

  if (started) return null;

  return (
    <div
      onClick={startGame}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #1a0000 0%, #000 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        cursor: 'pointer',
      }}
    >
      <h1
        style={{
          color: '#ff4400',
          fontSize: '72px',
          textShadow: '0 0 30px #ff2200, 0 0 60px #ff0000',
          letterSpacing: '8px',
          marginBottom: '10px',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        KAIJU
      </h1>
      <h2
        style={{
          color: '#ff8866',
          fontSize: '24px',
          letterSpacing: '4px',
          marginBottom: '40px',
          fontWeight: 'normal',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        MAASTRICHT
      </h2>
      <p
        style={{
          color: '#fff',
          fontSize: '20px',
          animation: 'pulse 1.5s infinite',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        CLICK TO UNLEASH DESTRUCTION
      </p>
    </div>
  );
}
