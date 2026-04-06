import { Square } from 'chess.js';

/** File a–h from column index 0–7 */
export function fileFromCol(col: number): string {
    return String.fromCharCode(97 + col);
}

/** Rank string "1"–"8" from row index 0 = rank 8 (top) */
export function rankFromRow(row: number): string {
    return String(8 - row);
}

export function squareFromRowCol(row: number, col: number): Square {
    return `${fileFromCol(col)}${rankFromRow(row)}` as Square;
}

export function parseSquare(sq: Square): { row: number; col: number } {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq.charAt(1), 10);
    return { row: 8 - rank, col: file };
}
