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

  // 檢查勝利並返回連線位置
  const checkWin = useCallback((boardState, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],   // 水平
      [[1, 0], [-1, 0]],   // 垂直
      [[1, 1], [-1, -1]], // 對角線
      [[1, -1], [-1, 1]], // 反對角線
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
      
      if (line.length >= 5) {
        return line;
      }
    }
    
    return null;
  }, [size]);

  // 評估位置價值（核心 AI 邏輯）
  const evaluatePosition = useCallback((boardState, row, col, player) => {
    if (boardState[row][col] !== null) return -1;
    
    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';
    
    // 檢查四個方向
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (const [dr, dc] of directions) {
      // 計算連續棋子數
      let myCount = 1;  // 包含自己（假設放上棋子）
      let myOpenEnds = 0;
      let oppCount = 0;
      let oppOpenEnds = 0;
      
      // 向正方向計算
      for (let i = 1; i <= 5; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) break;
        if (boardState[r][c] === player) myCount++;
        else if (boardState[r][c] === null) { myOpenEnds++; break; }
        else break;
      }
      
      // 向負方向計算
      for (let i = 1; i <= 5; i++) {
        const r = row - i * dr;
        const c = col - i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) break;
        if (boardState[r][c] === player) myCount++;
        else if (boardState[r][c] === null) { myOpenEnds++; break; }
        else break;
      }
      
      // 評分：連成五子 = 必勝
      if (myCount >= 5) score += 100000;
      // 活四（4連 + 2空端）= 必勝
      else if (myCount === 4 && myOpenEnds === 2) score += 10000;
      // 活三（3連 + 2空端）
      else if (myCount === 3 && myOpenEnds === 2) score += 1000;
      // 死四（4連 + 1空端）
      else if (myCount === 4 && myOpenEnds === 1) score += 500;
      // 活二（2連 + 2空端）
      else if (myCount === 2 && myOpenEnds === 2) score += 100;
      // 死三
      else if (myCount === 3 && myOpenEnds === 1) score += 50;
      
      // 對手的威脅（需要防守）
      // 檢查對手在此方向的連子
      let oppDirCount = 0;
      let oppDirOpen = 0;
      
      for (let i = 1; i <= 5; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) break;
        if (boardState[r][c] === opponent) oppDirCount++;
        else if (boardState[r][c] === null) { oppDirOpen++; break; }
        else break;
      }
      
      for (let i = 1; i <= 5; i++) {
        const r = row - i * dr;
        const c = col - i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) break;
        if (boardState[r][c] === opponent) oppDirCount++;
        else if (boardState[r][c] === null) { oppDirOpen++; break; }
        else break;
      }
      
      // 防守評分
      if (oppDirCount >= 5) score += 90000;  // 必須防守
      else if (oppDirCount === 4 && oppDirOpen >= 1) score += 8000;  // 必須防守
      else if (oppDirCount === 3 && oppDirOpen === 2) score += 700;  // 需要防守
    }
    
    // 中心位置加分
    const center = Math.floor(size / 2);
    const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
    score += Math.max(0, 15 - distFromCenter);
    
    // 周圍有棋子加分
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) {
          if (boardState[r][c] !== null) score += 3;
        }
      }
    }
    
    return score;
  }, [size]);

  // AI 移動（根據難度）
  const makeAiMove = useCallback((currentBoard) => {
    // 收集所有空位並評分
    const moves = [];
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentBoard[r][c] === null) {
          const score = evaluatePosition(currentBoard, r, c, 'white');
          if (score > 0) {
            moves.push({ row: r, col: c, score });
          }
        }
      }
    }
    
    if (moves.length === 0) {
      // 如果沒有好位置，選擇中心或附近
      const center = Math.floor(size / 2);
      if (currentBoard[center][center] === null) {
        moves.push({ row: center, col: center, score: 1 });
      } else {
        // 找最近的空位
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = center + dr;
            const c = center + dc;
            if (r >= 0 && r < size && c >= 0 && c < size && currentBoard[r][c] === null) {
              moves.push({ row: r, col: c, score: 1 });
            }
          }
        }
      }
    }
    
    if (moves.length === 0) return;
    
    // 根據難度排序和選擇
    moves.sort((a, b) => b.score - a.score);
    
    let selectedMove;
    
    switch (difficulty) {
      case 1:  // 隨機選擇前 20%
        const randomPool = moves.slice(0, Math.max(1, Math.floor(moves.length * 0.2)));
        selectedMove = randomPool[Math.floor(Math.random() * randomPool.length)];
        break;
        
      case 2:  // 隨機選擇前 10%
        const pool2 = moves.slice(0, Math.max(1, Math.floor(moves.length * 0.1)));
        selectedMove = pool2[Math.floor(Math.random() * pool2.length)];
        break;
        
      case 3:  // 70% 最佳，30% 次佳
        if (Math.random() < 0.7) {
          selectedMove = moves[0];
        } else {
          const pool3 = moves.slice(0, Math.min(5, moves.length));
          selectedMove = pool3[Math.floor(Math.random() * pool3.length)];
        }
        break;
        
      case 4:  // 90% 最佳，10% 次佳
        if (Math.random() < 0.9 || moves.length === 1) {
          selectedMove = moves[0];
        } else {
          selectedMove = moves[Math.floor(Math.random() * Math.min(3, moves.length))];
        }
        break;
        
      case 5:  // 總是最佳
        selectedMove = moves[0];
        break;
        
      default:
        selectedMove = moves[0];
    }
    
    // 執行 AI 移動
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[selectedMove.row][selectedMove.col] = 'white';
    setBoard(newBoard);
    setHistory(prev => [...prev, { row: selectedMove.row, col: selectedMove.col, player: 'white' }]);
    
    // 檢查 AI 是否勝利
    const aiWinLine = checkWin(newBoard, selectedMove.row, selectedMove.col, 'white');
    if (aiWinLine) {
      setWinner('white');
      setWinningLine(aiWinLine);
    } else {
      setCurrentPlayer('black');
    }
    
    setIsAiThinking(false);
  }, [size, difficulty, evaluatePosition, checkWin]);

  // 處理玩家點擊
  const handleCellClick = (row, col) => {
    if (board[row][col] !== null || winner || isAiThinking) return;
    
    // 玩家下棋
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = 'black';
    setBoard(newBoard);
    setHistory(prev => [...prev, { row, col, player: 'black' }]);
    
    // 檢查玩家勝利
    const playerWinLine = checkWin(newBoard, row, col, 'black');
    if (playerWinLine) {
      setWinner('black');
      setWinningLine(playerWinLine);
      return;
    }
    
    // 換 AI
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
      {/* 側邊欄 */}
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

        {/* 棋盤大小 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>棋盤大小</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {Object.entries(BOARD_SIZES).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => {
                  setBoardSize(key);
                  // 需要重新初始化
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

        {/* 難度 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            難度（AI 防守/攻擊強度）
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
            {difficulty === 1 ? '隨機選擇前 20%' : 
             difficulty === 2 ? '隨機選擇前 10%' : 
             difficulty === 3 ? '70% 最佳，30% 次佳' :
             difficulty === 4 ? '90% 最佳' :
             '總是最佳選擇'}
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

        {/* 歷史記錄 */}
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

      {/* 棋盤 */}
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

      {/* 勝利彈窗 */}
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