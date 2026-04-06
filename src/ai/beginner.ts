import { Chess } from 'chess.js';

export function makeBeginnerMove(game: Chess) {
    const moves = game.moves();
    if (moves.length === 0) return;

    const random = moves[Math.floor(Math.random() * moves.length)];
    game.move(random);
}