import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages.js";

type Player = {
  id: string;
  socket: WebSocket;
};

export class Game {
  public player1: Player;
  public player2: Player;
  private board: Chess;
  private startTime: Date;

  constructor(player1: Player, player2: Player) {
    console.log("Game created");

    this.player1 = player1;

    this.player2 = player2;

    this.board = new Chess();
    this.startTime = new Date();

    this.player1.socket.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "white",
          fen: this.board.fen(),
        },
      }),
    );

    this.player2.socket.send(
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
    playerId: string,
    socket: WebSocket,
    move: {
      from: string;
      to: string;
    },
  ) {
    // White can only move when it's White's turn
    if (this.board.isGameOver()) {
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

    this.player1.socket.send(moveMessage);
    this.player2.socket.send(moveMessage);

    // Check for game over AFTER the move
    if (this.board.isGameOver()) {
      let winner: "white" | "black" | null = null;
      let reason="draw";
      if(this.board.isCheckmate()) {
        winner = this.board.turn() === "w" ? "black" : "white";
        reason = "checkmate";
      }else if(this.board.isStalemate()) {
        reason = "stalemate";
      }else if(this.board.isDraw()) {
        reason = "draw";
      }
      const gameOverMessage = JSON.stringify({
        type: GAME_OVER,
        payload: {
          winner,
          reason,
          fen: this.board.fen(),
        },
      });

      this.player1.socket.send(gameOverMessage);
      this.player2.socket.send(gameOverMessage);
    }
  }

  reconnectPlayer(playerId: string, socket: WebSocket) {
    if(this.player1.id === playerId) {
      this.player1.socket = socket;
    } else if(this.player2.id === playerId) {
      this.player2.socket = socket;
    } else {
      console.error("Player not found for reconnection");
      return;
    }
    socket.send(
      JSON.stringify({
        type:INIT_GAME,
        payload: {
          color: this.player1.id === playerId ? "white" : "black",
          fen: this.board.fen(),
        },
      }),
    );
  }
    
}
