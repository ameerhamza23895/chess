import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Chess } from 'chess.js';
import { useTheme } from '../themes';

type Props = {
    game: Chess;
    /** Short message (e.g. illegal move); cleared by parent after timeout */
    feedback?: string | null;
    /** vs AI: human plays White */
    vsAI?: boolean;
    /** Hotspot: only this side is controlled locally */
    localColor?: 'w' | 'b';
};

export default function StatusBar({ game, feedback, vsAI, localColor }: Props) {
    const { theme } = useTheme();

    const turn = game.turn() === 'w' ? 'White' : 'Black';
    let status = `${turn} to move`;

    if (game.isCheckmate()) {
        status = 'Checkmate';
    } else if (game.isStalemate()) {
        status = 'Stalemate';
    } else if (game.isDraw()) {
        if (game.isThreefoldRepetition()) status = 'Draw by repetition';
        else if (game.isInsufficientMaterial()) status = 'Draw — insufficient material';
        else status = 'Draw';
    } else if (game.isCheck()) {
        status = `${turn} to move — Check`;
    }

    let modeHint = '';
    if (localColor) {
        modeHint = `You are ${localColor === 'w' ? 'White' : 'Black'}`;
    } else if (vsAI) {
        modeHint = 'You play White vs AI';
    }

    return (
        <View style={[styles.wrap, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.main, { color: theme.colors.text }]} numberOfLines={2}>
                {status}
            </Text>
            {modeHint ? (
                <Text style={[styles.sub, { color: theme.colors.textMuted }]}>{modeHint}</Text>
            ) : null}
            {feedback ? (
                <Text style={[styles.feedback, { color: theme.colors.error }]}>{feedback}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    main: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    sub: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
    feedback: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
    },
});
