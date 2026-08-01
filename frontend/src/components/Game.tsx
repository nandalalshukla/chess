import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSocket } from "../hooks/useSocket";

export default function Game() {
  const { socket, connected } = useSocket();

  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(
    null,
  );

  const [chess] = useState(() => new Chess());

  const [fen, setFen] = useState(chess.fen());

  useEffect(() => {
    if (!socket) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data);

      console.log("Received:", message);

      switch (message.type) {
        case "init_game":
          setPlayerColor(message.payload.color);

          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          break;

        case "move":
          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          break;

        case "game_over":
          console.log("Game Over");
          break;

        default:
          console.warn("Unknown message:", message);
      }
    }

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, chess]);

  function startGame() {
    socket?.send(
      JSON.stringify({
        type: "init_game",
      }),
    );
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (!targetSquare || !socket) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type: "move",
        payload: {
          from: sourceSquare,
          to: targetSquare,
        },
      }),
    );

    // Wait for the backend to validate and send back the updated FEN.
    return true;
  }

  return (
    <div>
      <button className="p-4 bg-gray-800 text-white text-2xl" onClick={startGame} disabled={!connected}>
        Play
      </button>

      <p>Color: {playerColor ?? "Waiting..."}</p>

      <div className="w-full max-w-[600px] aspect-square">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: playerColor ?? "white",
            onPieceDrop: handlePieceDrop,
          }}
        />
      </div>
    </div>
  );
}
