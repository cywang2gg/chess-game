import React, { useState, useEffect, useCallback, useMemo } from 'react';

// 中國象棋棋子定義
const PIECES = {
  // 紅方（下方）
  r_king: { name: '帥', color: 'red' },
  r_advisor: { name: '仕', color: 'red' },
  r_elephant: { name: '相', color: 'red' },
  r_horse: { name: '馬', color: 'red' },
  r_chariot: { name: '車', color: 'red' },
  r_cannon: { name: '炮', color: 'red' },
  r_soldier: { name: '兵', color: 'red' },
  // 黑方（上方）
  b_king: { name: '將', color: 'black' },
  b_advisor: { name: '士', color: 'black' },
  b_elephant: { name: '象', color: 'black' },
  b_horse: { name: '馬', color: 'black' },
  b_chariot: { name: '車', color: 'black' },
  b_cannon: { name: '砲', color: 'black' },
  b_soldier: { name: '卒', color: 'black' },
};

// 初始棋盤佈局
const INITIAL_BOARD = [
  ['b_chariot', 'b_horse', 'b_elephant', 'b_advisor', 'b_king', 'b_advisor', 'b_elephant', 'b_horse', 'b_chariot'],
  [null, null, null, null, null, null, null, null, null],
  [null, 'b_cannon', null, null, null, null, null, 'b_cannon', null],
  ['b_soldier', null, 'b_soldier', null, 'b_soldier', null, 'b_soldier', null, 'b_soldier'],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['r_soldier', null, 'r_soldier', null, 'r_soldier', null, 'r_soldier', null, 'r_soldier'],
  [null, 'r_cannon', null, null, null, null, null, 'r_cannon', null],
  [null, null, null, null, null, null, null, null, null],
  ['r_chariot', 'r_horse', 'r_elephant', 'r_advisor', 'r_king', 'r_advisor', 'r_elephant', 'r_horse', 'r_chariot'],
];

// iPad 偵測
const isIPad = () => {
  return /iPad|Macintosh|Silk/i.test(navigator.userAgent) && 'ontouchend' in document;
};

const getDeviceType = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  const iPad = isIPad();
  
  return {
    isIPad: iPad,
    isLandscape,
    isTablet: iPad || (width >= 768 && width <= 1024),
    screenWidth: width,
    screenHeight: height
  };
};

function ChineseChess() {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('red'); // 紅方先走
  const [difficulty, setDifficulty] = useState(2);
  const [history, setHistory] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const [gameStatus, setGameStatus] = useState('playing'); // playing, red_win, black_win, draw

  const isTablet = deviceType.isTablet;
  const isLandscape = deviceType.isLandscape;

  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 檢查移動是否合法（簡化版）
  const isValidMove = useCallback((fromRow, fromCol, toRow, toCol, piece) => {
    if (!piece) return false;
    const pieceInfo = PIECES[piece];
    if (!pieceInfo) return false;
    
    // 不能吃自己的棋子
    const targetPiece = board[toRow][toCol];
    if (targetPiece && PIECES[targetPiece]?.color === pieceInfo.color) return false;
    
    // 基本規則（簡化）
    const type = piece.split('_')[1];
    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    
    switch (type) {
      case 'king': // 帥/將：只能在九宮格內移動，每次一步
        if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
        // 九宮格限制
        if (pieceInfo.color === 'red') {
          if (toRow < 7 || toRow > 9 || toCol < 3 || toCol > 5) return false;
        } else {
          if (toRow < 0 || toRow > 2 || toCol < 3 || toCol > 5) return false;
        }
        return true;
        
      case 'advisor': // 仕/士：只能在九宮格內斜走
        if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;
        if (pieceInfo.color === 'red') {
          if (toRow < 7 || toRow > 9 || toCol < 3 || toCol > 5) return false;
        } else {
          if (toRow < 0 || toRow > 2 || toCol < 3 || toCol > 5) return false;
        }
        return true;
        
      case 'elephant': // 相/象：斜走兩格，不能過河，不能被塞象眼
        if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
        // 不能過河
        if (pieceInfo.color === 'red' && toRow < 5) return false;
        if (pieceInfo.color === 'black' && toRow > 4) return false;
        // 象眼檢查
        const eyeRow = fromRow + dr / 2;
        const eyeCol = fromCol + dc / 2;
        if (board[eyeRow][eyeCol]) return false;
        return true;
        
      case 'horse': // 馬：走日字，不能被蹩馬腿
        if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2))) return false;
        // 馬腿檢查
        let legRow, legCol;
        if (Math.abs(dr) === 2) {
          legRow = fromRow + dr / 2;
          legCol = fromCol;
        } else {
          legRow = fromRow;
          legCol = fromCol + dc / 2;
        }
        if (board[legRow][legCol]) return false;
        return true;
        
      case 'chariot': // 車：直線移動，不能跨越棋子
        if (dr !== 0 && dc !== 0) return false;
        // 檢查路徑是否有棋子
        const steps = Math.abs(dr) || Math.abs(dc);
        const stepR = dr === 0 ? 0 : dr / steps;
        const stepC = dc === 0 ? 0 : dc / steps;
        for (let i = 1; i < steps; i++) {
          if (board[fromRow + i * stepR][fromCol + i * stepC]) return false;
        }
        return true;
        
      case 'cannon': // 炮：直線移動，吃子需要跳過一個棋子
        if (dr !== 0 && dc !== 0) return false;
        const cSteps = Math.abs(dr) || Math.abs(dc);
        const cStepR = dr === 0 ? 0 : dr / cSteps;
        const cStepC = dc === 0 ? 0 : dc / cSteps;
        let obstacles = 0;
        for (let i = 1; i < cSteps; i++) {
          if (board[fromRow + i * cStepR][fromCol + i * cStepC]) obstacles++;
        }
        if (targetPiece) {
          return obstacles === 1; // 吃子需要跳過一個
        } else {
          return obstacles === 0; // 移動不能跳過
        }
        
      case 'soldier': // 兵/卒：過河前只能向前，過河後可以左右
        if (pieceInfo.color === 'red') {
          if (fromRow > 4) { // 未過河
            return dr === -1 && dc === 0;
          } else { // 已過河
            return (dr === -1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
          }
        } else {
          if (fromRow < 5) { // 未過河
            return dr === 1 && dc === 0;
          } else { // 已過河
            return (dr === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
          }
        }
        
      default:
        return false;
    }
  }, [board]);

  // 處理棋子點擊
  const handleCellClick = (row, col) => {
    if (isAiThinking || gameStatus !== 'playing') return;
    
    const piece = board[row][col];
    
    if (selectedPiece) {
      // 嘗試移動
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col, selectedPiece.piece)) {
        // 執行移動
        const newBoard = [...board.map(r => [...r])];
        newBoard[row][col] = selectedPiece.piece;
        newBoard[selectedPiece.row][selectedPiece.col] = null;
        setBoard(newBoard);
        setHistory(prev => [...prev, {
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col },
          piece: selectedPiece.piece
        }]);
        setSelectedPiece(null);
        
        // 檢查是否吃掉將/帥
        if (targetPiece && targetPiece.includes('king')) {
          setGameStatus(currentPlayer === 'red' ? 'red_win' : 'black_win');
          return;
        }
        
        // 換方
        setCurrentPlayer(currentPlayer === 'red' ? 'black' : 'red');
        
        // AI 回合
        if (currentPlayer === 'red') {
          setIsAiThinking(true);
          setTimeout(() => makeAiMove(newBoard), 500);
        }
      } else {
        // 取消選擇或選擇新棋子
        if (piece && PIECES[piece]?.color === currentPlayer) {
          setSelectedPiece({ row, col, piece });
        } else {
          setSelectedPiece(null);
        }
      }
    } else {
      // 選擇棋子
      if (piece && PIECES[piece]?.color === currentPlayer) {
        setSelectedPiece({ row, col, piece });
      }
    }
  };

  // AI 移動（簡化版）
  const makeAiMove = useCallback((currentBoard) => {
    // 收集所有合法移動
    const moves = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = currentBoard[r][c];
        if (piece && PIECES[piece]?.color === 'black') {
          for (let tr = 0; tr < 10; tr++) {
            for (let tc = 0; tc < 9; tc++) {
              if (isValidMove(r, c, tr, tc, piece)) {
                moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece });
              }
            }
          }
        }
      }
    }
    
    if (moves.length === 0) {
      setIsAiThinking(false);
      return;
    }
    
    // 隨機選擇（根據難度調整）
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];
    
    const newBoard = [...currentBoard.map(r => [...r])];
    newBoard[move.to.row][move.to.col] = move.piece;
    newBoard[move.from.row][move.from.col] = null;
    setBoard(newBoard);
    
    // 檢查是否吃掉將/帥
    const targetPiece = currentBoard[move.to.row][move.to.col];
    if (targetPiece && targetPiece.includes('king')) {
      setGameStatus('black_win');
      setIsAiThinking(false);
      return;
    }
    
    setCurrentPlayer('red');
    setIsAiThinking(false);
  }, [isValidMove]);

  // 新遊戲
  const newGame = () => {
    setBoard(INITIAL_BOARD);
    setSelectedPiece(null);
    setCurrentPlayer('red');
    setHistory([]);
    setGameStatus('playing');
  };

  // 渲染棋盤格子
  const renderCell = (row, col) => {
    const piece = board[row][col];
    const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
    const pieceInfo = piece ? PIECES[piece] : null;
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        style={{
          width: isTablet ? '50px' : '40px',
          height: isTablet ? '50px' : '40px',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.5)' : '#f0d9b5',
          border: '1px solid #8b4513',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: pieceInfo && pieceInfo.color === currentPlayer ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        {pieceInfo && (
          <div style={{
            width: isTablet ? '44px' : '36px',
            height: isTablet ? '44px' : '36px',
            borderRadius: '50%',
            backgroundColor: pieceInfo.color === 'red' ? '#fff' : '#333',
            border: `2px solid ${pieceInfo.color === 'red' ? '#c41e3a' : '#000'}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: isTablet ? '24px' : '18px',
            fontWeight: 'bold',
            color: pieceInfo.color === 'red' ? '#c41e3a' : '#fff',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}>
            {pieceInfo.name}
          </div>
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
        <h1 style={{ fontSize: isTablet ? '24px' : '18px', color: '#ef4444', marginBottom: '15px' }}>
          將 中國象棋
        </h1>
        
        <div style={{ backgroundColor: '#334155', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
            Current: {currentPlayer === 'red' ? '紅方 (你)' : '黑方 (AI)'}
          </div>
          <div style={{ fontSize: '12px', color: isAiThinking ? '#f59e0b' : '#10b981' }}>
            {isAiThinking ? 'AI 思考中...' : '等待你的回合'}
          </div>
        </div>

        {/* 難度選擇 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>難度</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: isTablet ? '12px' : '8px',
                  backgroundColor: difficulty === d ? '#ef4444' : '#334155',
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
          onClick={newGame}
          style={{
            width: '100%',
            padding: isTablet ? '16px' : '12px',
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: isTablet ? '16px' : '14px',
            cursor: 'pointer',
            minHeight: isTablet ? '44px' : 'auto',
          }}
        >
          新遊戲
        </button>

        {/* 歷史記錄 */}
        <div style={{ marginTop: '12px', maxHeight: '150px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>移動記錄</div>
          {history.slice(-10).map((h, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              {PIECES[h.piece]?.name} ({h.from.row},{h.from.col}) → ({h.to.row},{h.to.col})
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
      }}>
        <div style={{
          backgroundColor: '#f0d9b5',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {/* 棋盤格子 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gridTemplateRows: 'repeat(10, 1fr)',
            gap: '0',
          }}>
            {board.map((row, ri) => 
              row.map((_, ci) => renderCell(ri, ci))
            )}
          </div>
          
          {/* 河界 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '16px',
            color: '#8b4513',
          }}>
            河界
          </div>
        </div>
      </div>

      {/* 結束彈窗 */}
      {gameStatus !== 'playing' && (
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
            border: '2px solid #ef4444',
          }}>
            <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '20px' }}>
              {gameStatus === 'red_win' ? '🎉 紅方勝利！' : '黑方勝利'}
            </h2>
            <button
              onClick={newGame}
              style={{
                padding: '12px 30px',
                backgroundColor: '#ef4444',
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

export default ChineseChess;