import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages.js";
export class Game {
    player1;
    player2;
    board;
    startTime;
    whiteTimeMs;
    blackTimeMs;
    incrementMs;
    clockStartedAt;
    timeoutTimer;
    isOver;
    constructor(player1, player2) {
        console.log("Game created");
        this.player1 = player1;
        this.player2 = player2;
        this.board = new Chess();
        this.startTime = new Date();
        this.whiteTimeMs = 10 * 60 * 1000;
        this.blackTimeMs = 10 * 60 * 1000;
        this.incrementMs = 0;
        this.clockStartedAt = Date.now();
        this.timeoutTimer = null;
        this.isOver = false;
        this.player1.socket.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "white",
                fen: this.board.fen(),
                ...this.getClockPayload(),
            },
        }));
        this.player2.socket.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: "black",
                fen: this.board.fen(),
                ...this.getClockPayload(),
            },
        }));
        this.scheduleTimeout();
    }
    getClockPayload() {
        const now = Date.now();
        let whiteTimeMs = this.whiteTimeMs;
        let blackTimeMs = this.blackTimeMs;
        if (!this.isOver) {
            const elapsed = now - this.clockStartedAt;
            if (this.board.turn() === "w") {
                whiteTimeMs -= elapsed;
            }
            else {
                blackTimeMs -= elapsed;
            }
        }
        return {
            whiteTimeMs: Math.max(0, whiteTimeMs),
            blackTimeMs: Math.max(0, blackTimeMs),
            activeColor: this.board.turn() === "w" ? "white" : "black",
            serverTimeMs: now,
        };
    }
    sendToBoth(message) {
        this.player1.socket.send(message);
        this.player2.socket.send(message);
    }
    scheduleTimeout() {
        if (this.timeoutTimer) {
            clearTimeout(this.timeoutTimer);
        }
        if (this.isOver)
            return;
        const timeLeft = this.board.turn() === "w" ? this.whiteTimeMs : this.blackTimeMs;
        this.timeoutTimer = setTimeout(() => {
            this.endByTimeout();
        }, Math.max(0, timeLeft));
    }
    endByTimeout(clockAlreadyUpdated = false) {
        if (this.isOver)
            return;
        if (!clockAlreadyUpdated) {
            const now = Date.now();
            const elapsed = now - this.clockStartedAt;
            if (this.board.turn() === "w") {
                this.whiteTimeMs = Math.max(0, this.whiteTimeMs - elapsed);
            }
            else {
                this.blackTimeMs = Math.max(0, this.blackTimeMs - elapsed);
            }
        }
        this.isOver = true;
        const gameOverMessage = JSON.stringify({
            type: GAME_OVER,
            payload: {
                winner: this.board.turn() === "w" ? "black" : "white",
                reason: "timeout",
                fen: this.board.fen(),
                ...this.getClockPayload(),
            },
        });
        this.sendToBoth(gameOverMessage);
    }
    makeMove(playerId, socket, move) {
        // White can only move when it's White's turn
        if (this.isOver || this.board.isGameOver()) {
            return;
        }
        if (this.board.turn() === "w" && playerId !== this.player1.id) {
            console.log("It's White's turn.");
            return;
        }
        // Black can only move when it's Black's turn
        if (this.board.turn() === "b" && playerId !== this.player2.id) {
            console.log("It's Black's turn.");
            return;
        }
        const now = Date.now();
        const elapsed = now - this.clockStartedAt;
        const turnBeforeMove = this.board.turn();
        if (turnBeforeMove === "w") {
            this.whiteTimeMs -= elapsed;
        }
        else {
            this.blackTimeMs -= elapsed;
        }
        if (this.whiteTimeMs <= 0 || this.blackTimeMs <= 0) {
            this.whiteTimeMs = Math.max(0, this.whiteTimeMs);
            this.blackTimeMs = Math.max(0, this.blackTimeMs);
            this.endByTimeout(true);
            return;
        }
        try {
            this.board.move(move);
        }
        catch (error) {
            console.error("Invalid move:", error);
            if (turnBeforeMove === "w") {
                this.whiteTimeMs += elapsed;
            }
            else {
                this.blackTimeMs += elapsed;
            }
            return;
        }
        if (turnBeforeMove === "w") {
            this.whiteTimeMs += this.incrementMs;
        }
        else {
            this.blackTimeMs += this.incrementMs;
        }
        this.clockStartedAt = now;
        // Send updated board to BOTH players
        const moveMessage = JSON.stringify({
            type: MOVE,
            payload: {
                from: move.from,
                to: move.to,
                fen: this.board.fen(),
                ...this.getClockPayload(),
            },
        });
        this.sendToBoth(moveMessage);
        // Check for game over AFTER the move
        if (this.board.isGameOver()) {
            this.isOver = true;
            if (this.timeoutTimer) {
                clearTimeout(this.timeoutTimer);
            }
            let winner = null;
            let reason = "draw";
            if (this.board.isCheckmate()) {
                winner = this.board.turn() === "w" ? "black" : "white";
                reason = "checkmate";
            }
            else if (this.board.isStalemate()) {
                reason = "stalemate";
            }
            else if (this.board.isDraw()) {
                reason = "draw";
            }
            const gameOverMessage = JSON.stringify({
                type: GAME_OVER,
                payload: {
                    winner,
                    reason,
                    fen: this.board.fen(),
                    ...this.getClockPayload(),
                },
            });
            this.sendToBoth(gameOverMessage);
            return;
        }
        this.scheduleTimeout();
    }
    reconnectPlayer(playerId, socket) {
        if (this.player1.id === playerId) {
            this.player1.socket = socket;
        }
        else if (this.player2.id === playerId) {
            this.player2.socket = socket;
        }
        else {
            console.error("Player not found for reconnection");
            return;
        }
        socket.send(JSON.stringify({
            type: INIT_GAME,
            payload: {
                color: this.player1.id === playerId ? "white" : "black",
                fen: this.board.fen(),
                ...this.getClockPayload(),
            },
        }));
    }
}
//# sourceMappingURL=Game.js.map