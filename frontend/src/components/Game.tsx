import { useEffect, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { SquareHandlerArgs } from "react-chessboard";
import { useSocket, getPlayerId } from "../hooks/useSocket";

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function Game() {
  const { socket, connected } = useSocket();

  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(
    null,
  );
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalSquares, setLegalSquares] = useState<string[]>([]);
  const [whiteTimeMs, setWhiteTimeMs] = useState(10 * 60 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState(10 * 60 * 1000);
  const [activeColor, setActiveColor] = useState<"white" | "black">("white");
  const [clockSyncedAt, setClockSyncedAt] = useState(Date.now());
  const [clockTick, setClockTick] = useState(Date.now());

  const [chess] = useState(() => new Chess());

  const [fen, setFen] = useState(chess.fen());

  function syncClock(payload: {
    whiteTimeMs?: number;
    blackTimeMs?: number;
    activeColor?: "white" | "black";
  }) {
    if (typeof payload.whiteTimeMs === "number") {
      setWhiteTimeMs(payload.whiteTimeMs);
    }

    if (typeof payload.blackTimeMs === "number") {
      setBlackTimeMs(payload.blackTimeMs);
    }

    if (payload.activeColor) {
      setActiveColor(payload.activeColor);
    }

    setClockSyncedAt(Date.now());
    setClockTick(Date.now());
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      setClockTick(Date.now());
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    function handleMessage(event: MessageEvent) {
      const message = JSON.parse(event.data);

      console.log("Received:", message);

      switch (message.type) {
        case "init_game":
          setWaitingForOpponent(false);
          setPlayerColor(message.payload.color);
          setSelectedSquare(null);
          setLegalSquares([]);
          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          syncClock(message.payload);
          break;

        case "move":
          setSelectedSquare(null);
          setLegalSquares([]);
          chess.load(message.payload.fen);
          setFen(message.payload.fen);
          syncClock(message.payload);
          break;

        case "game_over":
          syncClock(message.payload);

          if (message.payload.winner) {
            setGameResult(
              `${message.payload.winner} wins by ${message.payload.reason}`,
            );
          } else {
            setGameResult(`Game drawn by ${message.payload.reason}`);
          }
          setSelectedSquare(null);
          setLegalSquares([]);
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
    setGameResult(null);

    socket.send(
      JSON.stringify({
        type: "init_game",
        payload: {
          playerId: getPlayerId(),
        },
      }),
    );
  }

  function selectSquare(square: string) {
    const piece = chess.get(square as Square);

    if (!piece) {
      setSelectedSquare(null);
      setLegalSquares([]);
      return;
    }

    if (playerColor === "white" && piece.color !== "w") return;
    if (playerColor === "black" && piece.color !== "b") return;

    const moves = chess.moves({
      square: square as Square,
      verbose: true,
    });

    if (moves.length === 0) {
      setSelectedSquare(null);
      setLegalSquares([]);
      return;
    }

    setSelectedSquare(square);
    setLegalSquares(moves.map((move) => move.to));
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (!socket || gameResult || !playerColor) return;

    if (!selectedSquare) {
      selectSquare(square);
      return;
    }

    if (legalSquares.includes(square)) {
      socket.send(
        JSON.stringify({
          type: "move",
          payload: {
            playerId: getPlayerId(),
            move: {
              from: selectedSquare,
              to: square,
            },
          },
        }),
      );

      setSelectedSquare(null);
      setLegalSquares([]);
      return;
    }

    selectSquare(square);
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

    setSelectedSquare(null);
    setLegalSquares([]);

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

  const squareStyles: Record<string, CSSProperties> = {};

  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      backgroundColor: "rgba(245, 158, 11, 0.55)",
    };
  }

  for (const square of legalSquares) {
    squareStyles[square] = {
      background:
        "radial-gradient(circle, rgba(17, 24, 39, 0.42) 22%, transparent 24%)",
    };
  }

  function getDisplayedTime(color: "white" | "black") {
    const baseTime = color === "white" ? whiteTimeMs : blackTimeMs;

    if (!playerColor || gameResult || activeColor !== color) {
      return baseTime;
    }

    return baseTime - (clockTick - clockSyncedAt);
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

      <div className="my-4 flex gap-4 text-xl font-bold">
        <div
          className={`p-3 ${
            activeColor === "white" && !gameResult ? "bg-green-200" : "bg-gray-200"
          }`}
        >
          White: {formatTime(getDisplayedTime("white"))}
        </div>
        <div
          className={`p-3 ${
            activeColor === "black" && !gameResult ? "bg-green-200" : "bg-gray-200"
          }`}
        >
          Black: {formatTime(getDisplayedTime("black"))}
        </div>
      </div>

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
            onSquareClick: handleSquareClick,
            squareStyles,
          }}
        />
      </div>
    </div>
  );
}
