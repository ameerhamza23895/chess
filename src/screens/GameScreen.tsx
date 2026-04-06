import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChessBoard, { ChessBoardRef } from '../components/ChessBoard';
import { Chess } from 'chess.js';
import { AILevel } from '../ai';
import { useTheme, Themes } from '../themes';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager';
import StatusBar from '../components/StatusBar';
import AIDifficulty from '../components/AIDifficulty';

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

    const onBoardUpdate = useCallback(() => {
        setBoardTick(v => v + 1);
    }, []);

    useEffect(() => {
        const mgr = new MultiplayerManager();
        setMultiplayerManager(mgr);
    }, []);

    const handleThemeChange = (name: string) => {
        setTheme(name);
    };

    const startScanning = async () => {
        if (!multiplayerManager) return;
        setIsScanning(true);
        setFoundHosts([]);
        try {
            const hosts = await multiplayerManager.scanLocalNetwork();
            setFoundHosts(hosts);
        } catch {
            Alert.alert('Scan Failed', 'Could not scan local network.');
        } finally {
            setIsScanning(false);
        }
    };

    const hostGame = async () => {
        if (!multiplayerManager) return;
        try {
            await multiplayerManager.startAsHost();
            setLocalColor('w');
            setIsMultiplayerOpen(false);
            Alert.alert('Hosting', 'You play White. Share hotspot; other device joins with your IP.');
        } catch {
            Alert.alert('Host Failed', 'Could not start host server.');
        }
    };

    const joinGame = async (ip: string) => {
        if (!multiplayerManager) return;
        try {
            await multiplayerManager.startAsClient(ip);
            setLocalColor('b');
            setIsMultiplayerOpen(false);
            Alert.alert('Joined', `Connected to ${ip}. You play Black.`);
        } catch {
            Alert.alert('Join Failed', `Could not connect to ${ip}`);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Chess Offline</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                        {localColor ? 'Hotspot game' : `AI: ${aiLevel}`}
                    </Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => setIsMultiplayerOpen(true)}>
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
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            Multiplayer (hotspot / LAN)
                        </Text>
                        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
                            Host plays White, client plays Black. Same Wi‑Fi or phone hotspot; no internet
                            required.
                        </Text>

                        <TouchableOpacity
                            style={[styles.hostButton, { backgroundColor: theme.colors.accent }]}
                            onPress={hostGame}
                        >
                            <Text style={styles.buttonText}>Host game (White)</Text>
                        </TouchableOpacity>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>
                            Join game
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
                                    Scan subnet for hosts
                                </Text>
                            )}
                        </TouchableOpacity>

                        <ScrollView style={styles.hostList}>
                            {foundHosts.map(ip => (
                                <TouchableOpacity
                                    key={ip}
                                    style={[
                                        styles.hostItem,
                                        { backgroundColor: theme.colors.background },
                                    ]}
                                    onPress={() => joinGame(ip)}
                                >
                                    <Text style={{ color: theme.colors.text }}>Host at {ip}</Text>
                                    <Text style={{ color: theme.colors.accent }}>Join (Black)</Text>
                                </TouchableOpacity>
                            ))}
                            {!isScanning && foundHosts.length === 0 && (
                                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                                    No hosts found. Enter host IP on the same network, or start hosting.
                                </Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                            onPress={() => setIsMultiplayerOpen(false)}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={isSettingsOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>

                        <ScrollView>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Board theme
                            </Text>
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
        maxHeight: '90%',
    },
    hint: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
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
        marginTop: 16,
        marginBottom: 10,
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
        marginTop: 24,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    hostButton: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    scanButton: {
        padding: 15,
        borderWidth: 1,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    hostList: {
        maxHeight: 200,
    },
    hostItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 16,
        fontSize: 14,
    },
});
