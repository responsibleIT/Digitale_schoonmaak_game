// src/sockets/hostSocket.ts
import type { Server, Socket } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { log } from "../utils/logger.js";

export function registerHostSocket(
  io: Server,
  socket: Socket,
  sessions: SessionManager,
  stats: StatsEngine
) {
  // Create a new session and show code to the host
  socket.on("host:start", () => {
    const s = sessions.create(socket.id);
    socket.join(`session:${s.id}`);
    socket.emit("host:sessionId", { sessionId: s.id });
  });

  // BEGIN the game: set phase=started, notify everyone, push initial stats
  socket.on("host:begin", ({ sessionId }: { sessionId: string }) => {
    try {
      const s = sessions.start(sessionId); // SessionManager.start sets phase = "started"
      io.to(`session:${sessionId}`).emit("game:started", { sessionId });
      // Immediately show stats on the host screen
      io.to(`session:${sessionId}`).emit("stats", stats.snapshot(s));
      log.info("Game started for session", sessionId);
    } catch (e: any) {
      log.warn("host:begin failed:", e?.message);
      socket.emit("error", { error: e?.message ?? "Unable to start game" });
    }
  });

  // End session (cleanup)
  socket.on("host:end", ({ sessionId }: { sessionId: string }) => {
    sessions.end(sessionId);
    io.to(`session:${sessionId}`).emit("session:ended", {});
    log.info("Host ended session", sessionId);
  });

  // Optional: manual refresh
  socket.on("host:requestStats", ({ sessionId }: { sessionId: string }) => {
    const s = sessions.get(sessionId);
    if (!s) return;
    socket.emit("stats", stats.snapshot(s));
  });
}