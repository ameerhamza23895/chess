import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';
import { Host } from './Host';
import { Client } from './Client';
import NetInfo from '@react-native-community/netinfo';
import TcpSocket from 'react-native-tcp-socket';
import { encodeLine, DEFAULT_CHESS_PORT } from './protocol';
import { assertTcpSocketsAvailable, isTcpSocketsAvailable } from './tcpGuard';

export type MultiplayerRole = 'host' | 'client';

export class MultiplayerManager extends SimpleEventEmitter {
    private role?: MultiplayerRole;
    private host?: Host;
    private client?: Client;

    /** Close any host/client sockets so a new room can be created */
    cleanupConnections() {
        this.host?.close();
        this.host = undefined;
        this.client?.disconnect();
        this.client = undefined;
        this.role = undefined;
    }

    async scanLocalNetwork(port = DEFAULT_CHESS_PORT): Promise<string[]> {
        if (!isTcpSocketsAvailable()) {
            return [];
        }
        const state = await NetInfo.fetch();
        if (!state.isConnected || !state.details || !('ipAddress' in state.details)) {
            return [];
        }

        const ip = state.details.ipAddress as string;
        const subnet = ip.substring(0, ip.lastIndexOf('.') + 1);
        const foundHosts: string[] = [];

        const pings = [];
        for (let i = 1; i < 255; i++) {
            const targetIp = subnet + i;
            if (targetIp === ip) continue;

            pings.push(
                this.checkHost(targetIp, port).then(found => {
                    if (found) foundHosts.push(targetIp);
                    this.emit('scan_progress', i / 255);
                })
            );
        }

        await Promise.all(pings);
        return foundHosts;
    }

    /** Discovery: send probe; chess host answers {t:hello} */
    private checkHost(ip: string, port: number): Promise<boolean> {
        if (!isTcpSocketsAvailable()) {
            return Promise.resolve(false);
        }
        return new Promise(resolve => {
            let buf = '';
            const socket = TcpSocket.createConnection({ host: ip, port }, () => {
                socket.write(encodeLine({ t: 'probe' }));
            });
            socket.setTimeout(450);
            socket.on('data', (data: Buffer | string) => {
                buf += typeof data === 'string' ? data : data.toString('utf8');
                const idx = buf.indexOf('\n');
                if (idx === -1) return;
                const line = buf.slice(0, idx).trim();
                try {
                    const j = JSON.parse(line) as { t?: string };
                    socket.destroy();
                    resolve(j.t === 'hello');
                } catch {
                    socket.destroy();
                    resolve(false);
                }
            });
            socket.on('error', () => {
                try {
                    socket.destroy();
                } catch {
                    /* ignore */
                }
                resolve(false);
            });
            socket.on('timeout', () => {
                try {
                    socket.destroy();
                } catch {
                    /* ignore */
                }
                resolve(false);
            });
        });
    }

    async startAsHost(port = DEFAULT_CHESS_PORT, roomPassword = '') {
        assertTcpSocketsAvailable();
        this.cleanupConnections();
        this.role = 'host';
        this.host = new Host(roomPassword);
        await this.host.start(port);
        this.host.on('move', (...args: unknown[]) => {
            const m = args[0];
            if (typeof m === 'string') void this.emit('move', m);
        });
    }

    async startAsClient(ip: string, port = DEFAULT_CHESS_PORT, roomPassword = '') {
        assertTcpSocketsAvailable();
        this.cleanupConnections();
        this.role = 'client';
        this.client = new Client(ip);
        await this.client.connect(port, roomPassword);
        this.client.on('move', (...args: unknown[]) => {
            const m = args[0];
            if (typeof m === 'string') void this.emit('move', m);
        });
    }

    sendMove(move: string) {
        if (this.role === 'host') this.host?.sendMove(move);
        else this.client?.sendMove(move);
    }
}
