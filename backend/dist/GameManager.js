import { WebSocket } from "ws";
import { Game } from "./Game.js";
import { INIT_GAME, MOVE } from "./messages.js";
import { Chess } from "chess.js";
export class GameManager {
    games;
    users;
    pendingUser;
    constructor() {
        this.games = [];
        this.users = [];
        this.pendingUser = null;
    }
    addUser(socket) {
        this.users.push(socket);
    }
    removeUser(socket) {
        this.users = this.users.filter((user) => user !== socket);
    }
    addHandler(socket) {
        socket.on("message", (message) => {
            const msg = JSON.parse(message.toString());
            if (msg.type === INIT_GAME) {
                if (this.pendingUser) {
                    const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    this.pendingUser = null;
                }
                else {
                    this.pendingUser = socket;
                }
                return;
            }
            if (msg.type === MOVE) {
                const game = this.games.find((g) => g.player1 === socket || g.player2 === socket);
                if (!game) {
                    return;
                }
                game.makeMove(socket, msg.payload);
            }
        });
    }
}
//# sourceMappingURL=GameManager.js.map