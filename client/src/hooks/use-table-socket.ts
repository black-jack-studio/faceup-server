import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/apiBase";

// Live "something changed" nudge for a Play with Friends table lobby. The socket never
// carries game state itself — Postgres (via GET /api/tables/:id) stays the source of truth;
// this only tells the client when to refetch it (see server/websocket.ts). A missed/dropped
// message is harmless, so a short fixed reconnect delay is good enough — no need for
// anything fancier.
export function useTableSocket(tableId: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tableId) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;

      // The browser/WebView attaches the session cookie to the handshake automatically
      // (same as any other request to this origin) — the WebSocket API has no separate
      // "credentials" option to opt into, unlike fetch.
      const wsUrl = `${API_BASE_URL.replace(/^http/, "ws")}/ws/tables`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "join", tableId }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "table_updated" && message.tableId === tableId) {
            queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}`] });
          }
        } catch {
          // Not JSON / not a message we care about — ignore.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, [tableId, queryClient]);
}
