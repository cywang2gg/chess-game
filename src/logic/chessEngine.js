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

export const getBestMove = (game, difficulty = 2) => {
    const moves = game.moves();
    if (moves.length === 0) return null;

    // --- 根據難度設定隨機失誤率與搜尋深度 ---
    let blunderRate = 0;
    let depth = 2;

    switch (parseInt(difficulty)) {
        case 1: // Novice: 非常簡單，經常亂走
            blunderRate = 0.5;
            depth = 1;
            break;
        case 2: // Easy: 稍微會防守，但還是常出錯 (預設)
            blunderRate = 0.2;
            depth = 2;
            break;
        case 3: // Normal: 穩紮穩打
            blunderRate = 0;
            depth = 2;
            break;
        case 4: // Hard: 有點挑戰性
            blunderRate = 0;
            depth = 3;
            break;
        case 5: // Master: 專業對手
            blunderRate = 0;
            depth = 4;
            break;
        default:
            depth = 2;
    }

    // 隨機判定是否發生「失誤」 (隨機選一步合法走法)
    if (Math.random() < blunderRate) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // --- 正常 Negamax 搜尋 ---
    let bestMove = null;
    let bestValue = -Infinity;
    const isWhite = game.turn() === 'w';

    moves.sort(() => Math.random() - 0.5);

    for (const move of moves) {
        game.move(move);
        const boardValue = -negamax(game, depth - 1, -Infinity, Infinity, !isWhite);
        game.undo();
        
        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    return bestMove;
};

function negamax(game, depth, alpha, beta, isWhiteTurn) {
    if (depth <= 0) return evaluateBoard(game);

    const moves = game.moves();
    if (moves.length === 0) {
        if (game.isCheckmate()) return -99999;
        return 0;
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

function evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board();
    const turn = game.turn();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                let val = PIECE_VALUES[piece.type] || 0;
                if (piece.type === 'p') val += (piece.color === 'w' ? PAWN_PST[i][j] : PAWN_PST[7 - i][j]);
                else if (piece.type === 'n') val += KNIGHT_PST[i][j];
                totalEvaluation += (piece.color === turn ? val : -val);
            }
        }
    }
    if (game.isCheck()) totalEvaluation += 50;
    totalEvaluation += game.moves().length * 2;
    return totalEvaluation;
}
