import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager.js";
const wss = new WebSocketServer({ port: 8080 });
const gameManager = new GameManager();
wss.on("connection", function connection(ws) {
    console.log("New connection established");
    console.log("add handler calling");
    gameManager.addHandler(ws);
    ws.on("close", () => gameManager.removeUser(ws));
});
//# sourceMappingURL=index.js.map