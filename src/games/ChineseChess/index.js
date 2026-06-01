import React, { useState, useEffect, useCallback, useMemo } from 'react';

// 中國象棋棋子定義
const PIECES = {
  // 紅方（下方）
  r_king: { name: '帥', color: 'red', value: 10000 },
  r_advisor: { name: '仕', color: 'red', value: 20 },
  r_elephant: { name: '相', color: 'red', value: 20 },
  r_horse: { name: '馬', color: 'red', value: 40 },
  r_chariot: { name: '車', color: 'red', value: 90 },
  r_cannon: { name: '炮', color: 'red', value: 45 },
  r_soldier: { name: '兵', color: 'red', value: 10 },
  // 黑方（上方）
  b_king: { name: '將', color: 'black', value: 10000 },
  b_advisor: { name: '士', color: 'black', value: 20 },
  b_elephant: { name: '象', color: 'black', value: 20 },
  b_horse: { name: '馬', color: 'black', value: 40 },
  b_chariot: { name: '車', color: 'black', value: 90 },
  b_cannon: { name: '砲', color: 'black', value: 45 },
  b_soldier: { name: '卒', color: 'black', value: 10 },
};

// 位置價值表（紅方視角，黑方需翻轉）
const POSITION_VALUES = {
  soldier: [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [2,4,6,8,10,8,6,4,2],
    [4,8,12,16,20,16,12,8,4],
    [6,12,18,24,30,24,18,12,6],
    [8,16,24,32,40,32,24,16,8],
    [10,20,30,40,50,40,30,20,10],
    [10,20,30,40,50,40,30,20,10],
    [0,0,0,0,0,0,0,0,0],
  ],
  horse: [
    [4,8,16,12,4,12,16,8,4],
    [4,10,28,16,8,16,28,10,4],
    [12,14,16,20,18,20,16,14,12],
    [8,24,18,24,20,24,18,24,8],
    [6,16,14,18,16,18,14,16,6],
    [4,12,16,20,18,20,16,12,4],
    [2,6,8,12,10,12,8,6,2],
    [4,2,8,4,4,4,8,2,4],
    [0,2,4,4,2,4,4,2,0],
    [0,-4,0,0,0,0,0,-4,0],
  ],
  cannon: [
    [4,4,0,-6,-8,-6,0,4,4],
    [2,2,0,-4,-6,-4,0,2,2],
    [2,2,0,-2,-4,-2,0,2,2],
    [0,0,-2,4,6,4,-2,0,0],
    [0,0,0,2,4,2,0,0,0],
    [2,0,4,4,6,4,4,0,2],
    [0,0,0,0,0,0,0,0,0],
    [2,0,8,4,4,4,8,0,2],
    [2,2,0,4,6,4,0,2,2],
    [2,4,8,0,10,0,8,4,2],
  ],
  chariot: [
    [6,8,6,14,12,14,6,8,6],
    [6,10,8,14,14,14,8,10,6],
    [6,10,8,14,12,14,8,10,6],
    [12,16,14,20,20,20,14,16,12],
    [12,14,12,18,18,18,12,14,12],
    [12,16,14,20,20,20,14,16,12],
    [12,14,12,18,18,18,12,14,12],
    [12,16,14,20,20,20,14,16,12],
    [6,10,8,14,12,14,8,10,6],
    [6,8,6,14,12,14,6,8,6],
  ],
};

// 將/帥的位置價值（保護加成）
const KING_POSITION_VALUES = [
  [0,0,0,4,6,4,0,0,0],
  [0,0,0,8,12,8,0,0,0],
  [0,0,0,8,12,8,0,0,0],
];

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
  const [currentPlayer, setCurrentPlayer] = useState('red');
  const [difficulty, setDifficulty] = useState(2);
  const [history, setHistory] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const [gameStatus, setGameStatus] = useState('playing');

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

  // 檢查移動是否合法
  const isValidMove = useCallback((fromRow, fromCol, toRow, toCol, piece, boardState) => {
    if (!piece) return false;
    const pieceInfo = PIECES[piece];
    if (!pieceInfo) return false;
    
    const targetPiece = boardState[toRow][toCol];
    if (targetPiece && PIECES[targetPiece]?.color === pieceInfo.color) return false;
    
    const type = piece.split('_')[1];
    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    
    switch (type) {
      case 'king':
        if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
        if (pieceInfo.color === 'red') {
          if (toRow < 7 || toRow > 9 || toCol < 3 || toCol > 5) return false;
        } else {
          if (toRow < 0 || toRow > 2 || toCol < 3 || toCol > 5) return false;
        }
        return true;
        
      case 'advisor':
        if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;
        if (pieceInfo.color === 'red') {
          if (toRow < 7 || toRow > 9 || toCol < 3 || toCol > 5) return false;
        } else {
          if (toRow < 0 || toRow > 2 || toCol < 3 || toCol > 5) return false;
        }
        return true;
        
      case 'elephant':
        if (Math.abs(dr) !== 2 || Math.abs(dc) !== 2) return false;
        if (pieceInfo.color === 'red' && toRow < 5) return false;
        if (pieceInfo.color === 'black' && toRow > 4) return false;
        const eyeRow = fromRow + dr / 2;
        const eyeCol = fromCol + dc / 2;
        if (boardState[eyeRow][eyeCol]) return false;
        return true;
        
      case 'horse':
        if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2))) return false;
        let legRow, legCol;
        if (Math.abs(dr) === 2) {
          legRow = fromRow + dr / 2;
          legCol = fromCol;
        } else {
          legRow = fromRow;
          legCol = fromCol + dc / 2;
        }
        if (boardState[legRow][legCol]) return false;
        return true;
        
      case 'chariot':
        if (dr !== 0 && dc !== 0) return false;
        const steps = Math.abs(dr) || Math.abs(dc);
        const stepR = dr === 0 ? 0 : dr / steps;
        const stepC = dc === 0 ? 0 : dc / steps;
        for (let i = 1; i < steps; i++) {
          if (boardState[fromRow + i * stepR][fromCol + i * stepC]) return false;
        }
        return true;
        
      case 'cannon':
        if (dr !== 0 && dc !== 0) return false;
        const cSteps = Math.abs(dr) || Math.abs(dc);
        const cStepR = dr === 0 ? 0 : dr / cSteps;
        const cStepC = dc === 0 ? 0 : dc / cSteps;
        let obstacles = 0;
        for (let i = 1; i < cSteps; i++) {
          if (boardState[fromRow + i * cStepR][fromCol + i * cStepC]) obstacles++;
        }
        if (targetPiece) {
          return obstacles === 1;
        } else {
          return obstacles === 0;
        }
        
      case 'soldier':
        if (pieceInfo.color === 'red') {
          if (fromRow > 4) {
            return dr === -1 && dc === 0;
          } else {
            return (dr === -1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
          }
        } else {
          if (fromRow < 5) {
            return dr === 1 && dc === 0;
          } else {
            return (dr === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
          }
        }
        
      default:
        return false;
    }
  }, []);

  // 獲取所有合法移動
  const getAllMoves = useCallback((color, boardState) => {
    const moves = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = boardState[r][c];
        if (piece && PIECES[piece]?.color === color) {
          for (let tr = 0; tr < 10; tr++) {
            for (let tc = 0; tc < 9; tc++) {
              if (isValidMove(r, c, tr, tc, piece, boardState)) {
                moves.push({ 
                  from: { row: r, col: c }, 
                  to: { row: tr, col: tc }, 
                  piece,
                  captured: boardState[tr][tc]
                });
              }
            }
          }
        }
      }
    }
    return moves;
  }, [isValidMove]);

  // 尋找將的位置
  const findKing = useCallback((color, boardState) => {
    const kingPiece = color === 'red' ? 'r_king' : 'b_king';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (boardState[r][c] === kingPiece) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, []);

  // 檢查某位置是否被攻擊
  const isSquareAttacked = useCallback((row, col, byColor, boardState) => {
    const moves = getAllMoves(byColor, boardState);
    return moves.some(m => m.to.row === row && m.to.col === col);
  }, [getAllMoves]);

  // 檢查將是否被將軍
  const isKingInCheck = useCallback((color, boardState) => {
    const kingPos = findKing(color, boardState);
    if (!kingPos) return false;
    const opponent = color === 'red' ? 'black' : 'red';
    return isSquareAttacked(kingPos.row, kingPos.col, opponent, boardState);
  }, [findKing, isSquareAttacked]);

  // 評估棋盤價值（紅方正分，黑方負分）
  const evaluateBoard = useCallback((boardState) => {
    let score = 0;
    
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = boardState[r][c];
        if (piece) {
          const pieceInfo = PIECES[piece];
          let value = pieceInfo.value;
          
          const type = piece.split('_')[1];
          if (POSITION_VALUES[type]) {
            const posRow = pieceInfo.color === 'red' ? r : 9 - r;
            value += POSITION_VALUES[type][posRow][c];
          }
          
          score += pieceInfo.color === 'red' ? value : -value;
        }
      }
    }
    
    // 將軍威脅評估
    const blackKingPos = findKing('black', boardState);
    const redKingPos = findKing('red', boardState);
    
    // 黑將被威脅：紅方有優勢
    if (blackKingPos && isSquareAttacked(blackKingPos.row, blackKingPos.col, 'red', boardState)) {
      score += 500; // 將軍獎勵
    }
    
    // 紅帥被威脅：黑方有優勢
    if (redKingPos && isSquareAttacked(redKingPos.row, redKingPos.col, 'black', boardState)) {
      score -= 500;
    }
    
    // 保護將的加成（周圍有防守棋子）
    if (blackKingPos) {
      const palaceRowStart = 0;
      const palaceRowEnd = 2;
      const palaceColStart = 3;
      const palaceColEnd = 5;
      
      // 統計九宮內的防守棋子
      for (let r = palaceRowStart; r <= palaceRowEnd; r++) {
        for (let c = palaceColStart; c <= palaceColEnd; c++) {
          const piece = boardState[r][c];
          if (piece && PIECES[piece]?.color === 'black') {
            const type = piece.split('_')[1];
            if (type === 'advisor' || type === 'elephant') {
              score -= 30; // 黑方防守棋子加分
            }
          }
        }
      }
      
      // 將在中心位置更好
      const kingCol = blackKingPos.col;
      if (kingCol >= 3 && kingCol <= 5) {
        score -= 20;
      }
    }
    
    return score;
  }, [findKing, isSquareAttacked]);

  // Minimax + Alpha-Beta Pruning
  const minimax = useCallback((boardState, depth, alpha, beta, isMaximizing) => {
    if (depth === 0) {
      return evaluateBoard(boardState);
    }
    
    const color = isMaximizing ? 'black' : 'red';
    const moves = getAllMoves(color, boardState);
    
    if (moves.length === 0) {
      return isMaximizing ? -99999 : 99999;
    }
    
    // 檢查是否吃掉對方的將
    for (const move of moves) {
      if (move.captured && move.captured.includes('king')) {
        return isMaximizing ? 99999 : -99999;
      }
    }
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const newBoard = boardState.map(r => [...r]);
        newBoard[move.to.row][move.to.col] = move.piece;
        newBoard[move.from.row][move.from.col] = null;
        
        // 移動後黑將被吃 → 極大懲罰
        if (!findKing('black', newBoard)) {
          continue;
        }
        
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const newBoard = boardState.map(r => [...r]);
        newBoard[move.to.row][move.to.col] = move.piece;
        newBoard[move.from.row][move.from.col] = null;
        
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [evaluateBoard, getAllMoves, findKing]);

  // AI 移動（使用 Minimax）
  const makeAiMove = useCallback((currentBoard) => {
    const moves = getAllMoves('black', currentBoard);
    
    if (moves.length === 0) {
      setIsAiThinking(false);
      return;
    }
    
    // 根據難度設定搜尋深度
    const depthMap = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4 };
    const searchDepth = depthMap[difficulty] || 3;
    
    let scoredMoves = [];
    for (const move of moves) {
      const newBoard = currentBoard.map(r => [...r]);
      newBoard[move.to.row][move.to.col] = move.piece;
      newBoard[move.from.row][move.from.col] = null;
      
      // 移動後黑將被吃 → 跳過此移動
      if (!findKing('black', newBoard)) {
        continue;
      }
      
      // 移動後黑將被將軍 → 大幅扣分
      let checkPenalty = 0;
      if (isKingInCheck('black', newBoard)) {
        checkPenalty = -2000;
      }
      
      let score = minimax(newBoard, searchDepth - 1, -Infinity, Infinity, false);
      score += checkPenalty;
      
      // 保護將的移動加分
      const blackKingPos = findKing('black', currentBoard);
      if (blackKingPos) {
        // 如果移動後將更安全
        const wasAttacked = isSquareAttacked(blackKingPos.row, blackKingPos.col, 'red', currentBoard);
        const newKingPos = move.piece === 'b_king' ? move.to : blackKingPos;
        const isStillAttacked = isSquareAttacked(newKingPos.row, newKingPos.col, 'red', newBoard);
        
        if (wasAttacked && !isStillAttacked) {
          score += 800; // 解除將軍獎勵
        }
        
        // 堵塞攻擊路線
        if (move.piece !== 'b_king' && wasAttacked) {
          score += 500;
        }
      }
      
      // 難度越低，隨機性越高
      const randomFactor = Math.max(0, 0.3 - difficulty * 0.06);
      if (randomFactor > 0) {
        score += (Math.random() - 0.5) * randomFactor * 200;
      }
      
      scoredMoves.push({ ...move, score });
    }
    
    if (scoredMoves.length === 0) {
      setIsAiThinking(false);
      return;
    }
    
    // 排序並選擇最佳移動
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // 根據難度決定是否選擇次佳移動
    let selectedMove;
    if (difficulty <= 2 && scoredMoves.length > 1 && Math.random() < 0.3) {
      selectedMove = scoredMoves[Math.floor(Math.random() * Math.min(3, scoredMoves.length))];
    } else {
      selectedMove = scoredMoves[0];
    }
    
    // 執行移動
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[selectedMove.to.row][selectedMove.to.col] = selectedMove.piece;
    newBoard[selectedMove.from.row][selectedMove.from.col] = null;
    setBoard(newBoard);
    
    // 檢查是否吃掉將/帥
    if (selectedMove.captured && selectedMove.captured.includes('king')) {
      setGameStatus('black_win');
      setIsAiThinking(false);
      return;
    }
    
    setCurrentPlayer('red');
    setIsAiThinking(false);
  }, [difficulty, getAllMoves, minimax, findKing, isKingInCheck, isSquareAttacked]);

  // 處理棋子點擊
  const handleCellClick = (row, col) => {
    if (isAiThinking || gameStatus !== 'playing') return;
    
    const piece = board[row][col];
    
    if (selectedPiece) {
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col, selectedPiece.piece, board)) {
        const newBoard = board.map(r => [...r]);
        const targetPiece = newBoard[row][col];
        newBoard[row][col] = selectedPiece.piece;
        newBoard[selectedPiece.row][selectedPiece.col] = null;
        setBoard(newBoard);
        setHistory(prev => [...prev, {
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col },
          piece: selectedPiece.piece
        }]);
        setSelectedPiece(null);
        
        if (targetPiece && targetPiece.includes('king')) {
          setGameStatus('red_win');
          return;
        }
        
        setCurrentPlayer('black');
        setIsAiThinking(true);
        setTimeout(() => makeAiMove(newBoard), 500);
      } else {
        if (piece && PIECES[piece]?.color === currentPlayer) {
          setSelectedPiece({ row, col, piece });
        } else {
          setSelectedPiece(null);
        }
      }
    } else {
      if (piece && PIECES[piece]?.color === currentPlayer) {
        setSelectedPiece({ row, col, piece });
      }
    }
  };

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
            {gameStatus !== 'playing' 
              ? `🏆 ${gameStatus === 'red_win' ? '紅方獲勝！' : '黑方獲勝'}`
              : (isAiThinking 
                ? '🤔 AI 思考中...'
                : `⏳ ${currentPlayer === 'red' ? '紅方 (你)' : '黑方 (AI)'} 回合`)
            }
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            步數：{history.length}
          </div>
        </div>

        {/* 難度 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            AI 難度
          </div>
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
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
            {difficulty === 1 ? '簡單（深度 2）' : 
             difficulty === 2 ? '普通（深度 3）' : 
             difficulty === 3 ? '中等（深度 3）' :
             difficulty === 4 ? '困難（深度 4）' :
             '大師（深度 4）'}
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
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>移動記錄</div>
          {history.slice(-8).map((h, i) => (
            <div key={i} style={{ 
              fontSize: '11px', 
              color: PIECES[h.piece]?.color === 'red' ? '#fca5a5' : '#94a3b8',
              marginTop: '4px',
            }}>
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
        overflow: 'auto',
      }}>
        <div style={{
          backgroundColor: '#f0d9b5',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
          }}>
            {board.map((row, ri) => 
              row.map((_, ci) => renderCell(ri, ci))
            )}
          </div>
          
          {/* 楚河漢界 */}
          <div style={{
            textAlign: 'center',
            padding: '10px',
            fontSize: isTablet ? '18px' : '14px',
            color: '#8b4513',
            fontWeight: 'bold',
          }}>
            楚河 — 漢界
          </div>
        </div>
      </div>

      {/* 遊戲結束彈窗 */}
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
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              {gameStatus === 'red_win' ? '🏆' : '⚔️'}
            </div>
            <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '10px' }}>
              {gameStatus === 'red_win' ? '🎉 紅方獲勝！' : '黑方獲勝'}
            </h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '20px' }}>
              總步數：{history.length}
            </p>
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