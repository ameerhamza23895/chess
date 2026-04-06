import { NativeModules } from 'react-native';

/** `react-native-tcp-socket` is not in Expo Go — only in dev / release builds (`expo run:android`). */
export function isTcpSocketsAvailable(): boolean {
    return NativeModules.TcpSockets != null;
}

export class TcpModuleUnavailableError extends Error {
    constructor() {
        super(
            'TCP_UNAVAILABLE: LAN multiplayer needs a native build with TCP sockets. Expo Go does not include them — run: npx expo run:android (or ios), then install that app.'
        );
        this.name = 'TcpModuleUnavailableError';
    }
}

export function assertTcpSocketsAvailable(): void {
    if (!isTcpSocketsAvailable()) {
        throw new TcpModuleUnavailableError();
    }
}
