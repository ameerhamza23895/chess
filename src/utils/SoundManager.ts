import { Audio } from 'expo-av';

/** Bundled Lichess-style sounds (offline-safe; no hotlinked URLs). */
const BUNDLED = {
    move: require('../../assets/sounds/move.mp3'),
    capture: require('../../assets/sounds/capture.mp3'),
    check: require('../../assets/sounds/check.mp3'),
} as const;

class SoundManager {
    private moveSound: Audio.Sound | null = null;
    private captureSound: Audio.Sound | null = null;
    private checkSound: Audio.Sound | null = null;

    async loadSounds() {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
            });

            const [{ sound: move }, { sound: capture }, { sound: check }] = await Promise.all([
                Audio.Sound.createAsync(BUNDLED.move),
                Audio.Sound.createAsync(BUNDLED.capture),
                Audio.Sound.createAsync(BUNDLED.check),
            ]);
            this.moveSound = move;
            this.captureSound = capture;
            this.checkSound = check;
        } catch (error) {
            console.warn('Failed to load bundled sounds', error);
        }
    }

    async playMove() {
        try {
            await this.moveSound?.replayAsync();
        } catch {
            /* ignore */
        }
    }

    async playCapture() {
        try {
            await this.captureSound?.replayAsync();
        } catch {
            /* ignore */
        }
    }

    async playCheck() {
        try {
            await this.checkSound?.replayAsync();
        } catch {
            /* ignore */
        }
    }

    unload() {
        void this.moveSound?.unloadAsync();
        void this.captureSound?.unloadAsync();
        void this.checkSound?.unloadAsync();
    }
}

export const soundManager = new SoundManager();
