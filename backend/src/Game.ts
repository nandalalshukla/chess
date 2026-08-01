import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { GAME_OVER, INIT_GAME } from "./messages.js";
export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  private board: Chess;

  private startTime: Date;

  constructor(player1: WebSocket, player2: WebSocket) {
    console.log("game created");
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
    if (this.board.turn() === "w" && socket !== this.player1) {
      console.log("It's White's turn.");
      return;
    }

    if (this.board.turn() === "b" && socket !== this.player2) {
      console.log("It's Black's turn.");
      return;
    }
    try {
      this.board.move(move);
    } catch (e) {
      console.error(e);
    }
    if (this.board.isGameOver()) {
      this.player1.send(
        JSON.stringify({
          type: GAME_OVER,
          payload: {
            winner: this.board.turn() === "w" ? "black" : "white",
            reason: this.board.isCheckmate()
              ? "checkmate"
              : this.board.isStalemate()
                ? "stalemate"
                : "draw",
          },
        }),
      );
      return;
    }
    if (this.board.turn() === "b") {
      console.log("move made by player 1");
      this.player2.send(
        JSON.stringify({
          type: "move",
          payload: {
            from: move.from,
            to: move.to,
            fen: this.board.fen(),
          },
        }),
      );
      console.log("move sent to player 2");
    } else {
      console.log("move made by player 2");
      this.player1.send(
        JSON.stringify({
          type: "move",
          payload: {
            from: move.from,
            to: move.to,
            fen: this.board.fen(),
          },
        }),
      );
      console.log("move sent to player 1");
    }
  }
}
