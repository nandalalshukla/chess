import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages.js";

export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  private board: Chess;
  private startTime: Date;

  constructor(player1: WebSocket, player2: WebSocket) {
    console.log("Game created");

    this.player1 = player1;
    this.player2 = player2;
    this.board = new Chess();
    this.startTime = new Date();

    this.player1.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "white",
          fen: this.board.fen(),
        },
      }),
    );

    this.player2.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "black",
          fen: this.board.fen(),
        },
      }),
    );
  }

  makeMove(
    socket: WebSocket,
    move: {
      from: string;
      to: string;
    },
  ) {
    // White can only move when it's White's turn
    if (this.board.turn() === "w" && socket !== this.player1) {
      console.log("It's White's turn.");
      return;
    }

    // Black can only move when it's Black's turn
    if (this.board.turn() === "b" && socket !== this.player2) {
      console.log("It's Black's turn.");
      return;
    }

    try {
      this.board.move(move);
    } catch (error) {
      console.error("Invalid move:", error);
      return;
    }

    // Send updated board to BOTH players
    const moveMessage = JSON.stringify({
      type: MOVE,
      payload: {
        from: move.from,
        to: move.to,
        fen: this.board.fen(),
      },
    });

    this.player1.send(moveMessage);
    this.player2.send(moveMessage);

    // Check for game over AFTER the move
    if (this.board.isGameOver()) {
      const gameOverMessage = JSON.stringify({
        type: GAME_OVER,
        payload: {
          winner: this.board.turn() === "w" ? "black" : "white",
          reason: this.board.isCheckmate()
            ? "checkmate"
            : this.board.isStalemate()
              ? "stalemate"
              : "draw",
        },
      });

      this.player1.send(gameOverMessage);
      this.player2.send(gameOverMessage);
    }
  }
}
