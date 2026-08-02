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
  const [resultModalOpen, setResultModalOpen] = useState(false);
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
          setGameResult(null);
          setResultModalOpen(false);
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
          setResultModalOpen(true);
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
    setResultModalOpen(false);

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
      backgroundColor: "rgba(245, 246, 130, 0.78)",
    };
  }

  for (const square of legalSquares) {
    squareStyles[square] = {
      background:
        "radial-gradient(circle, rgba(20, 20, 20, 0.32) 21%, transparent 23%)",
    };
  }

  function getDisplayedTime(color: "white" | "black") {
    const baseTime = color === "white" ? whiteTimeMs : blackTimeMs;

    if (!playerColor || gameResult || activeColor !== color) {
      return baseTime;
    }

    return baseTime - (clockTick - clockSyncedAt);
  }

  const bottomColor = playerColor ?? "white";
  const topColor = bottomColor === "white" ? "black" : "white";

  function PlayerBar({
    color,
    label,
  }: {
    color: "white" | "black";
    label: string;
  }) {
    const isActive = activeColor === color && !!playerColor && !gameResult;

    return (
      <div className="flex h-12 items-center justify-between text-[#f2f2f2]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-[#deded1] text-2xl text-[#6b6964] shadow-inner">
            {color === "white" ? "♙" : "♟"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{label}</div>
            <div className="text-xs text-[#aaa69f]">
              {color === "white" ? "White" : "Black"}
            </div>
          </div>
        </div>

        <div
          className={`min-w-28 rounded px-4 py-1.5 text-right font-mono text-3xl font-bold tabular-nums shadow ${
            isActive
              ? "bg-[#f5f5f5] text-[#262421]"
              : "bg-[#262421] text-[#9b9894]"
          }`}
        >
          {formatTime(getDisplayedTime(color))}
        </div>
      </div>
    );
  }

  const statusText = gameResult
    ? "Game over"
    : playerColor
      ? `${activeColor === playerColor ? "Your" : "Opponent's"} move`
      : waitingForOpponent
        ? "Waiting for opponent"
        : connected
          ? "Ready"
          : "Connecting";

  return (
    <main className="min-h-screen bg-[#302e2b] text-[#f2f2f2]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1180px] grid-cols-1 items-center gap-6 px-4 py-5 lg:grid-cols-[minmax(320px,720px)_360px]">
        <section className="mx-auto flex w-full max-w-[700px] flex-col gap-2">
          <PlayerBar color={topColor} label="Opponent" />

          <div className="aspect-square w-full overflow-hidden shadow-2xl">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: playerColor ?? "white",
                onPieceDrop: handlePieceDrop,
                onSquareClick: handleSquareClick,
                squareStyles,
                darkSquareStyle: { backgroundColor: "#769656" },
                lightSquareStyle: { backgroundColor: "#eeeed2" },
              }}
            />
          </div>

          <PlayerBar color={bottomColor} label="You" />
        </section>

        <aside className="mx-auto w-full max-w-[420px] overflow-hidden rounded bg-[#262421] shadow-2xl lg:mx-0">
          <div className="border-b border-[#3c3934] bg-[#211f1c] px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#aaa69f]">
              Current Game
            </div>
            <div className="mt-1 text-2xl font-bold">{statusText}</div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded bg-[#1f1d1a] p-4">
                <div className="text-xs font-semibold uppercase text-[#8f8b85]">
                  You are
                </div>
                <div className="mt-1 text-lg font-bold capitalize">
                  {playerColor ?? "Unassigned"}
                </div>
              </div>
              <div className="rounded bg-[#1f1d1a] p-4">
                <div className="text-xs font-semibold uppercase text-[#8f8b85]">
                  Turn
                </div>
                <div className="mt-1 text-lg font-bold capitalize">
                  {activeColor}
                </div>
              </div>
            </div>

            <button
              className="w-full rounded bg-[#81b64c] px-5 py-3 text-lg font-bold text-white shadow transition hover:bg-[#95c95a] disabled:cursor-not-allowed disabled:bg-[#55524d] disabled:text-[#aaa69f]"
              onClick={startGame}
              disabled={!connected || waitingForOpponent || !!playerColor}
            >
              {waitingForOpponent
                ? "Waiting..."
                : playerColor
                  ? "Game started"
                  : "Play"}
            </button>

            <div className="rounded bg-[#1f1d1a] p-4 text-sm leading-6 text-[#c9c5bd]">
              <div className="font-semibold text-[#f2f2f2]">Connection</div>
              <div>{connected ? "Connected to live game server" : "Connecting to server"}</div>
            </div>
          </div>
        </aside>
      </div>

      {gameResult && resultModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
          <div className="w-full max-w-md overflow-hidden rounded bg-[#f7f6f2] text-[#262421] shadow-2xl">
            <div className="bg-[#81b64c] px-6 py-5 text-center text-white">
              <div className="text-sm font-bold uppercase tracking-wider opacity-90">
                Game Over
              </div>
              <div className="mt-1 text-3xl font-black">Result</div>
            </div>

            <div className="px-6 py-7 text-center">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#e7e5df] text-4xl">
                ♚
              </div>
              <p className="text-2xl font-black">{gameResult}</p>
              <p className="mt-2 text-sm font-medium text-[#6b6964]">
                The final position is still available on the board.
              </p>

              <button
                className="mt-6 w-full rounded bg-[#81b64c] px-5 py-3 text-lg font-bold text-white transition hover:bg-[#95c95a]"
                onClick={() => setResultModalOpen(false)}
              >
                Review board
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
