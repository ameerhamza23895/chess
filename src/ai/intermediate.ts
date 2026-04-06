import { Chess } from 'chess.js';

const PIECE_VALUE: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 100,
};

export function makeIntermediateMove(game: Chess) {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    // Filter capture moves
    const captures = moves.filter(m => m.captured);

    if (captures.length > 0) {
        // Choose highest value capture
        captures.sort(
            (a, b) =>
                PIECE_VALUE[b.captured!] - PIECE_VALUE[a.captured!]
        );
        game.move(captures[0]);
        return;
    }

    // Otherwise random
    const random = moves[Math.floor(Math.random() * moves.length)];
    game.move(random);
}