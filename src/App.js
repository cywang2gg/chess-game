import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import { checkThreats, getBestMove } from './logic/chessEngine';

function App() {
  const [game, setGame] = useState(new Chess());
  const [warnings, setWarnings] = useState({ defensive: [], offensive: [] });
  const [difficulty, setDifficulty] = useState(2);
  const [sceneColor, setSceneColor] = useState('blue');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  function startTimer() {
    stopTimer();
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleMove(move) {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setWarnings(checkThreats(gameCopy));
        startTimer();
        if (!gameCopy.isGameOver()) {
          setTimeout(() => makeAiMove(gameCopy, difficulty), 500);
        }
        return true;
      }
    } catch (e) { return false; }
    return false;
  }

  function makeAiMove(gameInstance, currentDifficulty) {
    const bestMove = getBestMove(gameInstance, currentDifficulty);
    if (!bestMove) return;
    gameInstance.move(bestMove);
    const newGame = new Chess(gameInstance.fen());
    setGame(newGame);
    setWarnings(checkThreats(newGame));
    startTimer();
  }

  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const isGameOver = game.isGameOver();
  const themePrimary = sceneColor === 'blue' ? '#3b82f6' : '#f59e0b';

  return (
    <div className="App" style={{ 
      height: '100vh', 
      width: '100%', 
      backgroundColor: '#0f172a', 
      display: 'flex', 
      overflow: 'hidden',
      color: '#f8fafc',
      boxSizing: 'border-box',
      margin: 0,
      padding: 0,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* 左側資訊欄 (Sidebar) */}
      <div style={{ 
        width: '300px', 
        height: '100vh', 
        backgroundColor: '#1e293b', 
        padding: '25px', 
        display: 'flex', 
        flexDirection: 'column', 
        boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        <h1 style={{ fontSize: '20px', marginBottom: '25px', color: themePrimary, fontWeight: '800', letterSpacing: '1px' }}>CHESS MASTER</h1>

        {/* 回合與計時 */}
        <div style={{ backgroundColor: '#334155', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Turn</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '6px 0', color: game.turn() === 'w' ? '#fff' : '#94a3b8' }}>
            {isGameOver ? 'Game Over' : turn}
          </div>
          <div style={{ height: '3px', width: '100%', backgroundColor: game.turn() === 'w' ? themePrimary : '#64748b', borderRadius: '2px' }}></div>
          
          <div style={{ marginTop: '15px' }}>
             <div style={{ fontSize: '11px', color: '#94a3b8' }}>Turn Timer</div>
             <div style={{ fontSize: '26px', fontWeight: 'mono', color: '#ef4444' }}>{timer}s</div>
          </div>
        </div>

        {/* 難度選擇 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>AI Difficulty</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                style={{
                  padding: '10px 0',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: difficulty === level ? themePrimary : '#334155',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '11px'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* 場景顏色 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Scene Color</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['blue', 'yellow'].map((color) => (
              <button
                key={color}
                onClick={() => setSceneColor(color)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: sceneColor === color ? (color === 'blue' ? '#3b82f6' : '#f59e0b') : '#334155',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  textTransform: 'uppercase'
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按鈕 (移除 marginTop: auto, 直接放置或使用 flex-grow) */}
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => { setGame(new Chess()); setWarnings({ defensive: [], offensive: [] }); startTimer(); }}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: themePrimary, 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: `0 4px 10px ${themePrimary}33`
            }}
          >
            New Game
          </button>
        </div>
      </div>

      {/* 右側棋盤區 (優化位置與居中) */}
      <div style={{ 
        flex: 1, 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{ transform: 'translateY(-20px)' }}> {/* 將整個棋盤組件往上移一點 */}
            <ChessBoard game={game} onMove={handleMove} warnings={warnings} sceneColor={sceneColor} />
        </div>
      </div>
    </div>
  );
}

export default App;
