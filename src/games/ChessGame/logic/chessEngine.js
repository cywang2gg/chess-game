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

// 建議棋路顏色 (綠/黃/橙)
export const SUGGESTION_COLORS = {
    best: { bg: 'rgba(34, 197, 94, 0.35)', border: '#22c55e', label: '🟢 最佳' },
    good: { bg: 'rgba(234, 179, 8, 0.35)', border: '#eab308', label: '🟡 良好' },
    decent: { bg: 'rgba(249, 115, 22, 0.35)', border: '#f97316', label: '🟠 可行' }
};

// 取得前 3 個最佳建議棋路
export const getTopMoves = (game, depth = 3) => {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return [];
    
    const isWhite = game.turn() === 'w';
    let scoredMoves = [];
    
    for (const move of moves) {
        game.move(move.san);
        const boardValue = -negamax(game, depth - 1, -Infinity, Infinity, !isWhite, 'normal');
        game.undo();
        scoredMoves.push({
            move: move,
            san: move.san,
            value: boardValue,
            from: move.from,
            to: move.to
        });
    }
    
    scoredMoves.sort((a, b) => b.value - a.value);
    
    // 取前 3 個並標記類型
    const top3 = scoredMoves.slice(0, 3);
    const bestVal = top3[0]?.value || 0;
    
    return top3.map((m, i) => {
        let type = 'decent';
        const diff = bestVal - m.value;
        if (diff < 30) type = 'best';
        else if (diff < 80) type = 'good';
        
        // 產生說明
        let description = generateMoveDescription(game, m.move, m.value, bestVal, type);
        
        return { ...m, type, description };
    });
};

// 產生棋路說明
function generateMoveDescription(game, move, value, bestVal, type) {
    const pieceNames = { p: '兵', n: '騎士', b: '主教', r: '城堡', q: '皇后', k: '國王' };
    const piece = pieceNames[move.piece] || '棋子';
    const captured = move.captured ? `吃掉 ${pieceNames[move.captured]}` : '';
    
    let desc = `${piece} ${move.from}→${move.to}`;
    if (captured) desc += ` (${captured})`;
    
    // 添加戰術說明
    if (move.san.includes('+')) desc += ' ⚠️ 將軍！';
    if (move.promotion) desc += ' ↑ 升變';
    
    const diff = ((bestVal - value) / 100).toFixed(1);
    if (type === 'best') desc += ' — 最強選擇';
    else if (type === 'good') desc += ` — 比 ${diff} 子力弱`;
    else desc += ` — 比 ${diff} 子力弱，但可行`;
    
    return desc;
}

export const getLiveEval = (game) => {
    // We always evaluate from White's perspective for the UI bar
    let totalEvaluation = 0;
    const board = game.board();

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                let val = PIECE_VALUES[piece.type] || 0;
                // Add PST (Position) values for more accurate eval
                if (piece.type === 'p') val += (piece.color === 'w' ? PAWN_PST[i][j] : PAWN_PST[7 - i][j]);
                else if (piece.type === 'n') val += KNIGHT_PST[i][j];
                
                totalEvaluation += (piece.color === 'w' ? val : -val);
            }
        }
    }
    
    // Checkmate / Stalemate adjustment
    if (game.isCheckmate()) return game.turn() === 'w' ? -99.9 : 99.9;
    if (game.isDraw()) return 0;

    return (totalEvaluation / 100).toFixed(1);
};

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
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return null;

    let targetDepth = 2;
    let blunderRate = 0;
    const isWhite = game.turn() === 'w';

    if (difficulty === 'hope') {
        const balance = getMaterialBalance(game);
        const advantage = isWhite ? balance : -balance;
        targetDepth = (isEndgame(game) && advantage > 300) ? 2 : 3; // Slightly more depth for 'natural' mistakes
        blunderRate = 0.08; // Lower base blunder, use probability selection instead
    } else if (difficulty === 'desperate') {
        targetDepth = 4;
        blunderRate = 0;
    } else {
        const params = getDifficultyParams(difficulty);
        targetDepth = params.depth;
        blunderRate = params.blunderRate;
    }

    if (Math.random() < blunderRate) {
        return moves[Math.floor(Math.random() * moves.length)].san;
    }

    moves.sort((a, b) => (b.captured ? PIECE_VALUES[b.captured] : 0) - (a.captured ? PIECE_VALUES[a.captured] : 0));

    let scoredMoves = [];
    for (const move of moves) {
        game.move(move.san);
        // Add evaluation noise (+/- 15 points) to simulate human fuzzy thinking
        const noise = (Math.random() * 30 - 15);
        const boardValue = -negamax(game, targetDepth - 1, -Infinity, Infinity, !isWhite, difficulty) + noise;
        game.undo();
        scoredMoves.push({ move: move.san, value: boardValue });
    }

    scoredMoves.sort((a, b) => b.value - a.value);

    // --- Natural Decision Logic for HOPE ---
    if (difficulty === 'hope') {
        const bestVal = scoredMoves[0].value;
        const candidates = scoredMoves.filter(m => (bestVal - m.value) < 80); // Moves within 0.8 pawn value
        
        if (candidates.length > 1) {
            // Weighted selection: The better the move, the higher the chance
            // This prevents the AI from picking a 'terrible' move just because it's index 2
            const weights = candidates.map((m, i) => Math.exp(-i * 1.5)); // Rapidly decaying weights
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalWeight;
            for (let i = 0; i < candidates.length; i++) {
                if (r < weights[i]) return candidates[i].move;
                r -= weights[i];
            }
        }
    }

    return scoredMoves[0].move;
};

function negamax(game, depth, alpha, beta, isWhiteTurn, mode = 'normal') {
    if (depth <= 0) return evaluateBoard(game, mode);

    const moves = game.moves();
    if (moves.length === 0) {
        if (game.isCheckmate()) return -99999;
        return 0;
    }

    // Natural Drawing Logic for DESPERATE mode
    if (mode === 'desperate' && game.isDraw()) {
        const balance = getMaterialBalance(game);
        const advantage = game.turn() === 'w' ? balance : -balance;
        // If I am losing, a draw is as good as being even (0 evaluation)
        // This makes the AI "naturally" aim for a draw only when it's better than current state
        if (advantage < -150) return -advantage; 
    }

    let max = -Infinity;
    for (const move of moves) {
        game.move(move);
        const score = -negamax(game, depth - 1, -beta, -alpha, !isWhiteTurn, mode);
        game.undo();
        
        if (score > max) max = score;
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
    }
    return max;
}

function evaluateBoard(game, mode = 'normal') {
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

    // Desperate mode specific evaluation
    if (mode === 'desperate') {
        if (game.isCheck()) totalEvaluation += 100; // More aggressive check-seeking
    } else {
        if (game.isCheck()) totalEvaluation += 50;
    }

    return totalEvaluation;
}

function getDifficultyParams(level) {
    let blunderRate = 0;
    let depth = 2;

    const l = parseFloat(level);

    if (l === 1) { 
        blunderRate = 0.5;
        depth = 1;
    } else if (l === 1.5) {
        blunderRate = 0.35;
        depth = 2;
    } else if (l === 2) { 
        blunderRate = 0.2;
        depth = 2;
    } else if (l === 3) { 
        blunderRate = 0;
        depth = 2;
    } else if (l === 4) { 
        blunderRate = 0;
        depth = 3;
    } else if (l === 5) { 
        blunderRate = 0;
        depth = 4;
    }
    return { depth, blunderRate };
}

function getMaterialBalance(game) {
    let balance = 0;
    const board = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const val = PIECE_VALUES[piece.type] || 0;
                balance += (piece.color === 'w' ? val : -val);
            }
        }
    }
    return balance;
}
