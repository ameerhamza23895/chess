import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chess } from 'chess.js';

const KEY = 'chess_game';

export async function saveGame(game: Chess) {
    await AsyncStorage.setItem(KEY, game.fen());
}

export async function loadGame(game: Chess) {
    const fen = await AsyncStorage.getItem(KEY);
    if (fen) game.load(fen);
}