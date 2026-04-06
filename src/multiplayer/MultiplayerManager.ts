import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';
import { Host } from './Host';
import { Client } from './Client';
import NetInfo from '@react-native-community/netinfo';
import TcpSocket from 'react-native-tcp-socket';

export type MultiplayerRole = 'host' | 'client';

export class MultiplayerManager extends SimpleEventEmitter {
    private role?: MultiplayerRole;
    private host?: Host;
    private client?: Client;

    async scanLocalNetwork(port = 5000): Promise<string[]> {
        const state = await NetInfo.fetch();
        if (!state.isConnected || !state.details || !('ipAddress' in state.details)) {
            return [];
        }

        const ip = state.details.ipAddress as string;
        const subnet = ip.substring(0, ip.lastIndexOf('.') + 1);
        const foundHosts: string[] = [];

        // Scan subnet (1-255)
        // Note: For production, we'd use a more parallel approach or Zeroconf
        // Here we'll do a batch of 20 at a time to avoid overwhelming the OS
        const pings = [];
        for (let i = 1; i < 255; i++) {
            const targetIp = subnet + i;
            if (targetIp === ip) continue;

            pings.push(this.checkHost(targetIp, port).then(found => {
                if (found) foundHosts.push(targetIp);
                this.emit('scan_progress', i / 255);
            }));
        }

        await Promise.all(pings);
        return foundHosts;
    }

    private checkHost(ip: string, port: number): Promise<boolean> {
        return new Promise(resolve => {
            const socket = TcpSocket.createConnection({ host: ip, port }, () => {
                socket.destroy();
                resolve(true);
            });
            socket.setTimeout(200); // Very short timeout for scanning
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
        });
    }

    async startAsHost(port = 5000) {
        this.role = 'host';
        this.host = new Host();
        await this.host.start(port);
        this.host.on('move', move => this.emit('move', move));
    }

    async startAsClient(ip: string, port = 5000) {
        this.role = 'client';
        this.client = new Client(ip);
        await this.client.connect(port);
        this.client.on('move', move => this.emit('move', move));
    }

    sendMove(move: string) {
        if (this.role === 'host') this.host?.sendMove(move);
        else this.client?.sendMove(move);
    }
}