import TcpSocket from 'react-native-tcp-socket';
import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';

export class Client extends SimpleEventEmitter {
    private socket?: any;
    private hostIP: string;

    constructor(hostIP: string) {
        super();
        this.hostIP = hostIP;
    }

    connect(port = 5000) {
        return new Promise<void>((resolve, reject) => {
            this.socket = TcpSocket.createConnection({ host: this.hostIP, port }, () => {
                resolve();
            });

            this.socket.on('data', (data: Buffer | string) => {
                const move = data.toString().trim();
                this.emit('move', move);
            });

            this.socket.on('error', reject);
        });
    }

    sendMove(move: string) {
        try {
            this.socket?.write(move);
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