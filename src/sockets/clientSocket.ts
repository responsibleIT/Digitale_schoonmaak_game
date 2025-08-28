// src/sockets/clientSocket.ts
import type { Server, Socket } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { log } from "../utils/logger.js";

export function registerClientSocket(
  io: Server,
  socket: Socket,
  sessions: SessionManager,
  stats: StatsEngine
) {

  // Log every event the server receives from this socket
  socket.onAny((event, ...args) => {
    console.log(`[srv] onAny ${event}`, args?.[0]);
  });

  // Player joins a session room
  socket.on("client:join", ({ sessionId, userId, displayName, accessToken }) => {
    try {
      const s = sessions.join(sessionId, { id: userId, displayName, accessToken });
      socket.join(`session:${sessionId}`);

      const users = Array.from(s.users.values()).map(u => ({ id: u.id, displayName: u.displayName }));
      io.to(`session:${sessionId}`).emit("presence", { users, phase: s.phase });

      socket.emit("client:joined", { ok: true, sessionId });
      console.log(`[srv] client:join ok ${displayName} -> ${sessionId}`);   // 👈 add this
    } catch (e:any) {
      console.warn("[srv] client:join failed:", e.message);
      socket.emit("error", { error: e.message });
    }
  });

  // Let any client ask for the current presence snapshot (defensive)
  socket.on("presence:request", ({ sessionId }) => {
    const s = sessions.get(sessionId);
    if (!s) return;
    const users = Array.from(s.users.values()).map(u => ({ id: u.id, displayName: u.displayName }));
    socket.emit("presence", { users, phase: s.phase });
    console.log(`[srv] presence:request -> ${sessionId} users=${users.length}`);
  });
}
