import React, { useState, useEffect, useCallback } from 'react';

// 棋盤大小選項
const BOARD_SIZES = {
  small: { size: 13, name: '13×13' },
  medium: { size: 15, name: '15×15' },
  large: { size: 19, name: '19×19' },
};

// iPad 偵測
const isIPad = () => {
  return /iPad|Macintosh|Silk/i.test(navigator.userAgent) && 'ontouchend' in document;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const iPad = isIPad();
  
  return {
    isIPad: iPad,
    isTablet: iPad || (width >= 768 && width <= 1024),
    screenWidth: width,
    screenHeight: height,
    isLandscape: width > height
  };
};

// 棋型評分表
const SCORES = {
  FIVE: 1000000,      // 五連
  LIVE_FOUR: 100000,  // 活四
  RUSH_FOUR: 10000,   // 衝四
  LIVE_THREE: 10000,  // 活三
  SLEEP_THREE: 1000,  // 眠三
  LIVE_TWO: 500,      // 活二
  SLEEP_TWO: 100,     // 眠二
};

function Gomoku() {
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const [boardSize, setBoardSize] = useState('medium');
  const [difficulty, setDifficulty] = useState(2);
  const [board, setBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [winner, setWinner] = useState(null);
  const [history, setHistory] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winningLine, setWinningLine] = useState([]);

  const isTablet = deviceType.isTablet;
  const isLandscape = deviceType.isLandscape;
  const size = BOARD_SIZES[boardSize].size;

  // 初始化棋盤
  const initBoard = useCallback(() => {
    const newBoard = Array(size).fill(null).map(() => Array(size).fill(null));
    setBoard(newBoard);
    setCurrentPlayer('black');
    setWinner(null);
    setHistory([]);
    setWinningLine([]);
  }, [size]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 檢查勝利
  const checkWin = useCallback((boardState, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -1], [-1, 1]],
    ];

    for (const [dir1, dir2] of directions) {
      const line = [[row, col]];
      
      let r = row + dir1[0];
      let c = col + dir1[1];
      while (r >= 0 && r < size && c >= 0 && c < size && boardState[r][c] === player) {
        line.push([r, c]);
        r += dir1[0];
        c += dir1[1];
      }
      
      r = row + dir2[0];
      c = col + dir2[1];
      while (r >= 0 && r < size && c >= 0 && c < size && boardState[r][c] === player) {
        line.push([r, c]);
        r += dir2[0];
        c += dir2[1];
      }
      
      if (line.length >= 5) return line;
    }
    return null;
  }, [size]);

  // 分析棋型（核心評分函數）
  const analyzeLine = useCallback((boardState, row, col, dr, dc, player) => {
    let count = 1;
    let block = 0;
    let empty = 0;
    
    // 正向掃描
    for (let i = 1; i <= 5; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) {
        block++;
        break;
      }
      const cell = boardState[r][c];
      if (cell === player) {
        count++;
      } else if (cell === null) {
        empty++;
        break;
      } else {
        block++;
        break;
      }
    }
    
    // 反向掃描
    for (let i = 1; i <= 5; i++) {
      const r = row - i * dr;
      const c = col - i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) {
        block++;
        break;
      }
      const cell = boardState[r][c];
      if (cell === player) {
        count++;
      } else if (cell === null) {
        empty++;
        break;
      } else {
        block++;
        break;
      }
    }
    
    return { count, block, empty };
  }, [size]);

  // 評估單一位置的分數
  const evaluatePoint = useCallback((boardState, row, col, player) => {
    if (boardState[row][col] !== null) return 0;
    
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    let score = 0;
    
    for (const [dr, dc] of directions) {
      const result = analyzeLine(boardState, row, col, dr, dc, player);
      const { count, block } = result;
      
      if (count >= 5) {
        score += SCORES.FIVE;
      } else if (block === 0) { // 活棋
        if (count === 4) score += SCORES.LIVE_FOUR;
        else if (count === 3) score += SCORES.LIVE_THREE;
        else if (count === 2) score += SCORES.LIVE_TWO;
      } else if (block === 1) { // 眠棋
        if (count === 4) score += SCORES.RUSH_FOUR;
        else if (count === 3) score += SCORES.SLEEP_THREE;
        else if (count === 2) score += SCORES.SLEEP_TWO;
      }
    }
    
    return score;
  }, [analyzeLine]);

  // 全局評估
  const evaluateBoard = useCallback((boardState, player) => {
    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardState[r][c] === player) {
          score += evaluatePoint(boardState, r, c, player);
        } else if (boardState[r][c] === opponent) {
          score -= evaluatePoint(boardState, r, c, opponent) * 1.1; // 防守略重
        }
      }
    }
    
    return score;
  }, [size, evaluatePoint]);

  // 獲取候選位置（只考慮有棋子周圍的位置）
  const getCandidates = useCallback((boardState) => {
    const candidates = new Set();
    const range = 2;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardState[r][c] !== null) {
          for (let dr = -range; dr <= range; dr++) {
            for (let dc = -range; dc <= range; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && boardState[nr][nc] === null) {
                candidates.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
    }
    
    // 如果沒有候選（開局），返回中心點
    if (candidates.size === 0) {
      const center = Math.floor(size / 2);
      return [[center, center]];
    }
    
    return Array.from(candidates).map(s => {
      const [r, c] = s.split(',').map(Number);
      return [r, c];
    });
  }, [size]);

  // Minimax + Alpha-Beta
  const minimax = useCallback((boardState, depth, alpha, beta, isMaximizing, player) => {
    const aiColor = 'white';
    const humanColor = 'black';
    
    if (depth === 0) {
      return evaluateBoard(boardState, aiColor);
    }
    
    const candidates = getCandidates(boardState);
    if (candidates.length === 0) {
      return evaluateBoard(boardState, aiColor);
    }
    
    // 先評分排序，提升剪枝效率
    const scoredCandidates = candidates.map(([r, c]) => {
      const newBoard = boardState.map(row => [...row]);
      newBoard[r][c] = isMaximizing ? aiColor : humanColor;
      return { r, c, score: evaluateBoard(newBoard, isMaximizing ? aiColor : humanColor) };
    }).sort((a, b) => b.score - a.score).slice(0, 15); // 只取前 15 個
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const { r, c } of scoredCandidates) {
        const newBoard = boardState.map(row => [...row]);
        newBoard[r][c] = aiColor;
        
        // 檢查是否獲勝
        if (checkWin(newBoard, r, c, aiColor)) {
          return SCORES.FIVE;
        }
        
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, player);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const { r, c } of scoredCandidates) {
        const newBoard = boardState.map(row => [...row]);
        newBoard[r][c] = humanColor;
        
        // 檢查是否獲勝
        if (checkWin(newBoard, r, c, humanColor)) {
          return -SCORES.FIVE;
        }
        
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, player);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [getCandidates, evaluateBoard, checkWin]);

  // AI 移動
  const makeAiMove = useCallback((currentBoard) => {
    const candidates = getCandidates(currentBoard);
    if (candidates.length === 0) return;
    
    // 根據難度設定搜尋深度
    const depthMap = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 };
    const searchDepth = depthMap[difficulty] || 2;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    // 快速檢查必殺棋
    for (const [r, c] of candidates) {
      // 檢查 AI 是否能直接獲勝
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'white';
      if (checkWin(testBoard, r, c, 'white')) {
        bestMove = { row: r, col: c };
        break;
      }
      
      // 檢查是否需要防守對方的必殺棋
      const testBoard2 = currentBoard.map(row => [...row]);
      testBoard2[r][c] = 'black';
      if (checkWin(testBoard2, r, c, 'black')) {
        bestScore = SCORES.FIVE - 1;
        bestMove = { row: r, col: c };
      }
    }
    
    // 如果沒有必殺棋，使用 Minimax
    if (!bestMove || bestScore < SCORES.FIVE - 1) {
      bestScore = -Infinity;
      
      for (const [r, c] of candidates) {
        const newBoard = currentBoard.map(row => [...row]);
        newBoard[r][c] = 'white';
        
        // 檢查是否獲勝
        if (checkWin(newBoard, r, c, 'white')) {
          bestMove = { row: r, col: c };
          break;
        }
        
        const score = minimax(newBoard, searchDepth - 1, -Infinity, Infinity, false, 'white');
        
        // 難度 1-3 加入隨機因素
        let finalScore = score;
        if (difficulty <= 3) {
          const noise = (Math.random() - 0.5) * (4 - difficulty) * 5000;
          finalScore += noise;
        }
        
        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestMove = { row: r, col: c };
        }
      }
    }
    
    if (!bestMove) {
      bestMove = { row: candidates[0][0], col: candidates[0][1] };
    }
    
    // 執行移動
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[bestMove.row][bestMove.col] = 'white';
    setBoard(newBoard);
    setHistory(prev => [...prev, { row: bestMove.row, col: bestMove.col, player: 'white' }]);
    
    const aiWinLine = checkWin(newBoard, bestMove.row, bestMove.col, 'white');
    if (aiWinLine) {
      setWinner('white');
      setWinningLine(aiWinLine);
    } else {
      setCurrentPlayer('black');
    }
    
    setIsAiThinking(false);
  }, [difficulty, getCandidates, minimax, checkWin]);

  // 處理玩家點擊
  const handleCellClick = (row, col) => {
    if (board[row][col] !== null || winner || isAiThinking) return;
    
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = 'black';
    setBoard(newBoard);
    setHistory(prev => [...prev, { row, col, player: 'black' }]);
    
    const playerWinLine = checkWin(newBoard, row, col, 'black');
    if (playerWinLine) {
      setWinner('black');
      setWinningLine(playerWinLine);
      return;
    }
    
    setCurrentPlayer('white');
    setIsAiThinking(true);
    
    setTimeout(() => makeAiMove(newBoard), 300);
  };

  // 渲染棋盤格子
  const renderCell = (row, col) => {
    const cell = board[row][col];
    const isWinning = winningLine.some(([r, c]) => r === row && c === col);
    const isLastMove = history.length > 0 && 
      history[history.length - 1].row === row && 
      history[history.length - 1].col === col;
    
    const cellSize = isTablet ? 32 : 24;
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: '#deb887',
          border: '1px solid #8b4513',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: cell === null && !winner && !isAiThinking ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        {cell && (
          <div style={{
            width: cellSize - 4,
            height: cellSize - 4,
            borderRadius: '50%',
            backgroundColor: cell === 'black' ? '#1a1a1a' : '#fff',
            border: `2px solid ${cell === 'black' ? '#000' : '#ccc'}`,
            boxShadow: isLastMove 
              ? `0 0 0 3px ${cell === 'black' ? '#3b82f6' : '#f59e0b'}` 
              : (isWinning ? '0 0 8px #ef4444' : '2px 2px 4px rgba(0,0,0,0.3)'),
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: isTablet && !isLandscape ? 'column' : 'row',
      color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: isTablet ? (isLandscape ? '280px' : '100%') : '260px',
        backgroundColor: '#1e293b',
        padding: isTablet ? '20px' : '15px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ fontSize: isTablet ? '24px' : '18px', color: '#8b5cf6', marginBottom: '15px' }}>
          ● 五子棋 Gomoku
        </h1>
        
        <div style={{
          backgroundColor: '#334155',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            {winner 
              ? `🏆 ${winner === 'black' ? '黑方獲勝！' : '白方 (AI) 獲勝'}`
              : (isAiThinking 
                ? '🤔 AI 思考中...'
                : `⏳ ${currentPlayer === 'black' ? '黑方 (你)' : '白方 (AI)'} 回合`)
            }
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            步數：{history.length}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>棋盤大小</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {Object.entries(BOARD_SIZES).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => {
                  setBoardSize(key);
                  setTimeout(() => initBoard(), 0);
                }}
                style={{
                  flex: 1,
                  padding: isTablet ? '12px' : '8px',
                  backgroundColor: boardSize === key ? '#8b5cf6' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  minHeight: isTablet ? '44px' : 'auto',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            難度（Minimax 深度）
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: isTablet ? '12px' : '8px',
                  backgroundColor: difficulty === d ? '#8b5cf6' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minWidth: isTablet ? '44px' : '36px',
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
            {difficulty === 1 ? '深度 1 + 高隨機' : 
             difficulty === 2 ? '深度 1 + 中隨機' : 
             difficulty === 3 ? '深度 2 + 低隨機' :
             difficulty === 4 ? '深度 3（強）' :
             '深度 4（最強）'}
          </div>
        </div>

        <button
          onClick={initBoard}
          style={{
            width: '100%',
            padding: isTablet ? '16px' : '12px',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: isTablet ? '18px' : '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '12px',
            minHeight: isTablet ? '56px' : 'auto',
          }}
        >
          新遊戲
        </button>

        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>落子記錄</div>
          {history.slice(-6).map((h, i) => (
            <div key={i} style={{ 
              fontSize: '11px', 
              color: h.player === 'black' ? '#e2e8f0' : '#94a3b8',
              marginTop: '4px',
            }}>
              {h.player === 'black' ? '⚫' : '⚪'} ({h.row}, {h.col})
            </div>
          ))}
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        overflow: 'auto',
      }}>
        <div style={{
          backgroundColor: '#deb887',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, 1fr)`,
          }}>
            {board.map((row, ri) => 
              row.map((_, ci) => renderCell(ri, ci))
            )}
          </div>
        </div>
      </div>

      {winner && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '2px solid #8b5cf6',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              {winner === 'black' ? '⚫' : '⚪'}
            </div>
            <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '10px' }}>
              {winner === 'black' ? '🎉 你贏了！' : 'AI 獲勝'}
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '20px' }}>
              總步數：{history.length}
            </p>
            <button
              onClick={initBoard}
              style={{
                padding: '12px 30px',
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              再來一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Gomoku;