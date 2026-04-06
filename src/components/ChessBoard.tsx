import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Text,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Chess, Square, Move } from 'chess.js';
import { makeAIMove, AILevel } from '../ai';
import { useTheme } from '../themes';
import Piece from './Piece';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager';
import { soundManager } from '../utils/SoundManager';
import { saveGame, loadGame } from '../storage/game';
import { squareFromRowCol } from '../utils/pieceUtils';

export interface ChessBoardRef {
    undo: () => void;
    reset: () => void;
}

interface ChessBoardProps {
    game: Chess;
    aiLevel: AILevel;
    multiplayerManager?: MultiplayerManager;
    /** When set (hotspot), only this color can be moved locally */
    localColor?: 'w' | 'b';
    /** vs AI: human plays White; Black's turn ignores input while AI thinks */
    vsAI?: boolean;
    onUpdate?: () => void;
    onFeedback?: (message: string | null) => void;
}

const { width } = Dimensions.get('window');
const BOARD_SIZE = width - 32;
const SQUARE_SIZE = BOARD_SIZE / 8;

type PromotionPick = 'q' | 'r' | 'b' | 'n';

const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(
    ({ game, aiLevel, multiplayerManager, localColor, vsAI, onUpdate, onFeedback }, ref) => {
        const [selected, setSelected] = useState<Square | null>(null);
        const [legalTargets, setLegalTargets] = useState<Map<Square, Move[]>>(new Map());
        const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
        const [, setRenderTick] = useState(0);
        const [illegalSquare, setIllegalSquare] = useState<Square | null>(null);
        const [promotionSquares, setPromotionSquares] = useState<{ from: Square; to: Square } | null>(null);
        const aiThinking = useRef(false);
        const { theme } = useTheme();

        const forceUpdate = useCallback(() => {
            setRenderTick(v => v + 1);
            onUpdate?.();
            saveGame(game);
        }, [game, onUpdate]);

        useEffect(() => {
            soundManager.loadSounds();
            const init = async () => {
                await loadGame(game);
                forceUpdate();
            };
            init();
            return () => soundManager.unload();
        }, [game, forceUpdate]);

        useImperativeHandle(
            ref,
            () => ({
                undo: () => {
                    const steps = vsAI && game.history().length >= 2 ? 2 : 1;
                    for (let i = 0; i < steps; i++) game.undo();
                    setLastMove(null);
                    setSelected(null);
                    setLegalTargets(new Map());
                    setPromotionSquares(null);
                    forceUpdate();
                },
                reset: () => {
                    game.reset();
                    setLastMove(null);
                    setSelected(null);
                    setLegalTargets(new Map());
                    setPromotionSquares(null);
                    aiThinking.current = false;
                    forceUpdate();
                },
            }),
            [vsAI, game, forceUpdate]
        );

        const playSoundsForMove = useCallback(
            (move: Move) => {
                if (move.captured) soundManager.playCapture();
                else if (game.isCheck()) soundManager.playCheck();
                else soundManager.playMove();
            },
            [game]
        );

        const applyLocalMove = useCallback(
            (move: Move) => {
                setLastMove({ from: move.from, to: move.to });
                playSoundsForMove(move);
                forceUpdate();
            },
            [forceUpdate, playSoundsForMove]
        );

        useEffect(() => {
            if (!multiplayerManager || localColor == null) return;

            const handleRemoteMove = (...args: unknown[]) => {
                const moveStr = args[0];
                if (typeof moveStr !== 'string') return;
                try {
                    const move = game.move(moveStr);
                    if (move) {
                        setLastMove({ from: move.from, to: move.to });
                        if (move.captured) soundManager.playCapture();
                        else if (game.isCheck()) soundManager.playCheck();
                        else soundManager.playMove();
                        setSelected(null);
                        setLegalTargets(new Map());
                        forceUpdate();
                    }
                } catch (e) {
                    console.error('Failed to apply remote move:', e);
                }
            };

            multiplayerManager.on('move', handleRemoteMove);
            return () => {
                multiplayerManager.off('move', handleRemoteMove);
            };
        }, [multiplayerManager, localColor, game, forceUpdate]);

        const flashIllegal = useCallback(
            (square: Square) => {
                setIllegalSquare(square);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                onFeedback?.('Illegal move');
                setTimeout(() => {
                    setIllegalSquare(null);
                    onFeedback?.(null);
                }, 500);
            },
            [onFeedback]
        );

        /** Multiplayer is active only after host/join (localColor set), not merely when MultiplayerManager exists */
        const runAiIfNeeded = useCallback(() => {
            if (localColor != null || game.isGameOver()) return;
            aiThinking.current = true;
            setTimeout(() => {
                makeAIMove(game, aiLevel);
                const hist = game.history({ verbose: true });
                const aiMove = hist[hist.length - 1];
                if (aiMove) {
                    setLastMove({ from: aiMove.from, to: aiMove.to });
                    playSoundsForMove(aiMove);
                }
                aiThinking.current = false;
                forceUpdate();
            }, 350);
        }, [aiLevel, forceUpdate, game, localColor, playSoundsForMove]);

        const findKingSquare = (color: 'w' | 'b'): Square | null => {
            const b = game.board();
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = b[r][c];
                    if (p && p.type === 'k' && p.color === color) {
                        return squareFromRowCol(r, c);
                    }
                }
            }
            return null;
        };

        const buildLegalMap = useCallback(
            (from: Square) => {
                const verbose = game.moves({ square: from, verbose: true }) as Move[];
                const map = new Map<Square, Move[]>();
                for (const m of verbose) {
                    const to = m.to as Square;
                    const arr = map.get(to) ?? [];
                    arr.push(m);
                    map.set(to, arr);
                }
                return map;
            },
            [game]
        );

        const onSquarePress = (row: number, col: number) => {
            const square = squareFromRowCol(row, col);
            const piece = game.get(square);

            if (vsAI && game.turn() === 'b') return;
            if (localColor && game.turn() !== localColor) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onFeedback?.("Opponent's turn");
                setTimeout(() => onFeedback?.(null), 1200);
                return;
            }
            if (aiThinking.current) return;

            if (selected) {
                const movesHere = legalTargets.get(square);
                if (movesHere && movesHere.length > 0) {
                    const needsPromotion = movesHere.some(m => m.promotion);
                    if (needsPromotion) {
                        setPromotionSquares({ from: selected, to: square });
                        return;
                    }
                    const move = game.move(movesHere[0].san);
                    if (move) {
                        applyLocalMove(move);
                        setSelected(null);
                        setLegalTargets(new Map());
                        if (localColor != null) multiplayerManager?.sendMove(move.san);
                        else runAiIfNeeded();
                    }
                    return;
                }

                if (piece && piece.color === game.turn()) {
                    if (selected === square) {
                        setSelected(null);
                        setLegalTargets(new Map());
                        return;
                    }
                    setSelected(square);
                    setLegalTargets(buildLegalMap(square));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    return;
                }

                flashIllegal(square);
                return;
            }

            if (piece && piece.color === game.turn()) {
                setSelected(square);
                setLegalTargets(buildLegalMap(square));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            } else if (piece) {
                flashIllegal(square);
            }
        };

        const completePromotion = (p: PromotionPick) => {
            if (!promotionSquares) return;
            const { from, to } = promotionSquares;
            try {
                const move = game.move({ from, to, promotion: p });
                if (move) {
                    applyLocalMove(move);
                    if (localColor != null) multiplayerManager?.sendMove(move.san);
                    else runAiIfNeeded();
                }
            } catch {
                onFeedback?.('Illegal move');
            }
            setPromotionSquares(null);
            setSelected(null);
            setLegalTargets(new Map());
        };

        const board = game.board();
        const inCheck = game.isCheck();
        const kingToHighlight = inCheck ? findKingSquare(game.turn()) : null;

        return (
            <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
                {board.map((row, r) =>
                    row.map((piece, c) => {
                        const square = squareFromRowCol(r, c);
                        const isDark = (r + c) % 2 === 1;
                        const isSelected = selected === square;
                        const movesHere = legalTargets.get(square);
                        const isCaptureMark = Boolean(movesHere?.some(m => m.captured));
                        const isQuietMove = Boolean(movesHere?.length) && !isCaptureMark;
                        const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
                        const isIllegalFlash = illegalSquare === square;
                        const isCheckKing = kingToHighlight === square;

                        let bg = isDark ? theme.colors.boardDark : theme.colors.boardLight;
                        if (isIllegalFlash) bg = theme.colors.illegalFlash;
                        else if (isSelected) bg = theme.colors.selectedSquare;
                        else if (isLastMove) bg = theme.colors.lastMoveHighlight;
                        else if (isCheckKing) bg = theme.colors.checkKing;

                        return (
                            <TouchableOpacity
                                key={square}
                                activeOpacity={0.92}
                                onPress={() => onSquarePress(r, c)}
                                style={[styles.square, { backgroundColor: bg }]}
                            >
                                {isQuietMove && (
                                    <View
                                        style={[
                                            styles.legalDot,
                                            { backgroundColor: theme.colors.legalMoveDot },
                                        ]}
                                    />
                                )}
                                {isCaptureMark && (
                                    <View
                                        style={[
                                            styles.captureRing,
                                            { borderColor: theme.colors.captureRing },
                                        ]}
                                    />
                                )}
                                {piece && (
                                    <Piece
                                        type={piece.type as 'p' | 'n' | 'b' | 'r' | 'q' | 'k'}
                                        color={piece.color as 'w' | 'b'}
                                        size={SQUARE_SIZE * 0.85}
                                    />
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                <Modal visible={promotionSquares !== null} transparent animationType="fade">
                    <View style={styles.promoOverlay}>
                        <View style={[styles.promoCard, { backgroundColor: theme.colors.surface }]}>
                            <Text style={[styles.promoTitle, { color: theme.colors.text }]}>
                                Choose promotion
                            </Text>
                            <View style={styles.promoRow}>
                                {(
                                    [
                                        ['q', 'Queen'],
                                        ['r', 'Rook'],
                                        ['b', 'Bishop'],
                                        ['n', 'Knight'],
                                    ] as const
                                ).map(([code, label]) => (
                                    <Pressable
                                        key={code}
                                        onPress={() => completePromotion(code)}
                                        style={({ pressed }) => [
                                            styles.promoBtn,
                                            {
                                                backgroundColor: pressed
                                                    ? theme.colors.accent + '55'
                                                    : theme.colors.background,
                                                borderColor: theme.colors.accent,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.promoBtnText, { color: theme.colors.text }]}>
                                            {label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                            <Pressable
                                onPress={() => setPromotionSquares(null)}
                                style={{ marginTop: 14, alignItems: 'center' }}
                            >
                                <Text style={{ color: theme.colors.textMuted, fontWeight: '600' }}>
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
);

ChessBoard.displayName = 'ChessBoard';

export default ChessBoard;

const styles = StyleSheet.create({
    board: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        overflow: 'hidden',
        borderRadius: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    square: {
        width: '12.5%',
        height: '12.5%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    legalDot: {
        position: 'absolute',
        width: '28%',
        height: '28%',
        borderRadius: 100,
        zIndex: 1,
    },
    captureRing: {
        position: 'absolute',
        width: '88%',
        height: '88%',
        borderRadius: 100,
        borderWidth: 4,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    promoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    promoCard: {
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 340,
    },
    promoTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    promoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    promoBtn: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 2,
        minWidth: '42%',
        alignItems: 'center',
    },
    promoBtnText: {
        fontWeight: '600',
        fontSize: 15,
    },
});
