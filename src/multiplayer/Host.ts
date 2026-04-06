import TcpSocket from 'react-native-tcp-socket';
import { SimpleEventEmitter } from '../utils/SimpleEventEmitter';

export class Host extends SimpleEventEmitter {
    private server?: any;
    private clients: any[] = [];

    start(port = 5000) {
        return new Promise<void>(resolve => {
            this.server = TcpSocket.createServer(socket => {
                this.clients.push(socket);
                socket.on('data', (data: Buffer | string) => {
                    const move = data.toString().trim();
                    this.emit('move', move);
                    this.clients.forEach(c => {
                        if (c !== socket) c.write(move);
                    });
                });
            }).listen({ port });
            resolve();
        });
    }

    sendMove(move: string) {
        this.clients.forEach(client => client.write(move));
    }
}