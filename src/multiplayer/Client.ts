import TcpSocket from 'react-native-tcp-socket';
import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';
import { encodeLine, type JoinMsg } from './protocol';
import { assertTcpSocketsAvailable } from './tcpGuard';

export class Client extends SimpleEventEmitter {
    /** TcpSocket Socket instance */
    private socket?: any;
    private hostIP: string;

    constructor(hostIP: string) {
        super();
        this.hostIP = hostIP;
    }

    connect(port = 5000, password = ''): Promise<void> {
        assertTcpSocketsAvailable();
        return new Promise((resolve, reject) => {
            let buf = '';
            let phase: 'auth' | 'play' = 'auth';
            let settled = false;

            this.socket = TcpSocket.createConnection({ host: this.hostIP, port }, () => {
                const join: JoinMsg = { t: 'join', p: password };
                this.socket.write(encodeLine(join));
            });

            this.socket.on('data', (data: Buffer | string) => {
                buf += typeof data === 'string' ? data : data.toString('utf8');
                while (true) {
                    const idx = buf.indexOf('\n');
                    if (idx === -1) break;
                    const raw = buf.slice(0, idx);
                    buf = buf.slice(idx + 1);
                    const line = raw.trim();
                    if (!line) continue;

                    if (phase === 'auth') {
                        try {
                            const msg = JSON.parse(line) as { t?: string };
                            if (msg.t === 'ok') {
                                phase = 'play';
                                if (!settled) {
                                    settled = true;
                                    resolve();
                                }
                                continue;
                            }
                            if (msg.t === 'deny') {
                                if (!settled) {
                                    settled = true;
                                    reject(new Error('Room password was refused.'));
                                }
                                this.socket.destroy();
                                return;
                            }
                        } catch {
                            if (!settled) {
                                settled = true;
                                reject(new Error('Invalid server response.'));
                            }
                            this.socket.destroy();
                            return;
                        }
                    } else {
                        this.emit('move', line);
                    }
                }
            });

            this.socket.on('error', (err: Error) => {
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            });
        });
    }

    sendMove(san: string) {
        try {
            this.socket?.write(san.trim() + '\n');
        } catch {
            /* ignore */
        }
    }

    disconnect() {
        if (this.socket) {
            try {
                this.socket.destroy();
            } catch {
                /* ignore */
            }
            this.socket = undefined;
        }
    }
}
