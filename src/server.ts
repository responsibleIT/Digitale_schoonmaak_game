// src/server.ts
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { log } from "./utils/logger.js";

import { SessionManager } from "./core/sessionManager.js";
import { StatsEngine } from "./services/statsEngine.js";

import { buildSessionRoutes } from "./routes/sessionRoutes.js";
import { buildFileRoutes } from "./routes/fileRoutes.js";
import { buildAuthRoutes } from "./routes/authRoutes.js";

// --- ESM helpers (voor __dirname in TS/ESM) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App + HTTP + WebSocket setup ---
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  // Als je een apart front-end domein gebruikt, zet dit in .env > ALLOWED_ORIGINS
  cors: { origin: env.ALLOWED_ORIGINS },
});

// --- Middleware ---
app.use(express.json());

// Static frontend (serveert /public)
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// --- Core singletons (domeinlogica) ---
const sessions = new SessionManager();
const stats = new StatsEngine();

// --- REST routes ---
app.use("/api/session", buildSessionRoutes(sessions));
app.use("/api/files", buildFileRoutes(sessions, stats, io));
app.use("/api/auth", buildAuthRoutes(sessions));

// Healthcheck (handig voor hosting)
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// --- Socket.IO events ---
// We doen dynamic imports om eventuele circulaire dependencies te vermijden.
io.on("connection", async (socket) => {
  log.info("Socket connected", socket.id);

  try {
    const [{ registerHostSocket }, { registerClientSocket }] = await Promise.all([
      import("./sockets/hostSocket.js"),
      import("./sockets/clientSocket.js"),
    ]);
    registerHostSocket(io, socket, sessions, stats);
    registerClientSocket(io, socket, sessions, stats);
  } catch (err) {
    log.error("Failed to register socket handlers:", err);
  }

  socket.on("disconnect", (reason) => {
    log.info("Socket disconnected", socket.id, reason);
  });
});

// --- Start server ---
server.listen(env.PORT, () => {
  log.info(`Server listening on http://localhost:${env.PORT}`);
});

// --- Graceful shutdown ---
const shutdown = (signal: string) => {
  log.warn(`${signal} received. Shutting down...`);
  io.close(() => log.info("Socket.IO closed"));
  server.close(() => {
    log.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
