// src/sockets/clientSocket.ts
import type { Server, Socket } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { log } from "../utils/logger.js";

/**
 * Events die elke SPELER kan triggeren
 */
export function registerClientSocket(
  io: Server,
  socket: Socket,
  sessions: SessionManager,
  stats: StatsEngine
) {
  // Speler joint een sessie
  socket.on(
    "client:join",
    ({ sessionId, userId, displayName, accessToken }: { sessionId: string; userId: string; displayName: string; accessToken?: string }) => {
      try {
        const s = sessions.join(sessionId, { id: userId, displayName, accessToken });
        socket.join(`session:${sessionId}`);

        // Stuur lijst van huidige users naar iedereen in de sessie
        io.to(`session:${sessionId}`).emit("presence", {
          users: Array.from(s.users.values()).map((u) => ({
            id: u.id,
            displayName: u.displayName,
          })),
        });

        // Nieuwe client krijgt meteen stats
        socket.emit("stats", stats.snapshot(s));

        log.info(`User ${displayName} joined session ${sessionId}`);
      } catch (err: any) {
        log.warn("Client join failed:", err.message);
        socket.emit("error", { error: err.message });
      }
    }
  );

  // (optioneel) disconnect handling
  socket.on("disconnect", (reason) => {
    log.debug("Client disconnected", socket.id, reason);
  });
}
