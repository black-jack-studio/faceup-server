import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/apiBase";

// Live "something changed" nudge for a Play with Friends table lobby. The socket never
// carries game state itself — Postgres (via GET /api/tables/:id) stays the source of truth;
// this only tells the client when to refetch it (see server/websocket.ts). A missed/dropped
// message is harmless, so a short fixed reconnect delay is good enough — no need for
// anything fancier.
//
// The one exception is emote_sent: that message *is* the whole payload (see broadcastEmote
// server-side) — there's nothing to refetch, so it's handed straight to onEmote instead of
// triggering a query invalidation like table_updated does.
export function useTableSocket(
  tableId: string | null,
  onEmote?: (userId: string, emoteId: string) => void
) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  // A ref, not a dependency of the effect below: callers typically pass an inline callback
  // that's a new function every render, and reconnecting the socket on every render just to
  // pick up the latest closure would be wasteful — this way the effect only ever depends on
  // tableId, and always calls whatever the latest onEmote happens to be.
  const onEmoteRef = useRef(onEmote);
  onEmoteRef.current = onEmote;

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
          } else if (message?.type === "emote_sent" && message.tableId === tableId) {
            onEmoteRef.current?.(message.userId, message.emoteId);
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
