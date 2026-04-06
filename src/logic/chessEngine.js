import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// 位置評估表 (白棋視角)
const PAWN_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

export const checkThreats = (game) => {
    const threats = { defensive: [], offensive: [] };
    const board = game.board();
    const turn = game.turn();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (!piece) continue;
            const square = String.fromCharCode(97 + j) + (8 - i);
            if (game.isAttacked(square, piece.color === 'w' ? 'b' : 'w')) {
                if (piece.color === turn) threats.defensive.push(square);
                else threats.offensive.push(square);
            }
        }
    }
    return threats;
};

// --- AI 核心 (Negamax 實作，避免視角混亂) ---

export const getBestMove = (game, difficulty = 2) => {
    // 即使是 Level 1，也至少搜尋 2 層，否則 AI 根本看不到玩家的反擊
    const depth = Math.max(2, parseInt(difficulty));
    const moves = game.moves();
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestValue = -Infinity;
    const isWhite = game.turn() === 'w';

    // 打亂移動順序增加隨機性
    moves.sort(() => Math.random() - 0.5);

    for (const move of moves) {
        game.move(move);
        // 使用 Negamax 邏輯：當前玩家的分數 = -(對手在下一回合的分數)
        const boardValue = -negamax(game, depth - 1, -Infinity, Infinity, !isWhite);
        game.undo();
        
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove;
};

// 使用 Negamax 演算法，邏輯更乾淨且不易出錯
function negamax(game, depth, alpha, beta, isWhiteTurn) {
    if (depth === 0) {
        return evaluateBoard(game);
    }

    const moves = game.moves();
    if (moves.length === 0) {
        if (game.isCheckmate()) return -99999; // 被將死
        return 0; // 和棋
    }

    let max = -Infinity;
    for (const move of moves) {
        game.move(move);
        const score = -negamax(game, depth - 1, -beta, -alpha, !isWhiteTurn);
        game.undo();
        
        if (score > max) max = score;
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
    }
    return max;
}

// 統一評估函數：始終回傳 (當前輪到的人) 的優勢分數
function evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board();
    const turn = game.turn();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                let val = PIECE_VALUES[piece.type] || 0;
                // PST 位置分
                if (piece.type === 'p') val += (piece.color === 'w' ? PAWN_PST[i][j] : PAWN_PST[7 - i][j]);
                else if (piece.type === 'n') val += KNIGHT_PST[i][j];
                
                // 如果是當前玩家的棋子，加分；否則減分
                totalEvaluation += (piece.color === turn ? val : -val);
            }
        }
    }

    // 將軍加分
    if (game.isCheck()) totalEvaluation += 50;

    // 移動力加分 (正確的正負號)
    totalEvaluation += game.moves().length * 2;

    return totalEvaluation;
}
