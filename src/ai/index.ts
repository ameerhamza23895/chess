import { Chess } from 'chess.js';
import { makeBeginnerMove } from './beginner';
import { makeIntermediateMove } from './intermediate';
import { makeAdvancedMove } from './advanced';
import { getBestMove } from './engine';

export type AILevel = 'beginner' | 'intermediate' | 'advanced' | 'grandmaster' | 'unbeatable';

export function makeAIMove(game: Chess, level: AILevel) {
    if (game.isGameOver()) return;

    switch (level) {
        case 'beginner':
            makeBeginnerMove(game);
            break;
        case 'intermediate':
            makeIntermediateMove(game);
            break;
        case 'advanced':
            makeAdvancedMove(game);
            break;
        case 'grandmaster': {
            const m = getBestMove(game, 3);
            if (m) game.move(m);
            break;
        }
        case 'unbeatable': {
            const m = getBestMove(game, 4);
            if (m) game.move(m);
            break;
        }
    }
}