// src/server.ts
import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { log } from "./utils/logger.js";

// Core singletons
import { SessionManager } from "./core/sessionManager.js";
import { StatsEngine } from "./services/statsEngine.js";

// REST routes
import { buildSessionRoutes } from "./routes/sessionRoutes.js";
import { buildFileRoutes } from "./routes/fileRoutes.js";
import { buildAuthRoutes } from "./routes/authRoutes.js";

// Socket handlers (STATIC imports to avoid race conditions)
import { registerHostSocket } from "./sockets/hostSocket.js";
import { registerClientSocket } from "./sockets/clientSocket.js";

// --- ESM helpers (voor __dirname in TS/ESM) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- App + HTTP + WebSocket setup ---
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: env.ALLOWED_ORIGINS },
});

// --- Middleware ---
app.use(express.json());

// --- Static frontend (serveert /public) ---
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
io.on("connection", (socket) => {
  log.info("Socket connected", socket.id);

  // Attach both handler sets synchronously
  registerHostSocket(io, socket, sessions, stats);
  registerClientSocket(io, socket, sessions, stats);

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
