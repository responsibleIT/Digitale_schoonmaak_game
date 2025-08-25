// src/sockets/hostSocket.ts
import type { Server, Socket } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { log } from "../utils/logger.js";

/**
 * Events die alleen de HOST kan triggeren
 */
export function registerHostSocket(
  io: Server,
  socket: Socket,
  sessions: SessionManager,
  stats: StatsEngine
) {
  // Host start een nieuwe sessie
  socket.on("host:start", () => {
    const s = sessions.create(socket.id);
    socket.join(`session:${s.id}`);
    socket.emit("host:sessionId", { sessionId: s.id });
    log.info("Host started session", s.id);
  });

  // Host beëindigt de sessie
  socket.on("host:end", ({ sessionId }: { sessionId: string }) => {
    sessions.end(sessionId);
    io.to(`session:${sessionId}`).emit("session:ended", {});
    log.info("Host ended session", sessionId);
  });

  // Host vraagt om actuele stats
  socket.on("host:requestStats", ({ sessionId }: { sessionId: string }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    socket.emit("stats", stats.snapshot(session));
  });
}
