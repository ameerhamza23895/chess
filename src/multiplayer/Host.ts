import TcpSocket from 'react-native-tcp-socket';
import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';

export class Host extends SimpleEventEmitter {
    private server?: ReturnType<typeof TcpSocket.createServer>;
    /** Connected client sockets (typed loosely for RN TcpSocket) */
    private clients: { write: (s: string) => void; destroy: () => void }[] = [];

    start(port = 5000): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = TcpSocket.createServer(socket => {
                this.clients.push(socket);
                socket.on('data', (data: Buffer | string) => {
                    const move = data.toString('utf8').trim();
                    if (!move) return;
                    this.emit('move', move);
                    this.clients.forEach(c => {
                        if (c !== socket) c.write(move);
                    });
                });
                socket.on('error', () => {});
                socket.on('close', () => {
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

    sendMove(move: string) {
        this.clients.forEach(client => {
            try {
                client.write(move);
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
