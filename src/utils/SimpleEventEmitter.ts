/** Minimal pub/sub for React Native (no Node `events` polyfill). */
type Listener = (...args: unknown[]) => void;

export class SimpleEventEmitter {
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, listener: Listener): this {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(listener);
        return this;
    }

    off(event: string, listener: Listener): this {
        const set = this.listeners.get(event);
        if (!set) return this;
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(event);
        return this;
    }

    emit(event: string, ...args: unknown[]): boolean {
        const set = this.listeners.get(event);
        if (!set?.size) return false;
        for (const listener of set) {
            listener(...args);
        }
        return true;
    }
}
