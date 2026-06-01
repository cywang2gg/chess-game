import React, { useState, useEffect, useCallback } from 'react';

// 數獨難度設定
const DIFFICULTY_LEVELS = {
  easy: { name: '簡單', holes: 30, color: '#10b981' },
  medium: { name: '中等', holes: 40, color: '#f59e0b' },
  hard: { name: '困難', holes: 50, color: '#ef4444' },
  expert: { name: '專家', holes: 55, color: '#8b5cf6' }
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

// 生成完整的數獨解
const generateCompleteSudoku = () => {
  const board = Array(9).fill(null).map(() => Array(9).fill(0));
  
  const isValid = (board, row, col, num) => {
    // 檢查行
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }
    // 檢查列
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }
    // 檢查 3x3 宮格
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol] === num) return false;
      }
    }
    return true;
  };
  
  const solve = (board) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const numbers = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  
  solve(board);
  return board;
};

// 從完整解生成謎題
const generatePuzzle = (difficulty) => {
  const solution = generateCompleteSudoku();
  const puzzle = solution.map(row => [...row]);
  const holes = DIFFICULTY_LEVELS[difficulty].holes;
  
  let removed = 0;
  while (removed < holes) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }
  
  return { puzzle, solution };
};

function Sudoku() {
  const [deviceType] = useState(getDeviceType());
  const [difficulty, setDifficulty] = useState('easy');
  const [puzzle, setPuzzle] = useState([]);
  const [solution, setSolution] = useState([]);
  const [userBoard, setUserBoard] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [hints, setHints] = useState(3);
  const [timer, setTimer] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isTablet = deviceType.isTablet;

  // 開始新遊戲
  const startNewGame = useCallback(() => {
    const { puzzle: newPuzzle, solution: newSolution } = generatePuzzle(difficulty);
    setPuzzle(newPuzzle);
    setSolution(newSolution);
    setUserBoard(newPuzzle.map(row => [...row]));
    setSelectedCell(null);
    setErrors(new Set());
    setHints(3);
    setTimer(0);
    setIsComplete(false);
    setIsPlaying(true);
  }, [difficulty]);

  // 計時器
  useEffect(() => {
    let interval;
    if (isPlaying && !isComplete) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isComplete]);

  // 檢查是否完成
  useEffect(() => {
    if (!isPlaying || isComplete) return;
    
    const isCompleteBoard = userBoard.every((row, ri) =>
      row.every((cell, ci) => cell === solution[ri][ci])
    );
    
    if (isCompleteBoard) {
      setIsComplete(true);
    }
  }, [userBoard, solution, isPlaying, isComplete]);

  // 處理格子點擊
  const handleCellClick = (row, col) => {
    if (puzzle[row][col] !== 0) return; // 原始數字不能修改
    setSelectedCell({ row, col });
  };

  // 輸入數字
  const handleNumberInput = (num) => {
    if (!selectedCell || puzzle[selectedCell.row][selectedCell.col] !== 0) return;
    
    const newUserBoard = userBoard.map(row => [...row]);
    newUserBoard[selectedCell.row][selectedCell.col] = num;
    setUserBoard(newUserBoard);
    
    // 檢查是否正確
    const key = `${selectedCell.row}-${selectedCell.col}`;
    const newErrors = new Set(errors);
    
    if (num !== solution[selectedCell.row][selectedCell.col]) {
      newErrors.add(key);
    } else {
      newErrors.delete(key);
    }
    
    setErrors(newErrors);
  };

  // 清除數字
  const handleClear = () => {
    if (!selectedCell || puzzle[selectedCell.row][selectedCell.col] !== 0) return;
    
    const newUserBoard = userBoard.map(row => [...row]);
    newUserBoard[selectedCell.row][selectedCell.col] = 0;
    setUserBoard(newUserBoard);
    
    const key = `${selectedCell.row}-${selectedCell.col}`;
    const newErrors = new Set(errors);
    newErrors.delete(key);
    setErrors(newErrors);
  };

  // 提示
  const handleHint = () => {
    if (hints <= 0 || !selectedCell) return;
    
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== 0) return;
    
    const newUserBoard = userBoard.map(r => [...r]);
    newUserBoard[row][col] = solution[row][col];
    setUserBoard(newUserBoard);
    setHints(hints - 1);
    
    const key = `${row}-${col}`;
    const newErrors = new Set(errors);
    newErrors.delete(key);
    setErrors(newErrors);
  };

  // 格式化時間
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 渲染格子
  const renderCell = (row, col) => {
    const value = userBoard[row][col];
    const isOriginal = puzzle[row][col] !== 0;
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isError = errors.has(`${row}-${col}`);
    
    // 3x3 宮格邊框
    const borderRight = (col === 2 || col === 5) ? '2px solid #1e293b' : '1px solid #cbd5e1';
    const borderBottom = (row === 2 || row === 5) ? '2px solid #1e293b' : '1px solid #cbd5e1';
    
    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        style={{
          width: isTablet ? '48px' : '36px',
          height: isTablet ? '48px' : '36px',
          backgroundColor: isSelected ? '#dbeafe' : (isOriginal ? '#f1f5f9' : '#fff'),
          borderRight,
          borderBottom,
          borderTop: row === 0 ? '2px solid #1e293b' : '1px solid #cbd5e1',
          borderLeft: col === 0 ? '2px solid #1e293b' : '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: isTablet ? '24px' : '18px',
          fontWeight: isOriginal ? 'bold' : 'normal',
          color: isError ? '#ef4444' : (isOriginal ? '#1e293b' : '#3b82f6'),
          cursor: isOriginal ? 'default' : 'pointer',
          transition: 'background-color 0.2s',
        }}
      >
        {value || ''}
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
        <h1 style={{ fontSize: isTablet ? '28px' : '22px', color: '#10b981', marginBottom: '15px' }}>
          9 數獨 Sudoku
        </h1>
        
        {/* 計時器 */}
        {isPlaying && (
          <div style={{
            backgroundColor: '#334155',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
              {formatTime(timer)}
            </div>
          </div>
        )}

        {/* 難度選擇 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>難度</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {Object.entries(DIFFICULTY_LEVELS).map(([key, { name, color }]) => (
              <button
                key={key}
                onClick={() => {
                  setDifficulty(key);
                  if (isPlaying) startNewGame();
                }}
                style={{
                  padding: isTablet ? '14px' : '10px',
                  backgroundColor: difficulty === key ? color : '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isTablet ? '16px' : '14px',
                  cursor: 'pointer',
                  minHeight: isTablet ? '44px' : 'auto',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 新遊戲按鈕 */}
        <button
          onClick={startNewGame}
          style={{
            width: '100%',
            padding: isTablet ? '16px' : '12px',
            backgroundColor: '#10b981',
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

        {/* 提示 */}
        {isPlaying && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#334155',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>💡 提示 ({hints}次)</span>
            <button
              onClick={handleHint}
              disabled={hints <= 0}
              style={{
                padding: '8px 16px',
                backgroundColor: hints > 0 ? '#f59e0b' : '#475569',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: hints > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              使用
            </button>
          </div>
        )}

        {/* 數字鍵盤 */}
        {isPlaying && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {[1,2,3,4,5,6,7,8,9].map(num => (
              <button
                key={num}
                onClick={() => handleNumberInput(num)}
                style={{
                  padding: isTablet ? '16px' : '12px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: isTablet ? '24px' : '20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minHeight: isTablet ? '56px' : '44px',
                }}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              style={{
                gridColumn: 'span 3',
                padding: isTablet ? '14px' : '10px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: isTablet ? '18px' : '16px',
                cursor: 'pointer',
                minHeight: isTablet ? '44px' : 'auto',
              }}
            >
              清除
            </button>
          </div>
        )}
      </div>

      {/* 棋盤區 */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}>
        {!isPlaying ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>9️⃣</div>
            <div style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '20px' }}>
              選擇難度後開始遊戲
            </div>
            <button
              onClick={startNewGame}
              style={{
                padding: '16px 40px',
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              開始遊戲
            </button>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#fff',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gridTemplateRows: 'repeat(9, 1fr)',
            }}>
              {userBoard.map((row, ri) => 
                row.map((_, ci) => renderCell(ri, ci))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 完成彈窗 */}
      {isComplete && (
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
            border: '2px solid #10b981',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ fontSize: '28px', color: '#10b981', marginBottom: '10px' }}>
              恭喜完成！
            </h2>
            <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '20px' }}>
              用時：{formatTime(timer)}
            </p>
            <button
              onClick={startNewGame}
              style={{
                padding: '12px 30px',
                backgroundColor: '#10b981',
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

export default Sudoku;