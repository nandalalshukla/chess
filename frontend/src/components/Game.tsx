import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useSocket, getPlayerId } from "../hooks/useSocket";

export default function Game() {
  const { socket, connected } = useSocket();

  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(
    null,
  );
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
    const [gameResult, setGameResult] = useState<string | null>(null);

  const [chess] = useState(() => new Chess());

  const [fen, setFen] = useState(chess.fen());


  useEffect(() => {
    if (!socket) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data);

      console.log("Received:", message);

      switch (message.type) {
        case "init_game":
          setWaitingForOpponent(false);
          setPlayerColor(message.payload.color);
          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          break;

        case "move":
          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          break;

        case "game_over":
          if (message.payload.winner) {
            setGameResult(
              `${message.payload.winner} wins by ${message.payload.reason}`,
            );
          } else {
            setGameResult(`Game drawn by ${message.payload.reason}`);
          }
          break;

        default:
          console.warn("Unknown message:", message);
      }
    }

    socket.addEventListener("message", handleMessage);

    socket.send(
      JSON.stringify({
        type: "reconnect",
        payload: {
          playerId: getPlayerId(),
        },
      }),
    );

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, chess]);

  function startGame() {
    if (!socket || waitingForOpponent || playerColor) return;

    setWaitingForOpponent(true);

    socket.send(
      JSON.stringify({
        type: "init_game",
        payload: {
          playerId: getPlayerId(),
        },
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
    if (!targetSquare || !socket || gameResult) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type: "move",
        payload: {
          playerId: getPlayerId(),
          move: {
            from: sourceSquare,
            to: targetSquare,
          },
        },
      }),
    );

    // Wait for the backend to validate and send back the updated FEN.
    return true;
  }

  return (
    <div>
      <button
        className="p-4 bg-gray-800 text-white text-2xl disabled:cursor-not-allowed disabled:opacity-60"
        onClick={startGame}
        disabled={!connected || waitingForOpponent || !!playerColor}
      >
        {waitingForOpponent
          ? "Waiting..."
          : playerColor
            ? "Game started"
            : "Play"}
      </button>

      <p>Color: {playerColor ?? "Waiting..."}</p>

      {gameResult && (
        <div className="my-4 p-4 bg-yellow-100 text-black text-xl font-bold">
          {gameResult}
        </div>
      )}
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
