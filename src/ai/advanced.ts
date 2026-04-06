import { Chess } from 'chess.js';

const PIECE_VALUE: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 100,
};

export function makeAdvancedMove(game: Chess) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
        game.move(move.san);
        const score = evaluateBoard(game);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        game.undo();
    }

    game.move(bestMove.san);
}

function evaluateBoard(game: Chess) {
    const board = game.board();
    let score = 0;
    for (const row of board) {
        for (const square of row) {
            if (!square) continue;
            const value = PIECE_VALUE[square.type];
            score += square.color === 'w' ? value : -value;
        }
    }
    return score;
}