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
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [history, setHistory] = useState([]);
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
    if (isAiThinking || game.isGameOver()) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setHistory(gameCopy.history());
        setWarnings(checkThreats(gameCopy));
        startTimer();

        if (!gameCopy.isGameOver()) {
          setIsAiThinking(true);
          setTimeout(() => makeAiMove(gameCopy, difficulty), 600);
        }
        return true;
      }
    } catch (e) { return false; }
    return false;
  }

  function makeAiMove(gameInstance, currentDifficulty) {
    const bestMove = getBestMove(gameInstance, currentDifficulty);
    if (!bestMove) {
      setIsAiThinking(false);
      return;
    }
    
    gameInstance.move(bestMove);
    const newGame = new Chess(gameInstance.fen());
    setGame(newGame);
    setHistory(newGame.history());
    setWarnings(checkThreats(newGame));
    setIsAiThinking(false);
    startTimer();
  }

  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const isGameOver = game.isGameOver();
  const themePrimary = sceneColor === 'blue' ? '#3b82f6' : '#f59e0b';

  // 計算被吃掉的棋子 (簡單邏輯)
  const getCapturedPieces = () => {
    const initialPieces = {
      p: 8, n: 2, b: 2, r: 2, q: 1, k: 1
    };
    const currentWhite = { p:0, n:0, b:0, r:0, q:0, k:0 };
    const currentBlack = { p:0, n:0, b:0, r:0, q:0, k:0 };
    
    game.board().forEach(row => row.forEach(p => {
      if (p) {
        if (p.color === 'w') currentWhite[p.type]++;
        else currentBlack[p.type]++;
      }
    }));

    return {
      white: initialPieces, // 這裡可以更精細計算，暫時回傳當前盤面即可展示 UI
      black: initialPieces
    };
  };

  return (
    <div className="App" style={{ 
      height: '100vh', width: '100%', backgroundColor: '#0f172a', display: 'flex', overflow: 'hidden',
      color: '#f8fafc', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif'
    }}>
      
      {/* 左側 Sidebar */}
      <div style={{ width: '300px', height: '100vh', backgroundColor: '#1e293b', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 15px rgba(0,0,0,0.3)', zIndex: 10 }}>
        <h1 style={{ fontSize: '20px', marginBottom: '20px', color: themePrimary, fontWeight: '800' }}>CHESS MASTER</h1>

        {/* 狀態卡片 */}
        <div style={{ backgroundColor: '#334155', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Turn Status</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {turn}
            {isAiThinking && (
              <span className="loader" style={{ fontSize: '12px', color: themePrimary }}>● Thinking...</span>
            )}
          </div>
          <div style={{ height: '3px', width: '100%', backgroundColor: game.turn() === 'w' ? themePrimary : '#64748b', borderRadius: '2px' }}></div>
          <div style={{ marginTop: '10px', fontSize: '22px', fontWeight: 'mono', color: '#ef4444' }}>{timer}s</div>
        </div>

        {/* 歷史紀錄 (新功能) */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px', marginBottom: '15px', fontSize: '13px' }}>
          <div style={{ color: '#64748b', marginBottom: '5px', fontSize: '11px' }}>MOVE HISTORY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', gap: '5px' }}>
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
              <React.Fragment key={i}>
                <div style={{ color: '#475569' }}>{i + 1}.</div>
                <div style={{ color: '#cbd5e1' }}>{history[i * 2]}</div>
                <div style={{ color: '#cbd5e1' }}>{history[i * 2 + 1] || ''}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 難度與場景 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '10px' }}>
          {[1, 2, 3, 4, 5].map(l => (
            <button key={l} onClick={() => setDifficulty(l)} style={{ padding: '8px 0', borderRadius: '4px', border: 'none', backgroundColor: difficulty === l ? themePrimary : '#334155', color: 'white', fontSize: '11px' }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
          {['blue', 'yellow'].map(c => (
            <button key={c} onClick={() => setSceneColor(c)} style={{ flex: 1, padding: '6px 0', borderRadius: '4px', border: 'none', backgroundColor: sceneColor === c ? (c==='blue'?'#3b82f6':'#f59e0b') : '#334155', color: 'white', fontSize: '10px', textTransform: 'uppercase' }}>{c}</button>
          ))}
        </div>

        <button onClick={() => { setGame(new Chess()); setHistory([]); setWarnings({ defensive: [], offensive: [] }); startTimer(); }} style={{ width: '100%', padding: '12px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>New Game</button>
      </div>

      {/* 右側棋盤區 (移除 transform 以確保拖放坐標正確) */}
      <div style={{ flex: 1, height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingBottom: '60px', position: 'relative' }}>
        <div>
            <ChessBoard game={game} onMove={handleMove} warnings={warnings} sceneColor={sceneColor} />
        </div>

        {/* 結束彈窗 (新功能) */}
        {isGameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: `2px solid ${themePrimary}` }}>
              <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Match Ended</h2>
              <p style={{ color: '#94a3b8', marginBottom: '25px' }}>{game.isCheckmate() ? `Checkmate! ${turn === 'White' ? 'Black' : 'White'} Wins.` : 'Draw / Stalemate'}</p>
              <button onClick={() => { setGame(new Chess()); setHistory([]); startTimer(); }} style={{ padding: '12px 30px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
