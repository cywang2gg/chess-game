import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import { checkThreats, getBestMove, getLiveEval } from './logic/chessEngine';

const AI_NAMES = [
  "Lord Voldemort", "Severus Snape", "Bellatrix Lestrange", 
  "Draco Malfoy", "Lucius Malfoy", "Dolores Umbridge", 
  "Peter Pettigrew", "Tom Riddle", "Gellert Grindelwald", "Barty Crouch Jr."
];

function App() {
  const [game, setGame] = useState(new Chess());
  const [warnings, setWarnings] = useState({ defensive: [], offensive: [] });
  const [difficulty, setDifficulty] = useState(2);
  const [sceneColor, setSceneColor] = useState('blue');
  const [timer, setTimer] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [history, setHistory] = useState([]);
  const [evalScore, setEvalScore] = useState("0.0");
  
  const [playerName, setPlayerName] = useState("");
  const [aiName, setAiName] = useState("");
  const [showNameModal, setShowNameModal] = useState(true);
  const [tempName, setTempName] = useState("");

  const timerRef = useRef(null);

  useEffect(() => {
    initNewGame(true);
    return () => stopTimer();
  }, []);

  function initNewGame(askName = false) {
    setGame(new Chess());
    setHistory([]);
    setWarnings({ defensive: [], offensive: [] });
    setAiName(AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]);
    if (askName) {
      setShowNameModal(true);
    } else {
      startTimer();
    }
  }

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

  function handleNameSubmit(e) {
    e.preventDefault();
    if (tempName.trim()) {
      setPlayerName(tempName);
      setShowNameModal(false);
      startTimer();
    }
  }

  function handleMove(move) {
    if (isAiThinking || game.isGameOver() || showNameModal) return false;

    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setHistory(prev => [...prev, result.san]);
        setWarnings(checkThreats(gameCopy));
        setEvalScore(getLiveEval(gameCopy));
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
    
    const moveResult = gameInstance.move(bestMove);
    const newGame = new Chess(gameInstance.fen());
    setGame(newGame);
    setHistory(prev => [...prev, moveResult.san]);
    setWarnings(checkThreats(newGame));
    setEvalScore(getLiveEval(newGame));
    setIsAiThinking(false);
    startTimer();
  }

  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const isGameOver = game.isGameOver();
  const themePrimary = sceneColor === 'blue' ? '#3b82f6' : '#f59e0b';

  return (
    <div className="App" style={{ 
      height: '100%', width: '100%', backgroundColor: '#0f172a', display: 'flex', overflow: 'hidden',
      color: '#f8fafc', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif'
    }}>
      
      {showNameModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <form onSubmit={handleNameSubmit} style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '400px', border: `2px solid ${themePrimary}` }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: themePrimary }}>Enter Your Name</h2>
            <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your name..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', fontSize: '16px', marginBottom: '20px', outline: 'none' }} />
            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Start Game</button>
          </form>
        </div>
      )}

      <div style={{ width: '300px', height: '100%', backgroundColor: '#1e293b', padding: '15px 20px', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 15px rgba(0,0,0,0.3)', zIndex: 10, boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '18px', marginBottom: '15px', color: themePrimary, fontWeight: '800' }}>CHESS MASTER</h1>

        <div style={{ backgroundColor: '#334155', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>Current Match</span>
            <span style={{ color: parseFloat(evalScore) >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
              {parseFloat(evalScore) > 0 ? `+${evalScore}` : evalScore}
            </span>
          </div>

          {/* Evaluation Bar */}
          <div style={{ height: '6px', width: '100%', backgroundColor: '#0f172a', borderRadius: '3px', margin: '8px 0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ 
              position: 'absolute', height: '100%', width: '50%', 
              left: '50%', transformOrigin: 'left',
              transform: `scaleX(${Math.max(-1, Math.min(1, parseFloat(evalScore) / 8))})`,
              transition: 'transform 0.5s ease',
              backgroundColor: parseFloat(evalScore) >= 0 ? '#10b981' : '#ef4444'
            }}></div>
          </div>

          <div style={{ margin: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: game.turn() === 'w' ? '#fff' : '#64748b', fontWeight: game.turn() === 'w' ? 'bold' : 'normal' }}>⚪ {playerName || "Player"}</span>
              {game.turn() === 'w' && <span style={{ color: themePrimary }}>●</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: game.turn() === 'b' ? '#fff' : '#64748b', fontWeight: game.turn() === 'b' ? 'bold' : 'normal' }}>⚫ {aiName || "AI"}</span>
              {game.turn() === 'b' && <span style={{ color: themePrimary }}>●</span>}
            </div>
          </div>
          <div style={{ height: '3px', width: '100%', backgroundColor: '#475569', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', width: '50%', height: '100%', backgroundColor: themePrimary, left: game.turn() === 'w' ? 0 : '50%', transition: 'left 0.3s ease' }}></div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: '10px', color: '#94a3b8' }}>{isAiThinking ? "THINKING..." : "YOUR TURN"}</span>
             <span style={{ fontSize: '20px', fontWeight: 'mono', color: '#ef4444' }}>{timer}s</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px' }}>
          <div style={{ color: '#64748b', marginBottom: '5px', fontSize: '10px' }}>MOVE HISTORY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '25px 1fr 1fr', gap: '4px' }}>
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
              <React.Fragment key={i}>
                <div style={{ color: '#475569' }}>{i + 1}.</div>
                <div style={{ color: '#cbd5e1' }}>{history[i * 2]}</div>
                <div style={{ color: '#cbd5e1' }}>{history[i * 2 + 1] || ''}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {[1, 1.5, 2, 3, 4, 5, 'hope', 'desperate'].map(l => (
            <button key={l} onClick={() => setDifficulty(l)} style={{ 
              padding: '6px 0', borderRadius: '4px', border: 'none', 
              backgroundColor: difficulty === l ? themePrimary : '#334155', 
              color: 'white', fontSize: '9px',
              gridColumn: (l === 'hope' || l === 'desperate') ? 'span 2' : 'auto',
              fontWeight: (l === 'hope' || l === 'desperate') ? 'bold' : 'normal'
            }}>
              {l === 'hope' ? 'ALWAYS HOPE' : (l === 'desperate' ? 'DESPERATE' : l)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
          {['blue', 'yellow'].map(c => (
            <button key={c} onClick={() => setSceneColor(c)} style={{ flex: 1, padding: '5px 0', borderRadius: '4px', border: 'none', backgroundColor: sceneColor === c ? (c==='blue'?'#3b82f6':'#f59e0b') : '#334155', color: 'white', fontSize: '9px', textTransform: 'uppercase' }}>{c}</button>
          ))}
        </div>

        <button onClick={() => initNewGame(true)} style={{ width: '100%', padding: '10px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>New Game</button>
      </div>

      <div style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', paddingBottom: '40px', position: 'relative' }}>
        <div>
            <ChessBoard game={game} onMove={handleMove} warnings={warnings} sceneColor={sceneColor} />
        </div>

        {isGameOver && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: `2px solid ${themePrimary}` }}>
              <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Match Ended</h2>
              <p style={{ color: '#94a3b8', marginBottom: '25px' }}>{game.isCheckmate() ? `Checkmate! ${game.turn() === 'w' ? aiName : playerName} Wins.` : 'Draw / Stalemate'}</p>
              <button onClick={() => initNewGame(true)} style={{ padding: '12px 30px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
