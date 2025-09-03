// src/sockets/clientSocket.ts
import type { Server, Socket } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { log } from "../utils/logger.js";

function presentUsers(sessions: SessionManager, sessionId: string) {
  const s = sessions.get(sessionId);
  if (!s) return { users: [], allReady: false, phase: "lobby" as const };
  const users = Array.from(s.users.values()).map(u => ({
    id: u.id,
    displayName: u.displayName,
    status: {
      selected: !!u.selected,
      loadingPct: u.loadingPct ?? 0,
      filesCount: u.filesCount ?? 0,
      ready: !!u.ready,
    },
  }));
  return { users, allReady: sessions.allReady(sessionId), phase: s.phase };
}

export function registerClientSocket(
  io: Server,
  socket: Socket,
  sessions: SessionManager,
  stats: StatsEngine
) {

  socket.on("client:join", ({ sessionId, userId, displayName, accessToken }) => {
    try {
      const s = sessions.join(sessionId, { id: userId, displayName, accessToken });
      socket.join(`session:${sessionId}`);

      const p = presentUsers(sessions, sessionId);
      io.to(`session:${sessionId}`).emit("presence", p);

      socket.emit("client:joined", { ok: true, sessionId });
      log.info(`[srv] client:join ok ${displayName} -> ${sessionId}`);
    } catch (e: any) {
      socket.emit("error", { error: e.message });
    }
  });

  socket.on("presence:request", ({ sessionId }) => {
    const p = presentUsers(sessions, sessionId);
    io.to(socket.id).emit("presence", p);
    log.info(`[srv] presence:request -> ${sessionId} users=${p.users.length}`);
  });

  // NEW: selection start
  socket.on("client:select", ({ sessionId, userId }) => {
    try {
      sessions.setUserStatus(sessionId, userId, {
        mode: "local", selected: true, loadingPct: 0, filesCount: 0, ready: false,
      });
      const p = presentUsers(sessions, sessionId);
      io.to(`session:${sessionId}`).emit("presence", p);
      log.info(`[srv] client:select ${userId} -> ${sessionId}`);
    } catch (e:any) { socket.emit("error", { error: e.message }); }
  });

  // NEW: loading progress
  socket.on("client:loading", ({ sessionId, userId, loadingPct, filesCount }) => {
    try {
      sessions.setUserStatus(sessionId, userId, { loadingPct, filesCount });
      const p = presentUsers(sessions, sessionId);
      io.to(`session:${sessionId}`).emit("presence", p);
    } catch {}
  });

  // NEW: ready
  socket.on("client:ready", ({ sessionId, userId, filesCount }) => {
    try {
      sessions.setUserStatus(sessionId, userId, { loadingPct: 100, filesCount, ready: true });
      const p = presentUsers(sessions, sessionId);
      io.to(`session:${sessionId}`).emit("presence", p);
      log.info(`[srv] client:ready ${userId} -> ${sessionId} files=${filesCount}`);
    } catch {}
  });

  // … keep your other handlers (deletes, etc.)
}
