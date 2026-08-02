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
    private whiteTimeMs;
    private blackTimeMs;
    private incrementMs;
    private clockStartedAt;
    private timeoutTimer;
    private isOver;
    constructor(player1: Player, player2: Player);
    private getClockPayload;
    private sendToBoth;
    private scheduleTimeout;
    private endByTimeout;
    makeMove(playerId: string, socket: WebSocket, move: {
        from: string;
        to: string;
    }): void;
    reconnectPlayer(playerId: string, socket: WebSocket): void;
}
export {};
//# sourceMappingURL=Game.d.ts.map