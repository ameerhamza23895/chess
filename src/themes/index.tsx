import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@chess_offline_theme';

export interface Theme {
    name: string;
    colors: {
        background: string;
        surface: string;
        text: string;
        textMuted: string;
        boardDark: string;
        boardLight: string;
        lastMoveHighlight: string;
        legalMoveDot: string;
        captureRing: string;
        selectedSquare: string;
        checkKing: string;
        illegalFlash: string;
        accent: string;
        error: string;
    };
}

export const Themes: Record<string, Theme> = {
    Classic: {
        name: 'Classic',
        colors: {
            background: '#312e2b',
            surface: '#3d3935',
            text: '#ffffff',
            textMuted: '#b0b0b0',
            boardDark: '#769656',
            boardLight: '#eeeed2',
            lastMoveHighlight: 'rgba(246, 246, 105, 0.45)',
            legalMoveDot: 'rgba(0, 0, 0, 0.25)',
            captureRing: 'rgba(0, 0, 0, 0.55)',
            selectedSquare: 'rgba(246, 246, 105, 0.65)',
            checkKing: 'rgba(230, 60, 60, 0.55)',
            illegalFlash: 'rgba(230, 60, 60, 0.65)',
            accent: '#81b64c',
            error: '#ff6b6b',
        },
    },
    Lichess: {
        name: 'Lichess',
        colors: {
            background: '#161512',
            surface: '#262421',
            text: '#f0f0f0',
            textMuted: '#9a9a9a',
            boardDark: '#86a666',
            boardLight: '#ffffdd',
            lastMoveHighlight: 'rgba(205, 210, 106, 0.55)',
            legalMoveDot: 'rgba(0, 0, 0, 0.28)',
            captureRing: 'rgba(0, 0, 0, 0.5)',
            selectedSquare: 'rgba(205, 210, 106, 0.75)',
            checkKing: 'rgba(200, 50, 50, 0.55)',
            illegalFlash: 'rgba(220, 70, 70, 0.7)',
            accent: '#629924',
            error: '#ff7777',
        },
    },
    ChessCom: {
        name: 'Chess.com',
        colors: {
            background: '#eee2d0',
            surface: '#f5ebe0',
            text: '#403d39',
            textMuted: '#6c665f',
            boardDark: '#b58863',
            boardLight: '#f0d9b5',
            lastMoveHighlight: 'rgba(205, 210, 106, 0.5)',
            legalMoveDot: 'rgba(0, 0, 0, 0.22)',
            captureRing: 'rgba(0, 0, 0, 0.45)',
            selectedSquare: 'rgba(130, 151, 105, 0.55)',
            checkKing: 'rgba(200, 60, 60, 0.45)',
            illegalFlash: 'rgba(200, 60, 60, 0.65)',
            accent: '#769656',
            error: '#c33',
        },
    },
    Modern: {
        name: 'Modern',
        colors: {
            background: '#161512',
            surface: '#262421',
            text: '#bababa',
            textMuted: '#888',
            boardDark: '#4b7399',
            boardLight: '#eae9d2',
            lastMoveHighlight: 'rgba(255, 255, 255, 0.28)',
            legalMoveDot: 'rgba(0, 0, 0, 0.12)',
            captureRing: 'rgba(255, 255, 255, 0.45)',
            selectedSquare: 'rgba(82, 177, 255, 0.45)',
            checkKing: 'rgba(255, 100, 100, 0.45)',
            illegalFlash: 'rgba(255, 80, 80, 0.55)',
            accent: '#52b1ff',
            error: '#ff8888',
        },
    },
    Wood: {
        name: 'Wood',
        colors: {
            background: '#2c1e14',
            surface: '#3d2a1c',
            text: '#edcfa9',
            textMuted: '#a89078',
            boardDark: '#b58863',
            boardLight: '#f0d9b5',
            lastMoveHighlight: 'rgba(205, 210, 106, 0.45)',
            legalMoveDot: 'rgba(0, 0, 0, 0.22)',
            captureRing: 'rgba(0, 0, 0, 0.5)',
            selectedSquare: 'rgba(206, 210, 106, 0.65)',
            checkKing: 'rgba(220, 70, 70, 0.5)',
            illegalFlash: 'rgba(220, 70, 70, 0.65)',
            accent: '#8c5a3c',
            error: '#ff8a8a',
        },
    },
    Midnight: {
        name: 'Midnight',
        colors: {
            background: '#0d1117',
            surface: '#161b22',
            text: '#e6edf3',
            textMuted: '#8b949e',
            boardDark: '#2d333b',
            boardLight: '#444c56',
            lastMoveHighlight: 'rgba(88, 166, 255, 0.25)',
            legalMoveDot: 'rgba(255, 255, 255, 0.18)',
            captureRing: 'rgba(88, 166, 255, 0.55)',
            selectedSquare: 'rgba(88, 166, 255, 0.4)',
            checkKing: 'rgba(248, 81, 73, 0.45)',
            illegalFlash: 'rgba(248, 81, 73, 0.55)',
            accent: '#58a6ff',
            error: '#f85149',
        },
    },
    Ice: {
        name: 'Ice',
        colors: {
            background: '#e8f4fc',
            surface: '#ffffff',
            text: '#1a2f45',
            textMuted: '#5a6f82',
            boardDark: '#8eb8d4',
            boardLight: '#dfeef7',
            lastMoveHighlight: 'rgba(100, 180, 255, 0.35)',
            legalMoveDot: 'rgba(0, 50, 100, 0.2)',
            captureRing: 'rgba(0, 80, 160, 0.45)',
            selectedSquare: 'rgba(100, 180, 255, 0.45)',
            checkKing: 'rgba(220, 80, 80, 0.45)',
            illegalFlash: 'rgba(220, 80, 80, 0.6)',
            accent: '#2b7fc7',
            error: '#c62828',
        },
    },
    Dark: {
        name: 'Dark',
        colors: {
            background: '#262421',
            surface: '#302e2b',
            text: '#ffffff',
            textMuted: '#9b9b9b',
            boardDark: '#2e2b29',
            boardLight: '#3d3a37',
            lastMoveHighlight: 'rgba(170, 162, 53, 0.4)',
            legalMoveDot: 'rgba(255, 255, 255, 0.12)',
            captureRing: 'rgba(255, 255, 255, 0.35)',
            selectedSquare: 'rgba(246, 246, 105, 0.55)',
            checkKing: 'rgba(230, 70, 70, 0.5)',
            illegalFlash: 'rgba(230, 70, 70, 0.6)',
            accent: '#5c5c5c',
            error: '#ff6b6b',
        },
    },
};

interface ThemeContextType {
    theme: Theme;
    setTheme: (themeName: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(Themes.Classic);

    useEffect(() => {
        (async () => {
            try {
                const name = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (name && Themes[name]) setThemeState(Themes[name]);
            } catch {
                /* ignore */
            }
        })();
    }, []);

    const setTheme = useCallback((themeName: string) => {
        if (Themes[themeName]) {
            setThemeState(Themes[themeName]);
            AsyncStorage.setItem(THEME_STORAGE_KEY, themeName).catch(() => {});
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
