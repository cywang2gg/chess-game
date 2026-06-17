import React, { useState, useEffect, useCallback, useRef } from 'react';

// 棋盤大小選項
const BOARD_SIZES = {
  small: { size: 13, name: '13×13' },
  medium: { size: 15, name: '15×15' },
  large: { size: 19, name: '19×19' },
};

// 第四階段：Zobrist Hash 置換表
// 預生成隨機值（每個位置每個顏色）
const generateZobristTable = (maxSize) => {
  const table = {};
  for (let r = 0; r < maxSize; r++) {
    for (let c = 0; c < maxSize; c++) {
      table[`${r},${c},black`] = Math.floor(Math.random() * 2147483647);
      table[`${r},${c},white`] = Math.floor(Math.random() * 2147483647);
    }
  }
  return table;
};

const ZOBRIST_TABLE = generateZobristTable(19); // 最大棋盤 19x19

// 計算棋盤 Hash 值
const computeBoardHash = (boardState, size) => {
  let hash = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = boardState[r][c];
      if (cell !== null) {
        hash ^= ZOBRIST_TABLE[`${r},${c},${cell}`];
      }
    }
  }
  return hash;
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

  // ========================================
  // 優化版：棋型檢測函數
  // ========================================

  // 評分矩陣（基於專業五子棋引擎）
  const PATTERN_SCORES = {
    FIVE: 10000000,           // 連五 - 立即勝利
    LIVE_FOUR: 1000000,       // 活四 - 必勝
    RUSH_FOUR: 100000,        // 沖四 - 必須防守
    LIVE_THREE: 50000,        // 活三 - 關鍵威脅
    DEAD_THREE: 10000,        // 眠三
    LIVE_TWO: 5000,           // 活二
    DEAD_TWO: 1000,           // 眠二
    LIVE_ONE: 500,            // 活一
    // 必勝組合
    DOUBLE_LIVE_THREE: 800000,  // 雙活三
    LIVE_FOUR_RUSH_FOUR: 900000, // 活四+沖四
    LIVE_THREE_RUSH_FOUR: 900000, // 活三+沖四
    DOUBLE_RUSH_FOUR: 200000,   // 雙沖四
  };

  // 完整棋型分析（修正版）
  // 返回：count（不含中心的連子數）、openEnds（開口端數）、pattern（棋型名稱）
  const analyzePattern = useCallback((boardState, row, col, dr, dc, player) => {
    let count = 0;
    let openEnds = 0;
    let forwardBlocked = false;
    let backwardBlocked = false;

    // 正向搜索
    for (let i = 1; i <= 5; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) {
        forwardBlocked = true;
        break;
      }
      if (boardState[r][c] === player) {
        count++;
      } else if (boardState[r][c] === null) {
        openEnds++;
        break;
      } else {
        forwardBlocked = true;
        break;
      }
    }

    // 反向搜索
    for (let i = 1; i <= 5; i++) {
      const r = row - i * dr;
      const c = col - i * dc;
      if (r < 0 || r >= size || c < 0 || c >= size) {
        backwardBlocked = true;
        break;
      }
      if (boardState[r][c] === player) {
        count++;
      } else if (boardState[r][c] === null) {
        openEnds++;
        break;
      } else {
        backwardBlocked = true;
        break;
      }
    }

    // 計算總連子數（包含中心位置）
    const totalStones = count + 1;

    return { count, openEnds, totalStones, forwardBlocked, backwardBlocked };
  }, [size]);

  // 舊版 countLine 保留以兼容（但標記為棄用）
  const countLine = useCallback((boardState, row, col, dr, dc, player) => {
    return analyzePattern(boardState, row, col, dr, dc, player);
  }, [analyzePattern]);

  // ========================================
  // 優化版：雙威脅檢測（正確版）
  // ========================================
  const checkDoubleThreats = useCallback((boardState, row, col, player) => {
    let liveThrees = 0;
    let rushFours = 0;
    let liveFours = 0;

    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
      const pattern = analyzePattern(boardState, row, col, dr, dc, player);
      const total = pattern.totalStones;

      // 活四：4連 + 2開口（必勝！）
      if (total >= 4 && pattern.openEnds === 2) {
        liveFours++;
      }
      // 沖四：4連 + 1開口（必須防守）
      else if (total >= 4 && pattern.openEnds === 1) {
        rushFours++;
      }
      // 活三：3連 + 2開口（關鍵威脅）
      else if (total >= 3 && pattern.openEnds === 2) {
        liveThrees++;
      }
    }

    // 必勝組合評分
    if (liveFours >= 1) return PATTERN_SCORES.LIVE_FOUR;           // 活四 = 必勝
    if (rushFours >= 2) return PATTERN_SCORES.DOUBLE_RUSH_FOUR;    // 雙沖四
    if (liveThrees >= 1 && rushFours >= 1) return PATTERN_SCORES.LIVE_THREE_RUSH_FOUR; // 三四組合
    if (liveThrees >= 2) return PATTERN_SCORES.DOUBLE_LIVE_THREE;  // 雙活三

    return 0;
  }, [analyzePattern]);

  // ========================================
  // 優化版：位置評估函數（使用最佳評分表）
  // ========================================
  const evaluatePosition = useCallback((boardState, row, col, player) => {
    if (boardState[row][col] !== null) return 0;

    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    // 1. 立即獲勝檢查（最高優先級）
    const testBoard1 = boardState.map(r => [...r]);
    testBoard1[row][col] = player;
    if (checkWin(testBoard1, row, col, player)) {
      return PATTERN_SCORES.FIVE;
    }

    // 2. 阻擋對手獲勝
    const testBoard2 = boardState.map(r => [...r]);
    testBoard2[row][col] = opponent;
    if (checkWin(testBoard2, row, col, opponent)) {
      return PATTERN_SCORES.FIVE * 0.95;
    }

    // 3. 雙威脅檢測（必勝組合）
    const myDoubleThreat = checkDoubleThreats(boardState, row, col, player);
    const oppDoubleThreat = checkDoubleThreats(boardState, row, col, opponent);
    score += myDoubleThreat;
    score += oppDoubleThreat * 0.98; // 對手的威脅必須優先防守

    // 4. 各方向棋型評分（使用最佳評分表）
    let myLiveThrees = 0, myRushFours = 0;
    let oppLiveThrees = 0, oppRushFours = 0;

    for (const [dr, dc] of directions) {
      // AI 棋型評分
      const myPattern = analyzePattern(boardState, row, col, dr, dc, player);
      const myTotal = myPattern.totalStones;

      if (myTotal >= 5) {
        score += PATTERN_SCORES.FIVE;
      } else if (myTotal === 4 && myPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_FOUR;
        myRushFours++; // 也計入四連
      } else if (myTotal === 4 && myPattern.openEnds === 1) {
        score += PATTERN_SCORES.RUSH_FOUR;
        myRushFours++;
      } else if (myTotal === 3 && myPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_THREE;
        myLiveThrees++;
      } else if (myTotal === 3 && myPattern.openEnds === 1) {
        score += PATTERN_SCORES.DEAD_THREE;
      } else if (myTotal === 2 && myPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_TWO;
      } else if (myTotal === 2 && myPattern.openEnds === 1) {
        score += PATTERN_SCORES.DEAD_TWO;
      } else if (myTotal === 1 && myPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_ONE;
      }

      // 對手棋型評分（防守優先）
      const oppPattern = analyzePattern(boardState, row, col, dr, dc, opponent);
      const oppTotal = oppPattern.totalStones;

      if (oppTotal >= 5) {
        score += PATTERN_SCORES.FIVE * 0.95;
      } else if (oppTotal === 4 && oppPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_FOUR * 0.98; // 必須防守！
      } else if (oppTotal === 4 && oppPattern.openEnds === 1) {
        score += PATTERN_SCORES.RUSH_FOUR * 0.98;
        oppRushFours++;
      } else if (oppTotal === 3 && oppPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_THREE * 0.95; // 必須防守活三！
        oppLiveThrees++;
      } else if (oppTotal === 3 && oppPattern.openEnds === 1) {
        score += PATTERN_SCORES.DEAD_THREE * 0.9;
      } else if (oppTotal === 2 && oppPattern.openEnds === 2) {
        score += PATTERN_SCORES.LIVE_TWO * 0.9;
      } else if (oppTotal === 2 && oppPattern.openEnds === 1) {
        score += PATTERN_SCORES.DEAD_TWO * 0.9;
      }
    }

    // 5. 位置加權（中心優先）
    const center = Math.floor(size / 2);
    const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
    score += Math.max(0, 100 - distFromCenter * 5);

    return score;
  }, [size, analyzePattern, checkDoubleThreats, checkWin]);

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

  // ========================================
  // 第二階段：Alpha-Beta 搜索 + 速度優化
  // ========================================

  // 第四階段：置換表（使用 useRef 避免每次重渲染）
  const transpositionTableRef = useRef(new Map());

  // Alpha-Beta 搜索主函數（帶置換表）
  const alphaBeta = useCallback((boardState, depth, alpha, beta, isMaximizing, player) => {
    // 第四階段：置換表查詢
    const hash = computeBoardHash(boardState, size);
    const transpositionTable = transpositionTableRef.current;
    const cached = transpositionTable.get(hash);
    
    if (cached && cached.depth >= depth) {
      // 如果已有相同或更深度的結果，直接返回
      if (cached.flag === 'exact') return cached.value;
      if (cached.flag === 'lower' && cached.value >= beta) return cached.value;
      if (cached.flag === 'upper' && cached.value <= alpha) return cached.value;
    }

    // 終止條件
    if (depth === 0) {
      return evaluateBoard(boardState, 'white');
    }

    const candidates = getCandidatesOptimized(boardState);
    if (candidates.length === 0) {
      return evaluateBoard(boardState, 'white');
    }

    // 優先排序候選位置（提升剪枝效率）
    const scoredCandidates = candidates
      .map(([r, c]) => ({ row: r, col: c, score: evaluatePosition(boardState, r, c, player) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12); // 第四階段：減少到 12 名（提升速度）

    let bestValue = isMaximizing ? -Infinity : Infinity;
    
    if (isMaximizing) {
      for (const { row, col } of scoredCandidates) {
        const newBoard = boardState.map(r => [...r]);
        newBoard[row][col] = player;
        
        // 檢查是否獲勝
        if (checkWin(newBoard, row, col, player)) {
          transpositionTable.set(hash, { depth, value: 1000000 + depth * 1000, flag: 'exact' });
          return 1000000 + depth * 1000; // 越快贏越好
        }
        
        const evalScore = alphaBeta(
          newBoard, 
          depth - 1, 
          alpha, 
          beta, 
          false, 
          player === 'white' ? 'black' : 'white'
        );
        bestValue = Math.max(bestValue, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Beta 剪枝
      }
    } else {
      for (const { row, col } of scoredCandidates) {
        const newBoard = boardState.map(r => [...r]);
        newBoard[row][col] = player;
        
        // 檢查是否獲勝
        if (checkWin(newBoard, row, col, player)) {
          transpositionTable.set(hash, { depth, value: -1000000 - depth * 1000, flag: 'exact' });
          return -1000000 - depth * 1000; // 越快輸越糟
        }
        
        const evalScore = alphaBeta(
          newBoard, 
          depth - 1, 
          alpha, 
          beta, 
          true, 
          player === 'white' ? 'black' : 'white'
        );
        bestValue = Math.min(bestValue, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha 剪枝
      }
    }

    // 第四階段：存入置換表
    let flag = 'exact';
    if (bestValue <= alpha) flag = 'upper';
    else if (bestValue >= beta) flag = 'lower';
    
    // 清理過大的置換表（避免記憶體爆炸）
    if (transpositionTable.size > 50000) {
      transpositionTable.clear();
    }
    
    transpositionTable.set(hash, { depth, value: bestValue, flag });
    
    return bestValue;
  }, [checkWin, getCandidatesOptimized, evaluatePosition, size]);

  // 整體棋盤評估（靜態評估函數）
  const evaluateBoard = useCallback((boardState, aiPlayer) => {
    let totalScore = 0;
    const human = aiPlayer === 'white' ? 'black' : 'white';
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardState[r][c] === null) {
          // AI 的進攻分數
          totalScore += evaluatePosition(boardState, r, c, aiPlayer) * 0.1;
          // 人類的威脅分數（防守）
          totalScore -= evaluatePosition(boardState, r, c, human) * 0.095;
        }
      }
    }
    
    return totalScore;
  }, [size, evaluatePosition]);

  // 第三階段：優化候選位置生成（範圍限制）
  const getCandidatesOptimized = useCallback((boardState) => {
    // 找出所有已下棋子的範圍
    let minR = size, maxR = 0, minC = size, maxC = 0;
    let hasStones = false;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardState[r][c] !== null) {
          hasStones = true;
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
    
    if (!hasStones) {
      // 第一手下中心
      const center = Math.floor(size / 2);
      return [[center, center]];
    }
    
    // 擴展範圍 (+2 步)
    minR = Math.max(0, minR - 2);
    maxR = Math.min(size - 1, maxR + 2);
    minC = Math.max(0, minC - 2);
    maxC = Math.min(size - 1, maxC + 2);
    
    const candidates = [];
    const checked = new Set();
    
    // 只在範圍內搜索空位
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (boardState[r][c] === null) {
          // 檢查周圍是否有棋子（避免孤立的空位）
          let hasNeighbor = false;
          for (let dr = -1; dr <= 1 && !hasNeighbor; dr++) {
            for (let dc = -1; dc <= 1 && !hasNeighbor; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && boardState[nr][nc] !== null) {
                hasNeighbor = true;
              }
            }
          }
          if (hasNeighbor) {
            candidates.push([r, c]);
          }
        }
      }
    }
    
    return candidates;
  }, [size]);

  // ========================================
  // 第四階段：VCF (Victory by Continuous Four) 檢測
  // ========================================

  // 尋找所有能形成四連的位置
  const findFourCreatingMoves = useCallback((boardState, player) => {
    const moves = [];
    const candidates = getCandidatesOptimized(boardState);

    for (const [r, c] of candidates) {
      const testBoard = boardState.map(row => [...row]);
      testBoard[r][c] = player;

      // 檢查是否形成四連
      const pattern = analyzePattern(testBoard, r, c, 0, 1, player);
      if (pattern.totalStones >= 4) {
        moves.push({ row: r, col: c, pattern });
        continue;
      }
      const pattern2 = analyzePattern(testBoard, r, c, 1, 0, player);
      if (pattern2.totalStones >= 4) {
        moves.push({ row: r, col: c, pattern: pattern2 });
        continue;
      }
      const pattern3 = analyzePattern(testBoard, r, c, 1, 1, player);
      if (pattern3.totalStones >= 4) {
        moves.push({ row: r, col: c, pattern: pattern3 });
        continue;
      }
      const pattern4 = analyzePattern(testBoard, r, c, 1, -1, player);
      if (pattern4.totalStones >= 4) {
        moves.push({ row: r, col: c, pattern: pattern4 });
      }
    }

    return moves;
  }, [analyzePattern, getCandidatesOptimized]);

  // VCF 搜索：尋找連續沖四必勝序列
  const findVCF = useCallback((boardState, player, depth = 8, memo = new Map()) => {
    if (depth <= 0) return null;

    const boardKey = JSON.stringify(boardState);
    if (memo.has(boardKey)) return memo.get(boardKey);

    const opponent = player === 'black' ? 'white' : 'black';

    // 找所有能形成四連的位置
    const fourMoves = findFourCreatingMoves(boardState, player);

    for (const { row, col } of fourMoves) {
      const testBoard = boardState.map(row => [...row]);
      testBoard[row][col] = player;

      // 檢查是否獲勝（五連）
      if (checkWin(testBoard, row, col, player)) {
        memo.set(boardKey, [[row, col]]);
        return [[row, col]];
      }

      // 檢查是否形成活四（必勝）
      const threatScore = checkDoubleThreats(testBoard, row, col, player);
      if (threatScore >= PATTERN_SCORES.LIVE_FOUR) {
        memo.set(boardKey, [[row, col]]);
        return [[row, col]];
      }

      // 找對手必須防守的位置
      const blockPositions = [];
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i <= 4; i++) {
          const r = row + i * dr, c = col + i * dc;
          if (r >= 0 && r < size && c >= 0 && c < size && testBoard[r][c] === player) count++;
          else break;
        }
        for (let i = 1; i <= 4; i++) {
          const r = row - i * dr, c = col - i * dc;
          if (r >= 0 && r < size && c >= 0 && c < size && testBoard[r][c] === player) count++;
          else break;
        }

        if (count >= 4) {
          // 找到四連，找防守點
          for (let i = -4; i <= 4; i++) {
            const r = row + i * dr, c = col + i * dc;
            if (r >= 0 && r < size && c >= 0 && c < size && testBoard[r][c] === null) {
              const blockTest = testBoard.map(row => [...row]);
              blockTest[r][c] = opponent;
              if (!checkWin(blockTest, r, c, player)) {
                blockPositions.push([r, c]);
              }
            }
          }
        }
      }

      // 如果對手需要多個防守點 = 必勝
      if (blockPositions.length > 2) {
        memo.set(boardKey, [[row, col]]);
        return [[row, col]];
      }

      // 嘗試對手的每個防守
      if (blockPositions.length === 1) {
        const [br, bc] = blockPositions[0];
        const afterBlock = testBoard.map(row => [...row]);
        afterBlock[br][bc] = opponent;

        // 繼續 VCF 搜索
        const continuation = findVCF(afterBlock, player, depth - 1, memo);
        if (continuation) {
          const result = [[row, col], ...continuation];
          memo.set(boardKey, result);
          return result;
        }
      }
    }

    memo.set(boardKey, null);
    return null;
  }, [findFourCreatingMoves, checkWin, checkDoubleThreats, size]);

  // ========================================
  // AI 移動（優化版：預搜索威脅檢測 + VCF）
  // ========================================
  const makeAiMove = useCallback((currentBoard) => {
    const startTime = Date.now();

    // 根據難度設定搜索深度
    let searchDepth = 2;
    if (difficulty === 5) searchDepth = 4;
    else if (difficulty === 4) searchDepth = 3;
    else if (difficulty === 3) searchDepth = 2;
    else searchDepth = 1;

    const candidates = getCandidatesOptimized(currentBoard);
    if (candidates.length === 0) {
      const center = Math.floor(size / 2);
      candidates.push([center, center]);
    }

    // ========================================
    // 預搜索威脅檢測（必防威脅優先處理）
    // ========================================

    // 1. 檢查 AI 是否有立即獲勝
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'white';
      if (checkWin(testBoard, r, c, 'white')) {
        console.log('AI: 立即獲勝！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 2. 檢查對手是否有立即獲勝（必須防守）
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'black';
      if (checkWin(testBoard, r, c, 'black')) {
        console.log('AI: 防守五連！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 3. 檢查 AI 是否能形成活四（必勝）
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'white';
      const threatScore = checkDoubleThreats(testBoard, r, c, 'white');
      if (threatScore >= PATTERN_SCORES.LIVE_FOUR) {
        console.log('AI: 形成活四必勝！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 4. 檢查對手是否能形成活四（必須防守）
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'black';
      const threatScore = checkDoubleThreats(testBoard, r, c, 'black');
      if (threatScore >= PATTERN_SCORES.LIVE_FOUR) {
        console.log('AI: 防守對手活四！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 5. 檢查 AI 是否能形成雙活三或三四組合（必勝）
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'white';
      const threatScore = checkDoubleThreats(testBoard, r, c, 'white');
      if (threatScore >= PATTERN_SCORES.DOUBLE_LIVE_THREE) {
        console.log('AI: 形成雙活三/三四組合！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 6. 檢查對手是否能形成雙活三或三四組合（必須防守）
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'black';
      const threatScore = checkDoubleThreats(testBoard, r, c, 'black');
      if (threatScore >= PATTERN_SCORES.DOUBLE_LIVE_THREE) {
        console.log('AI: 防守對手雙活三！');
        executeMove(currentBoard, r, c, startTime);
        return;
      }
    }

    // 7. 高難度：嘗試 VCF 搜索
    if (difficulty >= 4) {
      const vcfSequence = findVCF(currentBoard, 'white', 6);
      if (vcfSequence && vcfSequence.length > 0) {
        console.log('AI: 找到 VCF 必勝序列！');
        executeMove(currentBoard, vcfSequence[0][0], vcfSequence[0][1], startTime);
        return;
      }
    }

    // 8. 檢查對手的活三（防守優先）
    let bestDefensiveMove = null;
    let bestDefensiveScore = 0;

    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'black';

      // 檢查是否形成活三
      const pattern1 = analyzePattern(testBoard, r, c, 0, 1, 'black');
      const pattern2 = analyzePattern(testBoard, r, c, 1, 0, 'black');
      const pattern3 = analyzePattern(testBoard, r, c, 1, 1, 'black');
      const pattern4 = analyzePattern(testBoard, r, c, 1, -1, 'black');

      const liveThrees = [pattern1, pattern2, pattern3, pattern4].filter(
        p => p.totalStones >= 3 && p.openEnds === 2
      ).length;

      if (liveThrees >= 1) {
        const score = evaluatePosition(currentBoard, r, c, 'white');
        if (score > bestDefensiveScore) {
          bestDefensiveScore = score;
          bestDefensiveMove = [r, c];
        }
      }
    }

    // ========================================
    // Alpha-Beta 搜索
    // ========================================

    // 評估所有候選位置
    const scoredCandidates = [];
    for (const [r, c] of candidates) {
      const testBoard = currentBoard.map(row => [...row]);
      testBoard[r][c] = 'white';

      let score;
      if (searchDepth > 1) {
        // 使用 Alpha-Beta 搜索
        score = alphaBeta(testBoard, searchDepth - 1, -Infinity, Infinity, false, 'black');
      } else {
        // 深度 1：直接評估
        score = evaluatePosition(currentBoard, r, c, 'white');
      }

      scoredCandidates.push({ row: r, col: c, score });
    }

    // 排序
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 如果有防守活三的位置，給予額外權重
    if (bestDefensiveMove && difficulty >= 3) {
      const defIdx = scoredCandidates.findIndex(m => m.row === bestDefensiveMove[0] && m.col === bestDefensiveMove[1]);
      if (defIdx > 0) {
        // 將防守位置提升到前幾名
        const defMove = scoredCandidates.splice(defIdx, 1)[0];
        defMove.score = Math.max(defMove.score, scoredCandidates[0].score * 0.95);
        scoredCandidates.unshift(defMove);
      }
    }

    // 根據難度選擇
    let bestMove;
    if (difficulty === 5) {
      bestMove = scoredCandidates[0];
    } else if (difficulty === 4) {
      bestMove = Math.random() < 0.9 ? scoredCandidates[0] : scoredCandidates[Math.min(1, scoredCandidates.length - 1)];
    } else if (difficulty === 3) {
      const top5 = scoredCandidates.slice(0, Math.min(5, scoredCandidates.length));
      bestMove = Math.random() < 0.75 ? scoredCandidates[0] : top5[Math.floor(Math.random() * top5.length)];
    } else if (difficulty === 2) {
      const top10 = scoredCandidates.slice(0, Math.min(10, scoredCandidates.length));
      bestMove = Math.random() < 0.55 ? scoredCandidates[0] : top10[Math.floor(Math.random() * top10.length)];
    } else {
      bestMove = Math.random() < 0.35 ? scoredCandidates[0] : scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)];
    }

    if (!bestMove && candidates.length > 0) {
      bestMove = { row: candidates[0][0], col: candidates[0][1] };
    }

    executeMove(currentBoard, bestMove.row, bestMove.col, startTime);
  }, [difficulty, size, checkWin, alphaBeta, evaluatePosition, getCandidatesOptimized, checkDoubleThreats, analyzePattern, findVCF]);

  // 執行移動（輔助函數）
  const executeMove = useCallback((currentBoard, row, col, startTime) => {
    const newBoard = currentBoard.map(r => [...r]);
    newBoard[row][col] = 'white';
    setBoard(newBoard);
    setHistory(prev => [...prev, { row, col, player: 'white' }]);
    
    const aiWinLine = checkWin(newBoard, row, col, 'white');
    if (aiWinLine) {
      setWinner('white');
      setWinningLine(aiWinLine);
    } else {
      setCurrentPlayer('black');
    }
    
    setIsAiThinking(false);
    
    // 記錄思考時間（除錯用）
    const elapsed = Date.now() - startTime;
    console.log(`AI 思考時間: ${elapsed}ms`);
  }, [checkWin]);

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