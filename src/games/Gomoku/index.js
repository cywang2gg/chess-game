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
    screenHeight: height
  };
};

function Gomoku() {
  const [deviceType] = useState(getDeviceType());
  const [boardSize, setBoardSize] = useState('medium');
  const [difficulty, setDifficulty] = useState(2);
  const [board, setBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('black'); // 黑先
  const [winner, setWinner] = useState(null);
  const [history, setHistory] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winningLine, setWinningLine] = useState([]);

  const isTablet = deviceType.isTablet;
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

  // 檢查勝利
  const checkWin = useCallback((board, row, col, player) => {
    const directions = [
      [[0, 1], [0, -1]],   // 水平
      [[1, 0], [-1, 0]],   // 垂直
      [[1, 1], [-1, -1]], // 對角線
      [[1, -1], [-1, 1]], // 反對角線
    ];

    for (const [dir1, dir2] of directions) {
      const line = [[row, col]];
      
      // 向一個方向延伸
      let r = row + dir1[0];
      let c = col + dir1[1];
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
        line.push([r, c]);
        r += dir1[0];
        c += dir1[1];
      }
      
      // 向另一個方向延伸
      r = row + dir2[0];
      c = col + dir2[1];
      while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
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

  // AI 移動（簡單策略）
  const makeAiMove = useCallback((currentBoard) => {
    // 收集所有空位並評分
    const moves = [];
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentBoard[r][c] === null) {
          // 評估這個位置的價值
          let score = 0;
          
          // 檢查周圍是否有棋子
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (currentBoard[nr][nc] === 'white') score += 2;
                if (currentBoard[nr][nc] === 'black') score += 3;
              }
            }
          }
          
          // 中心位置加分
          const center = Math.floor(size / 2);
          const distFromCenter = Math.abs(r - center) + Math.abs(c - center);
          score += Math.max(0, 10 - distFromCenter);
          
          moves.push({ row: r, col: c, score });
        }
      }
    }
    
    if (moves.length === 0) return null;
    
    // 根據難度選擇
    moves.sort((a, b) => b.score - a.score);
    
    // 難度越高，越傾向選擇最佳位置
    const topN = Math.max(1, Math.floor(moves.length / (difficulty + 1)));
    const candidateMoves = moves.slice(0, topN);
    const selectedMove = candidateMoves[Math.floor(Math.random() * candidateMoves.length)];
    
    return selectedMove;
  }, [size, difficulty]);

  // 處理點擊
  const handleCellClick = (row, col) => {
    if (board[row][col] !== null || winner || isAiThinking) return;
    
    // 玩家下棋
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);
    setHistory(prev => [...prev, { row, col, player: currentPlayer }]);
    
    // 檢查勝利
    const winLine = checkWin(newBoard, row, col, currentPlayer);
    if (winLine) {
      setWinner(currentPlayer);
      setWinningLine(winLine);
      return;
    }
    
    // 換 AI
    setCurrentPlayer('white');
    setIsAiThinking(true);
    
    setTimeout(() => {
      const aiMove = makeAiMove(newBoard);
      if (aiMove) {
        const aiBoard = newBoard.map(r => [...r]);
        aiBoard[aiMove.row][aiMove.col] = 'white';
        setBoard(aiBoard);
        setHistory(prev => [...prev, { row: aiMove.row, col: aiMove.col, player: 'white' }]);
        
        const aiWinLine = checkWin(aiBoard, aiMove.row, aiMove.col, 'white');
        if (aiWinLine) {
          setWinner('white');
          setWinningLine(aiWinLine);
        } else {
          setCurrentPlayer('black');
        }
      }
      setIsAiThinking(false);
    }, 500);
  };

  // 渲染格子
  const renderCell = (row, col) => {
    const cell = board[row][col];
    const isWinning = winningLine.some(([r, c]) => r === row && c === col);
    const isLastMove = history.length > 0 && 
      history[history.length - 1].row === row && 
      history[history.length - 1].col === col;
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        style={{
          width: isTablet ? '32px' : '24px',
          height: isTablet ? '32px' : '24px',
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
            width: isTablet ? '28px' : '20px',
            height: isTablet ? '28px' : '20px',
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
      flexDirection: isTablet ? 'row' : 'column',
      color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* 側邊欄 */}
      <div style={{
        width: isTablet ? '280px' : '100%',
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
            {winner ? `🏆 ${winner === 'black' ? '黑方' : '白方 (AI)'} 獲勝！` : 
             (isAiThinking ? '🤔 AI 思考中...' : `⏳ ${currentPlayer === 'black' ? '黑方 (你)' : '白方 (AI)'} 回合`)}
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
                  initBoard();
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
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>難度</div>
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
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>落子記錄</div>
          {history.slice(-8).map((h, i) => (
            <div key={i} style={{ 
              fontSize: '11px', 
              color: h.player === 'black' ? '#e2e8f0' : '#94a3b8',
              marginBottom: '4px',
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