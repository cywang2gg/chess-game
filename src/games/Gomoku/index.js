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

  // 計算某方向的連子數和空位
  const countLine = useCallback((boardState, row, col, dr, dc, player) => {
    let count = 0;
    let openEnds = 0;
    
    // 正向
    for (let i = 1; i <= 4; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) break;
      if (boardState[r][c] === player) count++;
      else if (boardState[r][c] === null) { openEnds++; break; }
      else break;
    }
    
    // 反向
    for (let i = 1; i <= 4; i++) {
      const r = row - i * dr;
      const c = col - i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) break;
      if (boardState[r][c] === player) count++;
      else if (boardState[r][c] === null) { openEnds++; break; }
      else break;
    }
    
    return { count, openEnds };
  }, [size]);

  // 評估單一位置
  const evaluatePosition = useCallback((boardState, row, col, player) => {
    if (boardState[row][col] !== null) return 0;
    
    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
      // 攻擊評分
      const myLine = countLine(boardState, row, col, dr, dc, player);
      const myCount = myLine.count + 1; // 包含自己
      
      if (myCount >= 5) score += 100000;
      else if (myCount === 4 && myLine.openEnds === 2) score += 10000;
      else if (myCount === 4 && myLine.openEnds === 1) score += 1000;
      else if (myCount === 3 && myLine.openEnds === 2) score += 1000;
      else if (myCount === 3 && myLine.openEnds === 1) score += 100;
      else if (myCount === 2 && myLine.openEnds === 2) score += 100;
      else if (myCount === 2 && myLine.openEnds === 1) score += 10;
      
      // 防守評分（對手的威脅）
      const oppLine = countLine(boardState, row, col, dr, dc, opponent);
      const oppCount = oppLine.count + 1;
      
      if (oppCount >= 5) score += 90000; // 必須防守
      else if (oppCount === 4 && oppLine.openEnds >= 1) score += 8000;
      else if (oppCount === 3 && oppLine.openEnds === 2) score += 700;
    }
    
    // 中心位置加分
    const center = Math.floor(size / 2);
    const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
    score += Math.max(0, 10 - distFromCenter);
    
    return score;
  }, [size, countLine]);

  // 獲取候選位置
  const getCandidates = useCallback((boardState) => {
    const candidates = [];
    const checked = new Set();
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardState[r][c] !== null) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              const key = `${nr},${nc}`;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && 
                  boardState[nr][nc] === null && !checked.has(key)) {
                checked.add(key);
                candidates.push([nr, nc]);
              }
            }
          }
        }
      }
    }
    
    if (candidates.length === 0) {
      const center = Math.floor(size / 2);
      return [[center, center]];
    }
    
    return candidates;
  }, [size]);

  // AI 移動（高效能版本）
  const makeAiMove = useCallback((currentBoard) => {
    const candidates = getCandidates(currentBoard);
    if (candidates.length === 0) return;
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    // 先檢查必殺棋（立即獲勝或必須防守）
    for (const [r, c] of candidates) {
      // AI 獲勝
      const testBoard1 = currentBoard.map(row => [...row]);
      testBoard1[r][c] = 'white';
      if (checkWin(testBoard1, r, c, 'white')) {
        bestMove = { row: r, col: c };
        bestScore = 1000000;
        break;
      }
      
      // 防守對方的活四或五連
      const testBoard2 = currentBoard.map(row => [...row]);
      testBoard2[r][c] = 'black';
      if (checkWin(testBoard2, r, c, 'black')) {
        const score = 900000;
        if (score > bestScore) {
          bestScore = score;
          bestMove = { row: r, col: c };
        }
      }
    }
    
    // 如果沒有必殺棋，評估所有位置並根據難度選擇
    if (!bestMove || bestScore < 900000) {
      // 收集所有候選位置的評分
      const scoredCandidates = [];
      for (const [r, c] of candidates) {
        const score = evaluatePosition(currentBoard, r, c, 'white');
        scoredCandidates.push({ row: r, col: c, score });
      }
      
      // 排序：從高分到低分
      scoredCandidates.sort((a, b) => b.score - a.score);
      
      // 根據難度選擇策略
      if (difficulty === 5) {
        // 專家級：100% 選最佳移動
        bestMove = scoredCandidates[0];
      } else if (difficulty === 4) {
        // 困難：90% 最佳，10% 次佳
        bestMove = Math.random() < 0.9 
          ? scoredCandidates[0] 
          : scoredCandidates[Math.min(1, scoredCandidates.length - 1)];
      } else if (difficulty === 3) {
        // 中等：70% 最佳，30% 前5名隨機
        if (Math.random() < 0.7) {
          bestMove = scoredCandidates[0];
        } else {
          const top5 = scoredCandidates.slice(0, Math.min(5, scoredCandidates.length));
          bestMove = top5[Math.floor(Math.random() * top5.length)];
        }
      } else if (difficulty === 2) {
        // 普通：50% 最佳，50% 前10名隨機
        if (Math.random() < 0.5) {
          bestMove = scoredCandidates[0];
        } else {
          const top10 = scoredCandidates.slice(0, Math.min(10, scoredCandidates.length));
          bestMove = top10[Math.floor(Math.random() * top10.length)];
        }
      } else {
        // 簡單：30% 最佳，70% 完全隨機
        if (Math.random() < 0.3) {
          bestMove = scoredCandidates[0];
        } else {
          bestMove = scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)];
        }
      }
    }
    
    if (!bestMove && candidates.length > 0) {
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
  }, [difficulty, getCandidates, evaluatePosition, checkWin]);

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
    
    setTimeout(() => makeAiMove(newBoard), 100);
  };

  // 渲染棋盤格子
  const renderCell = (row, col) => {
    const cell = board[row][col];
    const isWinning = winningLine.some(([r, c]) => r === row && c === col);
    const isLastMove = history.length > 0 && 
      history[history.length - 1].row === row && 
      history[history.length - 1].col === col;
    
    const cellSize = isTablet ? 36 : 28;
    
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
          touchAction: 'manipulation',
        }}
      >
        {cell && (
          <div style={{
            width: cellSize - 6,
            height: cellSize - 6,
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
        width: isTablet ? (isLandscape ? '300px' : '100%') : '260px',
        backgroundColor: '#1e293b',
        padding: isTablet ? '24px' : '15px',
        boxSizing: 'border-box',
      }}>
        <h1 style={{ fontSize: isTablet ? '28px' : '18px', color: '#8b5cf6', marginBottom: '20px' }}>
          ● 五子棋 Gomoku
        </h1>
        
        <div style={{
          backgroundColor: '#334155',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: isTablet ? '18px' : '14px', color: '#94a3b8', marginBottom: '8px' }}>
            {winner 
              ? `🏆 ${winner === 'black' ? '黑方獲勝！' : '白方 (AI) 獲勝'}`
              : (isAiThinking 
                ? '🤔 AI 思考中...'
                : `⏳ ${currentPlayer === 'black' ? '黑方 (你)' : '白方 (AI)'} 回合`)
            }
          </div>
          <div style={{ fontSize: isTablet ? '16px' : '12px', color: '#64748b' }}>
            步數：{history.length}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: isTablet ? '16px' : '12px', color: '#94a3b8', marginBottom: '10px' }}>棋盤大小</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {Object.entries(BOARD_SIZES).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => {
                  setBoardSize(key);
                  setTimeout(() => initBoard(), 0);
                }}
                style={{
                  flex: 1,
                  padding: isTablet ? '16px' : '10px',
                  backgroundColor: boardSize === key ? '#8b5cf6' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: isTablet ? '16px' : '14px',
                  minHeight: isTablet ? '50px' : 'auto',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: isTablet ? '16px' : '12px', color: '#94a3b8', marginBottom: '10px' }}>
            AI 難度
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  padding: isTablet ? '16px' : '10px',
                  backgroundColor: difficulty === d ? '#8b5cf6' : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isTablet ? '18px' : '16px',
                  minHeight: isTablet ? '50px' : 'auto',
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ fontSize: isTablet ? '14px' : '10px', color: '#64748b', marginTop: '8px' }}>
            {difficulty <= 2 ? '低難度（有隨機）' : 
             difficulty === 3 ? '中等難度' :
             difficulty === 4 ? '高難度' :
             '最高難度'}
          </div>
        </div>

        <button
          onClick={initBoard}
          style={{
            width: '100%',
            padding: isTablet ? '20px' : '14px',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: isTablet ? '20px' : '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '16px',
            minHeight: isTablet ? '60px' : 'auto',
          }}
        >
          新遊戲
        </button>

        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <div style={{ fontSize: isTablet ? '16px' : '12px', color: '#94a3b8' }}>落子記錄</div>
          {history.slice(-8).map((h, i) => (
            <div key={i} style={{ 
              fontSize: isTablet ? '14px' : '11px', 
              color: h.player === 'black' ? '#e2e8f0' : '#94a3b8',
              marginTop: '6px',
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
        padding: isTablet ? '30px' : '20px',
        overflow: 'auto',
      }}>
        <div style={{
          backgroundColor: '#deb887',
          padding: '10px',
          borderRadius: '10px',
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
            padding: isTablet ? '50px' : '40px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '2px solid #8b5cf6',
          }}>
            <div style={{ fontSize: isTablet ? '64px' : '48px', marginBottom: '20px' }}>
              {winner === 'black' ? '⚫' : '⚪'}
            </div>
            <h2 style={{ fontSize: isTablet ? '32px' : '28px', color: '#fff', marginBottom: '10px' }}>
              {winner === 'black' ? '🎉 你贏了！' : 'AI 獲勝'}
            </h2>
            <p style={{ fontSize: isTablet ? '20px' : '16px', color: '#94a3b8', marginBottom: '20px' }}>
              總步數：{history.length}
            </p>
            <button
              onClick={initBoard}
              style={{
                padding: isTablet ? '16px 40px' : '12px 30px',
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: isTablet ? '20px' : '16px',
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