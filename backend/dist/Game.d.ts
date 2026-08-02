import { WebSocket } from "ws";
type Player = {
    id: string;
    socket: WebSocket;
};
export declare class Game {
    player1: Player;
    player2: Player;
    private board;
    private startTime;
    constructor(player1: Player, player2: Player);
    makeMove(playerId: string, socket: WebSocket, move: {
        from: string;
        to: string;
    }): void;
    reconnectPlayer(playerId: string, socket: WebSocket): void;
}
export {};
//# sourceMappingURL=Game.d.ts.map