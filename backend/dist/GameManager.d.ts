import { WebSocket } from "ws";
type Player = {
    id: string;
    socket: WebSocket;
};
export declare class GameManager {
    private games;
    private users;
    private pendingUser;
    constructor();
    addUser(player: Player): void;
    removeUser(socket: WebSocket): void;
    addHandler(socket: WebSocket): void;
}
export {};
//# sourceMappingURL=GameManager.d.ts.map