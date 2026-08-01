
import { WebSocket } from "ws";
import {Chess} from "chess.js";
import { GAME_OVER } from "./messages.js";
export class Game {
    public player1: WebSocket;
    public player2: WebSocket;
    private board: Chess;

    private startTime: Date;

    constructor(player1: WebSocket, player2: WebSocket) {
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.startTime = new Date();
    }
    makeMove(socket: WebSocket, move: {
        from: string;
        to: string;
    }) {
        if(this.board.moves.length%2 === 0 && socket !== this.player1) {
            return;
        }
        if(this.board.moves.length%2 === 1 && socket !== this.player2) {
            return;
        }
        try {
            this.board.move(move);
        }catch(e) {
            console.error(e);
        }
        if (this.board.isGameOver()) {
            this.player1.emit(JSON.stringify({
                type: GAME_OVER,
                payload: {
                    winner: this.board.turn() === 'w' ? 'black' : 'white',
                    reason: this.board.isCheckmate() ? 'checkmate' : this.board.isStalemate() ? 'stalemate' : 'draw'
                }
            }))
            return;
        }
        if (this.board.moves.length % 2 === 0) {
            this.player2.emit(JSON.stringify({
                type: "move",
                payload: {
                    from: move.from,
                    to: move.to,
                    fen: this.board.fen()
                }
            }));
        } else {
            this.player1.emit(JSON.stringify({
                type: "move",
                payload: {
                    from: move.from,
                    to: move.to,
                    fen: this.board.fen()
                }
            }));
        }
    }

}