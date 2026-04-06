import TcpSocket from 'react-native-tcp-socket';
import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';
import { encodeLine, type HelloMsg, type OkMsg, type DenyMsg } from './protocol';
import { assertTcpSocketsAvailable } from './tcpGuard';

type AuthSocket = {
    write: (s: string) => void;
    destroy: () => void;
    on: (ev: string, fn: (...args: unknown[]) => void) => void;
};

/**
 * TCP host: PROBE → hello (scan). JOIN → ok/deny. Then each line = SAN move.
 * Password: empty string = open room.
 */
export class Host extends SimpleEventEmitter {
    private server?: ReturnType<typeof TcpSocket.createServer>;
    private clients: AuthSocket[] = [];

    constructor(private readonly expectedPassword: string = '') {
        super();
    }

    start(port = 5000): Promise<void> {
        assertTcpSocketsAvailable();
        return new Promise((resolve, reject) => {
            this.server = TcpSocket.createServer(socket => {
                let buf = '';
                let phase: 'auth' | 'play' = 'auth';
                let authTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
                    if (phase === 'auth') {
                        try {
                            socket.destroy();
                        } catch {
                            /* ignore */
                        }
                    }
                }, 15000);

                const clearAuthTimer = () => {
                    if (authTimer) {
                        clearTimeout(authTimer);
                        authTimer = undefined;
                    }
                };

                socket.on('data', (data: Buffer | string) => {
                    buf += typeof data === 'string' ? data : data.toString('utf8');
                    while (true) {
                        const idx = buf.indexOf('\n');
                        if (idx === -1) break;
                        const raw = buf.slice(0, idx);
                        buf = buf.slice(idx + 1);
                        const line = raw.trim();
                        if (!line) continue;

                        if (phase === 'auth') {
                            let msg: { t?: string; p?: string };
                            try {
                                msg = JSON.parse(line) as { t?: string; p?: string };
                            } catch {
                                try {
                                    socket.destroy();
                                } catch {
                                    /* ignore */
                                }
                                return;
                            }

                            if (msg.t === 'probe') {
                                clearAuthTimer();
                                const hello: HelloMsg = { t: 'hello' };
                                socket.write(encodeLine(hello));
                                try {
                                    socket.destroy();
                                } catch {
                                    /* ignore */
                                }
                                return;
                            }

                            if (msg.t === 'join') {
                                const pwd = typeof msg.p === 'string' ? msg.p : '';
                                if (pwd === this.expectedPassword) {
                                    clearAuthTimer();
                                    const ok: OkMsg = { t: 'ok' };
                                    socket.write(encodeLine(ok));
                                    phase = 'play';
                                    this.clients.push(socket as AuthSocket);
                                } else {
                                    const deny: DenyMsg = { t: 'deny' };
                                    socket.write(encodeLine(deny));
                                    try {
                                        socket.destroy();
                                    } catch {
                                        /* ignore */
                                    }
                                }
                                continue;
                            }

                            try {
                                socket.destroy();
                            } catch {
                                /* ignore */
                            }
                            return;
                        }

                        /* play phase — SAN move */
                        this.emit('move', line);
                        this.clients.forEach(c => {
                            if (c !== socket) {
                                try {
                                    c.write(line + '\n');
                                } catch {
                                    /* ignore */
                                }
                            }
                        });
                    }
                });

                socket.on('error', () => {});
                socket.on('close', () => {
                    clearAuthTimer();
                    this.clients = this.clients.filter(c => c !== socket);
                });
            });

            const onErr = (err: Error) => {
                reject(err);
            };
            this.server.once('error', onErr);

            this.server.listen({ port, host: '0.0.0.0', reuseAddress: true }, () => {
                this.server?.off('error', onErr);
                resolve();
            });
        });
    }

    sendMove(san: string) {
        const line = san.trim() + '\n';
        this.clients.forEach(client => {
            try {
                client.write(line);
            } catch {
                /* ignore */
            }
        });
    }

    close() {
        for (const c of this.clients) {
            try {
                c.destroy();
            } catch {
                /* ignore */
            }
        }
        this.clients = [];
        if (this.server) {
            try {
                this.server.close();
            } catch {
                /* ignore */
            }
            this.server = undefined;
        }
    }
}
