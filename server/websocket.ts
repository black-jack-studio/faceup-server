import type { Server as HttpServer, IncomingMessage } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket } from "ws";
import { sessionMiddleware } from "./session";
import { storage } from "./storage";

// Play with Friends lobby — live "something changed, go refetch" nudges. Postgres (via the
// /api/tables routes) stays the only source of truth; this never carries game state itself,
// so a dropped/missed message is harmless — the client just refetches on its next poll or
// reconnect. Single in-memory registry is fine: Render's free tier is one Node process with
// no Redis, same assumption the existing season/challenge setInterval jobs in
// server/index.ts already rely on.
const rooms = new Map<string, Set<WebSocket>>();

function addToRoom(tableId: string, ws: WebSocket) {
  let room = rooms.get(tableId);
  if (!room) {
    room = new Set();
    rooms.set(tableId, room);
  }
  room.add(ws);
}

function removeFromRoom(tableId: string, ws: WebSocket) {
  const room = rooms.get(tableId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(tableId);
}

export function broadcastTableUpdate(tableId: string) {
  const room = rooms.get(tableId);
  if (!room) return;
  const payload = JSON.stringify({ type: "table_updated", tableId });
  room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function handleConnection(ws: WebSocket, userId: string) {
  let joinedTableId: string | null = null;

  ws.on("message", async (raw) => {
    let message: any;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (message?.type !== "join" || typeof message.tableId !== "string") return;

    // Only let a user subscribe to a table they actually have a seat at — mirrors the same
    // check the REST routes do, so the socket can't be used to snoop on someone else's table.
    const activeTable = await storage.getUserActiveTable(userId);
    if (!activeTable || activeTable.id !== message.tableId) return;

    const tableId: string = message.tableId;
    joinedTableId = tableId;
    addToRoom(tableId, ws);
  });

  ws.on("close", () => {
    if (joinedTableId) removeFromRoom(joinedTableId, ws);
  });
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request: IncomingMessage, socket: Socket, head: Buffer) => {
    if (!request.url?.startsWith("/ws/tables")) {
      socket.destroy();
      return;
    }

    // Authenticated the same way as any other request: run it through the exact same
    // session middleware/store as the REST API (server/session.ts) — no separate
    // token/handshake to design or keep in sync.
    sessionMiddleware(request as any, {} as any, () => {
      const userId = (request as any).session?.userId;
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        handleConnection(ws, userId);
      });
    });
  });
}
