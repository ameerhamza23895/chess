import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import ChessBoard, { ChessBoardRef } from '../components/ChessBoard';
import { Chess } from 'chess.js';
import { AILevel } from '../ai';
import { useTheme, Themes } from '../themes';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager';
import StatusBar from '../components/StatusBar';
import AIDifficulty from '../components/AIDifficulty';
import RoomInvitePanel from '../components/RoomInvitePanel';
import {
    buildInviteUrl,
    parseInviteUrl,
    parseInviteFromPastedText,
    DEFAULT_CHESS_PORT,
} from '../multiplayer/protocol';
import { isTcpSocketsAvailable, TcpModuleUnavailableError } from '../multiplayer/tcpGuard';

async function getLanIPv4(): Promise<string | null> {
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.details || !('ipAddress' in state.details)) {
        return null;
    }
    const ip = state.details.ipAddress as string;
    return ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null;
}

export default function GameScreen() {
    const { theme, setTheme } = useTheme();
    const gameRef = useRef(new Chess());
    const game = gameRef.current;

    const [aiLevel, setAILevel] = useState<AILevel>('beginner');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [foundHosts, setFoundHosts] = useState<string[]>([]);
    const [multiplayerManager, setMultiplayerManager] = useState<MultiplayerManager | undefined>(
        undefined
    );
    const [localColor, setLocalColor] = useState<'w' | 'b' | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const boardRef = useRef<ChessBoardRef>(null);
    const [, setBoardTick] = useState(0);

    const [hostRoomPassword, setHostRoomPassword] = useState('');
    const [joinIp, setJoinIp] = useState('');
    const [joinPort, setJoinPort] = useState(String(DEFAULT_CHESS_PORT));
    const [joinRoomPassword, setJoinRoomPassword] = useState('');
    const [pasteInvite, setPasteInvite] = useState('');
    const [mpPanel, setMpPanel] = useState<'menu' | 'hostQr'>('menu');
    const [inviteUrl, setInviteUrl] = useState('');
    const [localIpShown, setLocalIpShown] = useState('');
    const [hostHasPassword, setHostHasPassword] = useState(false);

    const onBoardUpdate = useCallback(() => {
        setBoardTick(v => v + 1);
    }, []);

    useEffect(() => {
        const mgr = new MultiplayerManager();
        setMultiplayerManager(mgr);
    }, []);

    useEffect(() => {
        const handleUrl = (url: string | null) => {
            if (!url) return;
            const p = parseInviteUrl(url);
            if (p) {
                setJoinIp(p.ip);
                setJoinPort(String(p.port));
                setJoinRoomPassword(p.password);
                setIsMultiplayerOpen(true);
                setMpPanel('menu');
                Alert.alert('Invite link', 'Connection details filled in. Tap Join as Black.');
            }
        };
        Linking.getInitialURL().then(handleUrl).catch(() => {});
        const sub = Linking.addEventListener('url', e => handleUrl(e.url));
        return () => sub.remove();
    }, []);

    const handleThemeChange = (name: string) => {
        setTheme(name);
    };

    const resetMpUi = () => {
        setMpPanel('menu');
        setPasteInvite('');
    };

    const openMultiplayerModal = () => {
        resetMpUi();
        setIsMultiplayerOpen(true);
    };

    const closeMultiplayerModal = () => {
        setIsMultiplayerOpen(false);
        resetMpUi();
    };

    const endMultiplayerSession = () => {
        multiplayerManager?.cleanupConnections();
        setLocalColor(null);
        resetMpUi();
    };

    const startScanning = async () => {
        if (!multiplayerManager) return;
        if (!isTcpSocketsAvailable()) {
            Alert.alert(
                'LAN multiplayer unavailable',
                'Expo Go does not include TCP sockets. Build a native app: npx expo run:android'
            );
            return;
        }
        setIsScanning(true);
        setFoundHosts([]);
        try {
            const port = parseInt(joinPort, 10) || DEFAULT_CHESS_PORT;
            const hosts = await multiplayerManager.scanLocalNetwork(port);
            setFoundHosts(hosts);
        } catch {
            Alert.alert('Scan Failed', 'Could not scan local network.');
        } finally {
            setIsScanning(false);
        }
    };

    const createRoomAsHost = async () => {
        if (!multiplayerManager) return;
        if (!isTcpSocketsAvailable()) {
            Alert.alert(
                'LAN multiplayer unavailable',
                'Expo Go does not include TCP sockets. Build a native app: npx expo run:android'
            );
            return;
        }
        const ip = await getLanIPv4();
        if (!ip) {
            Alert.alert(
                'No local IP',
                'Connect to Wi‑Fi or turn on a mobile hotspot, then try again.'
            );
            return;
        }
        const pwd = hostRoomPassword.trim();
        try {
            await multiplayerManager.startAsHost(DEFAULT_CHESS_PORT, pwd);
            setLocalColor('w');
            const url = buildInviteUrl(ip, DEFAULT_CHESS_PORT, pwd);
            setInviteUrl(url);
            setLocalIpShown(ip);
            setHostHasPassword(pwd.length > 0);
            setMpPanel('hostQr');
            Alert.alert('Room is live', 'Share the QR or link with your guest (same network).');
        } catch (e) {
            if (e instanceof TcpModuleUnavailableError) {
                Alert.alert('LAN multiplayer unavailable', e.message);
                return;
            }
            console.warn(e);
            Alert.alert(
                'Could not create room',
                'Port may be in use. Close other apps using the same port or restart the app.'
            );
        }
    };

    const joinGame = async (ipOverride?: string) => {
        if (!multiplayerManager) return;
        if (!isTcpSocketsAvailable()) {
            Alert.alert(
                'LAN multiplayer unavailable',
                'Expo Go does not include TCP sockets. Build a native app: npx expo run:android'
            );
            return;
        }
        const ip = (ipOverride ?? joinIp).trim();
        const port = parseInt(joinPort, 10) || DEFAULT_CHESS_PORT;
        if (!ip) {
            Alert.alert('Missing IP', 'Enter the host IP or use an invite link / QR.');
            return;
        }
        try {
            await multiplayerManager.startAsClient(ip, port, joinRoomPassword.trim());
            setLocalColor('b');
            closeMultiplayerModal();
            Alert.alert('Joined', `Connected to ${ip}. You play Black.`);
        } catch (e) {
            if (e instanceof TcpModuleUnavailableError) {
                Alert.alert('LAN multiplayer unavailable', e.message);
                return;
            }
            console.warn(e);
            Alert.alert(
                'Join failed',
                'Check IP, port, room password, and that you are on the same Wi‑Fi / hotspot.'
            );
        }
    };

    const applyPastedInvite = () => {
        const p = parseInviteFromPastedText(pasteInvite);
        if (!p) {
            Alert.alert('Invalid invite', 'Paste the full invite link or query string.');
            return;
        }
        setJoinIp(p.ip);
        setJoinPort(String(p.port));
        setJoinRoomPassword(p.password);
        Alert.alert('Invite loaded', 'Tap “Join as Black”.');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Chess Offline</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        {localColor ? 'Hotspot / LAN game' : `AI: ${aiLevel}`}
                    </Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={openMultiplayerModal}>
                        <Text style={[styles.settingsIcon, { marginRight: 20 }]}>🌐</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsSettingsOpen(true)}>
                        <Text style={styles.settingsIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <StatusBar
                game={game}
                feedback={feedback}
                vsAI={!localColor}
                localColor={localColor ?? undefined}
            />

            <View style={styles.content}>
                <View
                    style={[
                        styles.boardContainer,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.accent + '33',
                        },
                    ]}
                >
                    <ChessBoard
                        ref={boardRef}
                        game={game}
                        aiLevel={aiLevel}
                        multiplayerManager={multiplayerManager}
                        localColor={localColor ?? undefined}
                        vsAI={!localColor}
                        onUpdate={onBoardUpdate}
                        onFeedback={setFeedback}
                    />
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.accent }]}
                    onPress={() => boardRef.current?.undo()}
                >
                    <Text style={styles.buttonText}>Undo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.surface }]}
                    onPress={() => boardRef.current?.reset()}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>New game</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={isMultiplayerOpen} animationType="slide" transparent>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            {mpPanel === 'hostQr' ? 'Your room' : 'Play together (offline LAN)'}
                        </Text>

                        {mpPanel === 'hostQr' ? (
                            <>
                                <RoomInvitePanel
                                    inviteUrl={inviteUrl}
                                    localIp={localIpShown}
                                    port={DEFAULT_CHESS_PORT}
                                    hasPassword={hostHasPassword}
                                    onCopyLink={() =>
                                        Alert.alert('Copied', 'Send the link to your guest.')
                                    }
                                />
                                <TouchableOpacity
                                    style={[styles.closeButton, { backgroundColor: theme.colors.accent }]}
                                    onPress={() => {
                                        setMpPanel('menu');
                                    }}
                                >
                                    <Text style={styles.buttonText}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                                    onPress={() => {
                                        endMultiplayerSession();
                                        closeMultiplayerModal();
                                    }}
                                >
                                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                                        Close room & exit
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <ScrollView keyboardShouldPersistTaps="handled">
                                <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                                    Host creates a room (optional password). Guest joins with IP or by
                                    scanning the QR / opening the invite link.
                                </Text>
                                {!isTcpSocketsAvailable() ? (
                                    <Text style={[styles.warnBanner, { color: theme.colors.error }]}>
                                        LAN multiplayer needs a native build (run npx expo run:android). Expo
                                        Go does not include TCP — you will get errors if you try to host or
                                        join here.
                                    </Text>
                                ) : null}

                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                    Host (White)
                                </Text>
                                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    Room password (optional — leave empty for open room)
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            borderColor: theme.colors.accent + '66',
                                            backgroundColor: theme.colors.background,
                                        },
                                    ]}
                                    placeholder="Empty = anyone on same Wi‑Fi can join"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry
                                    value={hostRoomPassword}
                                    onChangeText={setHostRoomPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={[styles.hostButton, { backgroundColor: theme.colors.accent }]}
                                    onPress={createRoomAsHost}
                                >
                                    <Text style={styles.buttonText}>Create room & show QR</Text>
                                </TouchableOpacity>

                                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>
                                    Guest (Black)
                                </Text>
                                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    Paste invite (from QR or copy)
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            borderColor: theme.colors.accent + '66',
                                            backgroundColor: theme.colors.background,
                                        },
                                    ]}
                                    placeholder="chessoffline://join?..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={pasteInvite}
                                    onChangeText={setPasteInvite}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={[styles.scanButton, { borderColor: theme.colors.accent }]}
                                    onPress={applyPastedInvite}
                                >
                                    <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                                        Apply pasted invite
                                    </Text>
                                </TouchableOpacity>

                                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>
                                    Or enter manually
                                </Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            borderColor: theme.colors.accent + '66',
                                            backgroundColor: theme.colors.background,
                                        },
                                    ]}
                                    placeholder="Host IP e.g. 192.168.43.1"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={joinIp}
                                    onChangeText={setJoinIp}
                                    keyboardType="decimal-pad"
                                />
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            borderColor: theme.colors.accent + '66',
                                            backgroundColor: theme.colors.background,
                                        },
                                    ]}
                                    placeholder="Port"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={joinPort}
                                    onChangeText={setJoinPort}
                                    keyboardType="number-pad"
                                />
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            color: theme.colors.text,
                                            borderColor: theme.colors.accent + '66',
                                            backgroundColor: theme.colors.background,
                                        },
                                    ]}
                                    placeholder="Room password (if host set one)"
                                    placeholderTextColor={theme.colors.textMuted}
                                    secureTextEntry
                                    value={joinRoomPassword}
                                    onChangeText={setJoinRoomPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.hostButton, { backgroundColor: theme.colors.accent }]}
                                    onPress={() => joinGame()}
                                >
                                    <Text style={styles.buttonText}>Join as Black</Text>
                                </TouchableOpacity>

                                <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 20 }]}>
                                    Find hosts (same subnet)
                                </Text>
                                <TouchableOpacity
                                    style={[styles.scanButton, { borderColor: theme.colors.accent }]}
                                    onPress={startScanning}
                                    disabled={isScanning}
                                >
                                    {isScanning ? (
                                        <ActivityIndicator color={theme.colors.accent} />
                                    ) : (
                                        <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                                            Scan for rooms
                                        </Text>
                                    )}
                                </TouchableOpacity>
                                <ScrollView style={styles.hostList} nestedScrollEnabled>
                                    {foundHosts.map(ip => (
                                        <TouchableOpacity
                                            key={ip}
                                            style={[
                                                styles.hostItem,
                                                { backgroundColor: theme.colors.background },
                                            ]}
                                            onPress={() => joinGame(ip)}
                                        >
                                            <Text style={{ color: theme.colors.text }}>Room at {ip}</Text>
                                            <Text style={{ color: theme.colors.accent }}>Join</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {localColor === 'w' && (
                                    <TouchableOpacity
                                        style={[styles.endBtn, { borderColor: theme.colors.error }]}
                                        onPress={() => {
                                            endMultiplayerSession();
                                            closeMultiplayerModal();
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.error, fontWeight: '600' }}>
                                            End hosting
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        )}

                        {mpPanel === 'menu' && (
                            <TouchableOpacity
                                style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                                onPress={closeMultiplayerModal}
                            >
                                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Close</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={isSettingsOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>

                        <ScrollView>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Board theme</Text>
                            <View style={styles.themeGrid}>
                                {Object.keys(Themes).map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.themeOption,
                                            {
                                                borderColor:
                                                    theme.name === t ? theme.colors.accent : '#444',
                                                backgroundColor: theme.colors.background,
                                            },
                                        ]}
                                        onPress={() => handleThemeChange(t)}
                                    >
                                        <Text style={{ color: theme.colors.text }}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                AI difficulty
                            </Text>
                            <AIDifficulty selectedLevel={aiLevel} onSelect={setAILevel} />
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.colors.accent }]}
                            onPress={() => setIsSettingsOpen(false)}
                        >
                            <Text style={styles.buttonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerIcons: {
        flexDirection: 'row',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    settingsIcon: {
        fontSize: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boardContainer: {
        padding: 8,
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        borderWidth: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    button: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 10,
        minWidth: 120,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '92%',
    },
    hint: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    warnBanner: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 14,
        fontWeight: '600',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 8,
    },
    fieldLabel: {
        fontSize: 13,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
        fontSize: 16,
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    themeOption: {
        padding: 14,
        borderWidth: 2,
        borderRadius: 10,
        minWidth: '45%',
        alignItems: 'center',
    },
    closeButton: {
        marginTop: 16,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    hostButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    scanButton: {
        padding: 14,
        borderWidth: 1,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    hostList: {
        maxHeight: 160,
    },
    hostItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
    },
    endBtn: {
        marginTop: 20,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
});
