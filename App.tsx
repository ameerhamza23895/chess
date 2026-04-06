import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './src/screens/GameScreen';
import { ThemeProvider } from './src/themes';

export default function App() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <GameScreen />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
