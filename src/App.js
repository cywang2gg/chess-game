import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import { checkThreats, getBestMove, getLiveEval, getTopMoves, SUGGESTION_COLORS } from './logic/chessEngine';

const AI_NAMES = [
  "Lord Voldemort", "Severus Snape", "Bellatrix Lestrange", 
  "Draco Malfoy", "Lucius Malfoy", "Dolores Umbridge", 
  "Peter Pettigrew", "Tom Riddle", "Gellert Grindelwald", "Barty Crouch Jr."
];

// iPad 偵測
const isIPad = () => {
  return /iPad|Macintosh|Silk/i.test(navigator.userAgent) && 'ontouchend' in document;
};

// 取得裝置類型
const getDeviceType = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const iPad = isIPad();
  
  return {
    isIPad: iPad,
    isLandscape,
    isMobile: width < 768,
    isTablet: iPad || (width >= 768 && width <= 1024),
    screenWidth: width,
    screenHeight: height
  };
};

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
  const [showGuide, setShowGuide] = useState(true);  // 預設開啟建議
  const [deviceType, setDeviceType] = useState(getDeviceType());

  const timerRef = useRef(null);
  
  // 監聽裝置方向變化
  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  
  // 計算建議棋路 (只在玩家回合且有開啟時)
  const suggestions = useMemo(() => {
    if (!showGuide || isAiThinking || game.isGameOver() || game.turn() !== 'w') return [];
    return getTopMoves(new Chess(game.fen()), 2);
  }, [game.fen(), showGuide, isAiThinking]);

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
  
  // iPad 響應式樣式
  const isTablet = deviceType.isTablet;
  const isLandscape = deviceType.isLandscape;
  const sidebarWidth = isTablet ? (isLandscape ? '320px' : '100%') : '300px';
  const sidebarStyle = {
    width: sidebarWidth,
    height: isTablet && !isLandscape ? 'auto' : '100%',
    backgroundColor: '#1e293b',
    padding: isTablet ? '20px' : '15px 20px',
    display: 'flex',
    flexDirection: isTablet && !isLandscape ? 'row' : 'column',
    boxShadow: '4px 0 15px rgba(0,0,0,0.3)',
    zIndex: 10,
    boxSizing: 'border-box',
    gap: isTablet && !isLandscape ? '20px' : '0',
    overflow: isTablet && !isLandscape ? 'auto' : 'visible'
  };

  return (
    <div className="App" style={{ 
      height: '100%', width: '100%', backgroundColor: '#0f172a', 
      display: 'flex', 
      flexDirection: isTablet && !isLandscape ? 'column' : 'row',
      overflow: isTablet && !isLandscape ? 'auto' : 'hidden',
      color: '#f8fafc', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif'
    }}>
      
      {showNameModal && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <form onSubmit={handleNameSubmit} style={{ backgroundColor: '#1e293b', padding: isTablet ? '50px' : '40px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: isTablet ? '500px' : '400px', border: `2px solid ${themePrimary}` }}>
            <h2 style={{ fontSize: isTablet ? '32px' : '24px', marginBottom: '20px', color: themePrimary }}>Enter Your Name</h2>
            <input autoFocus type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Your name..." style={{ width: '100%', padding: isTablet ? '16px' : '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', fontSize: isTablet ? '20px' : '16px', marginBottom: '20px', outline: 'none' }} />
            <button type="submit" style={{ width: '100%', padding: isTablet ? '16px' : '12px', backgroundColor: themePrimary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: isTablet ? '20px' : '14px', cursor: 'pointer' }}>Start Game</button>
          </form>
        </div>
      )}

      <div style={sidebarStyle}>
        <h1 style={{ fontSize: isTablet ? '24px' : '18px', marginBottom: '15px', color: themePrimary, fontWeight: '800' }}>CHESS MASTER</h1>

        <div style={{ backgroundColor: '#334155', padding: isTablet ? '16px' : '12px', borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: isTablet ? '14px' : '10px', color: '#94a3b8', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
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
              <span style={{ fontSize: isTablet ? '18px' : '14px', color: game.turn() === 'w' ? '#fff' : '#64748b', fontWeight: game.turn() === 'w' ? 'bold' : 'normal' }}>⚪ {playerName || "Player"}</span>
              {game.turn() === 'w' && <span style={{ color: themePrimary, fontSize: isTablet ? '20px' : '14px' }}>●</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: isTablet ? '18px' : '14px', color: game.turn() === 'b' ? '#fff' : '#64748b', fontWeight: game.turn() === 'b' ? 'bold' : 'normal' }}>⚫ {aiName || "AI"}</span>
              {game.turn() === 'b' && <span style={{ color: themePrimary, fontSize: isTablet ? '20px' : '14px' }}>●</span>}
            </div>
          </div>
          <div style={{ height: '3px', width: '100%', backgroundColor: '#475569', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', width: '50%', height: '100%', backgroundColor: themePrimary, left: game.turn() === 'w' ? 0 : '50%', transition: 'left 0.3s ease' }}></div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: isTablet ? '14px' : '10px', color: '#94a3b8' }}>{isAiThinking ? "THINKING..." : "YOUR TURN"}</span>
             <span style={{ fontSize: isTablet ? '28px' : '20px', fontWeight: 'mono', color: '#ef4444' }}>{timer}s</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: isTablet ? '16px' : '12px' }}>
          <div style={{ color: '#64748b', marginBottom: '5px', fontSize: isTablet ? '14px' : '10px' }}>MOVE HISTORY</div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isTablet ? '8px' : '4px', marginBottom: '8px' }}>
          {[1, 1.5, 2, 3, 4, 5, 'hope', 'desperate'].map(l => (
            <button key={l} onClick={() => setDifficulty(l)} style={{ 
              padding: isTablet ? '12px 0' : '6px 0', borderRadius: '6px', border: 'none', 
              backgroundColor: difficulty === l ? themePrimary : '#334155', 
              color: 'white', fontSize: isTablet ? '12px' : '9px',
              gridColumn: (l === 'hope' || l === 'desperate') ? 'span 2' : 'auto',
              fontWeight: (l === 'hope' || l === 'desperate') ? 'bold' : 'normal',
              minHeight: isTablet ? '44px' : 'auto'
            }}>
              {l === 'hope' ? 'ALWAYS HOPE' : (l === 'desperate' ? 'DESPERATE' : l)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '12px' }}>
          {['blue', 'yellow'].map(c => (
            <button key={c} onClick={() => setSceneColor(c)} style={{ 
              flex: 1, 
              padding: isTablet ? '12px 0' : '5px 0', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: sceneColor === c ? (c==='blue'?'#3b82f6':'#f59e0b') : '#334155', 
              color: 'white', 
              fontSize: isTablet ? '14px' : '9px', 
              textTransform: 'uppercase',
              minHeight: isTablet ? '44px' : 'auto'
            }}>{c}</button>
          ))}
        </div>

        <button onClick={() => initNewGame(true)} style={{ 
          width: '100%', 
          padding: isTablet ? '16px' : '10px', 
          backgroundColor: themePrimary, 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontWeight: 'bold', 
          fontSize: isTablet ? '18px' : '14px', 
          flexShrink: 0,
          minHeight: isTablet ? '56px' : 'auto'
        }}>New Game</button>
        
        {/* 建議開關 */}
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isTablet ? '12px 14px' : '8px 10px', backgroundColor: '#334155', borderRadius: '8px' }}>
          <span style={{ fontSize: isTablet ? '16px' : '11px', color: '#94a3b8' }}>🎯 棋路建議</span>
          <button onClick={() => setShowGuide(!showGuide)} style={{ 
            width: isTablet ? '60px' : '44px', 
            height: isTablet ? '32px' : '22px', 
            borderRadius: isTablet ? '16px' : '11px', 
            border: 'none', 
            backgroundColor: showGuide ? '#22c55e' : '#475569', 
            cursor: 'pointer',
            position: 'relative', 
            transition: 'background-color 0.2s'
          }}>
            <div style={{ 
              width: isTablet ? '26px' : '18px', 
              height: isTablet ? '26px' : '18px', 
              borderRadius: '50%', 
              backgroundColor: 'white',
              position: 'absolute', 
              top: isTablet ? '3px' : '2px', 
              transition: 'left 0.2s',
              left: showGuide ? (isTablet ? '31px' : '24px') : (isTablet ? '3px' : '2px')
            }}></div>
          </button>
        </div>
        
        {/* 建議列表 */}
        {showGuide && suggestions.length > 0 && (
          <div style={{ marginTop: '8px', backgroundColor: '#0f172a', borderRadius: '8px', padding: isTablet ? '14px' : '10px', maxHeight: isTablet ? '180px' : '120px', overflowY: 'auto' }}>
            <div style={{ fontSize: isTablet ? '14px' : '10px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>💡 建議棋路 (點擊查看)</div>
            {suggestions.map((s, i) => (
              <div key={i} style={{ 
                padding: isTablet ? '10px 12px' : '6px 8px', 
                marginBottom: '6px', 
                borderRadius: '6px', 
                fontSize: isTablet ? '15px' : '11px',
                backgroundColor: SUGGESTION_COLORS[s.type].bg,
                borderLeft: `4px solid ${SUGGESTION_COLORS[s.type].border}`,
                color: '#e2e8f0'
              }}>
                <div style={{ fontWeight: 'bold' }}>{SUGGESTION_COLORS[s.type].label} {s.san}</div>
                <div style={{ fontSize: isTablet ? '13px' : '9px', color: '#94a3b8', marginTop: '4px' }}>{s.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', paddingBottom: '40px', position: 'relative' }}>
        <div>
            <ChessBoard game={game} onMove={handleMove} warnings={warnings} sceneColor={sceneColor} suggestions={suggestions} />
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
