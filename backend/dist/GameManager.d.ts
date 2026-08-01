import { WebSocket } from "ws";
export declare class GameManager {
    private games;
    private users;
    private pendingUser;
    constructor();
    addUser(socket: WebSocket): void;
    removeUser(socket: WebSocket): void;
    addHandler(socket: WebSocket): void;
}
//# sourceMappingURL=GameManager.d.ts.map