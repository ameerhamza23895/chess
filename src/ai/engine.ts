import { Chess } from 'chess.js';

const PIECE_VALUES: Record<string, number> = {
    p: 10,
    n: 30,
    b: 30,
    r: 50,
    q: 90,
    k: 900,
};

// Piece-Square Tables (Simplified)
const PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10,-20,-20, 10, 10,  5,
    5, -5,-10,  0,  0,-10, -5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5,  5, 10, 25, 25, 10,  5,  5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
    0,  0,  0,  0,  0,  0,  0,  0
];

export function evaluateBoard(game: Chess): number {
    const board = game.board();
    let totalEvaluation = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const isWhite = piece.color === 'w';
                let absoluteValue = PIECE_VALUES[piece.type] || 0;
                
                // Add position value for pawns
                if (piece.type === 'p') {
                    const tableIdx = isWhite ? (7 - r) * 8 + c : r * 8 + c;
                    absoluteValue += PAWN_TABLE[tableIdx] * 0.1;
                }

                totalEvaluation += isWhite ? absoluteValue : -absoluteValue;
            }
        }
    }
    return totalEvaluation;
}

export function minimax(
    game: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizingPlayer: boolean
): number {
    if (depth === 0) {
        return -evaluateBoard(game);
    }

    const moves = game.moves();
    if (isMaximizingPlayer) {
        let bestEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            bestEval = Math.max(bestEval, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestEval);
            if (beta <= alpha) break;
        }
        return bestEval;
    } else {
        let bestEval = Infinity;
        for (const move of moves) {
            game.move(move);
            bestEval = Math.min(bestEval, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
            game.undo();
            beta = Math.min(beta, bestEval);
            if (beta <= alpha) break;
        }
        return bestEval;
    }
}

export function getBestMove(game: Chess, depth: number): string {
    const moves = game.moves();
    let bestMove = moves[0];
    let bestValue = -Infinity;
    const isWhite = game.turn() === 'w';

    for (const move of moves) {
        game.move(move);
        const boardValue = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
        game.undo();
        
        const evalValue = isWhite ? -boardValue : boardValue;

        if (evalValue > bestValue) {
            bestValue = evalValue;
            bestMove = move;
        }
    }

    return bestMove;
}
