import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../themes';

type Props = {
    inviteUrl: string;
    localIp: string;
    port: number;
    hasPassword: boolean;
    onCopyLink: () => void;
};

export default function RoomInvitePanel({ inviteUrl, localIp, port, hasPassword, onCopyLink }: Props) {
    const { theme } = useTheme();

    const copy = async () => {
        await Clipboard.setStringAsync(inviteUrl);
        onCopyLink();
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Room ready</Text>
            <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
                {hasPassword
                    ? 'Password protected — guest must enter the same password or scan the QR.'
                    : 'Open room — anyone on your Wi‑Fi / hotspot can join (no password).'}
            </Text>
            <View style={[styles.box, { backgroundColor: theme.colors.background, borderColor: theme.colors.accent }]}>
                <Text style={[styles.ipLabel, { color: theme.colors.textMuted }]}>Your address</Text>
                <Text selectable style={[styles.ip, { color: theme.colors.text }]}>
                    {localIp}:{port}
                </Text>
            </View>
            <View style={styles.qrWrap}>
                <View style={[styles.qrCard, { backgroundColor: '#fff' }]}>
                    <QRCode value={inviteUrl} size={200} backgroundColor="#ffffff" />
                </View>
            </View>
            <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                Guest: scan QR with the phone camera (opens this app) or paste the invite link below.
            </Text>
            <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: theme.colors.accent }]}
                onPress={copy}
            >
                <Text style={styles.copyText}>Copy invite link</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { maxHeight: 420 },
    scrollContent: { paddingBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    sub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
    box: {
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
        alignItems: 'center',
    },
    ipLabel: { fontSize: 12, marginBottom: 4 },
    ip: { fontSize: 18, fontWeight: '600' },
    qrWrap: { alignItems: 'center', marginVertical: 12 },
    qrCard: { padding: 12, borderRadius: 12 },
    hint: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8 },
    copyBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    copyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
