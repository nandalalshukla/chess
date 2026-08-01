import { useEffect, useState } from "react";

export function useSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("Connected to backend");
      setSocket(ws);
      setConnected(true);
    };

    ws.onclose = () => {
      console.log("Disconnected");
      setConnected(false);
      setSocket(null);
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
    };

    return () => {
      ws.close();
    };
  }, []);

  return {
    socket,
    connected,
  };
}
