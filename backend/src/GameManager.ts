import { WebSocket } from "ws";
import { Game } from "./Game.js";
import { INIT_GAME, MOVE, RECONNECT } from "./messages.js";

type Player = {
  id: string;
  socket: WebSocket;
};

export class GameManager {
  private games: Game[];
  private users: Player[];
  private pendingUser: Player | null;

  constructor() {
    this.games = [];
    this.users = [];
    this.pendingUser = null;
  }

  addUser(player: Player) {
    this.users.push(player);
  }

  removeUser(socket: WebSocket) {
    this.users = this.users.filter((user) => user.socket !== socket);

    if (this.pendingUser?.socket === socket) {
      this.pendingUser = null;
    }
  }

  addHandler(socket: WebSocket) {
    console.log("add handler called");

    socket.on("message", (message) => {
      const msg = JSON.parse(message.toString());
      console.log("message listener fired", msg);

      if (msg.type === INIT_GAME) {
        const playerId = msg.payload?.playerId;

        if (!playerId) {
          console.log("init_game missing playerId");
          return;
        }

        const player: Player = {
          id: playerId,
          socket,
        };

        if (this.pendingUser?.id === player.id) {
          console.log("Same user already waiting");
          return;
        }

        if (this.pendingUser) {
          const game = new Game(this.pendingUser, player);
          this.games.push(game);
          this.addUser(player);
          this.pendingUser = null;
        } else {
          this.pendingUser = player;
          this.addUser(player);
        }

        return;
      }

      if (msg.type === MOVE) {
        const playerId = msg.payload.playerId;
        const game = this.games.find(
          (g) => g.player1.id === playerId  || g.player2.id === playerId,
        );

        if (!game) {
          return;
        }

        game.makeMove(playerId, socket, msg.payload.move);
      }

      if (msg.type === RECONNECT) {
        const game = this.games.find(
          (g) =>
            g.player1.id === msg.payload.playerId ||
            g.player2.id === msg.payload.playerId,
        );

        if (!game) {
          console.log("No active game found for reconnect");
          return;
        }

        game.reconnectPlayer(msg.payload.playerId, socket);
      }
    });
  }
}
