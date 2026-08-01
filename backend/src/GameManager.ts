import { WebSocket } from "ws";
import { Game } from "./Game.js";
import { INIT_GAME, MOVE } from "./messages.js";
import { Chess } from "chess.js";

export class GameManager{
    private games: Game[];
    private users: WebSocket[];
    private pendingUser: WebSocket|null;
    constructor(){
        this.games = [];
        this.users = [];
        this.pendingUser = null;
    }
    addUser(socket: WebSocket) {
        this.users.push(socket);
        
    }
    removeUser(socket: WebSocket) {
        this.users = this.users.filter(user => user !== socket);
    }
    addHandler(socket: WebSocket) {
        socket.on("message", (message: string) => {
            const msg = JSON.parse(message.toString());
            if(msg.type===INIT_GAME){
                if (this.pendingUser) { 
                  const game = new Game(this.pendingUser, socket);
                    this.games.push(game);
                    this.pendingUser = null;
                  
                }
                   
            }
            if (msg.type === MOVE) {
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if(game) {
                    game.makeMove(socket, msg.move);
                }
                if (!game) {
                    return;
                }
            }
            else {
                this.pendingUser = socket;
            }
    }
}