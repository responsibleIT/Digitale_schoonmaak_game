// src/routes/fileRoutes.ts
import { Router } from "express";
import { z } from "zod";
import type { Server as IOServer } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { GraphClient } from "../services/graphClient.js";

export function buildFileRoutes(
  sessions: SessionManager,
  stats: StatsEngine,
  io: IOServer
) {
  const r = Router();

  // GET /api/files?sessionId=...&userId=...
  const listSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
  });

  r.get("/", async (req, res) => {
    const parsed = listSchema.safeParse({
      sessionId: String(req.query.sessionId ?? ""),
      userId: String(req.query.userId ?? ""),
    });
    
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const session = sessions.get(parsed.data.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.phase !== "started") {
      return res.status(403).json({ error: "Game not started yet" });
    }

    const user = session.users.get(parsed.data.userId);
    if (!user) return res.status(404).json({ error: "User not in session" });

    // Vervang GraphClient door echte Microsoft Graph-implementatie
    const gc = new GraphClient(user.accessToken);
    const files = await gc.listUserDrive();
    res.json({ files });
  });

  // POST /api/files/delete
  const deleteSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    itemId: z.string().min(1),
    itemName: z.string().default("item"),
    size: z.coerce.number().nonnegative().default(0),
  });

  r.post("/delete", async (req, res) => {
    const parsed = deleteSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { sessionId, userId, itemId, itemName, size } = parsed.data;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.phase !== "started") {
      return res.status(403).json({ error: "Game not started yet" });
    }

    const user = session.users.get(userId);
    if (!user) return res.status(404).json({ error: "User not in session" });

    // Verwijder (naar prullenbak) via Graph
    const gc = new GraphClient(user.accessToken);
    await gc.deleteItem(itemId);

    // Stats updaten + broadcast naar room
    stats.applyDeletion(session, userId, itemName, size);
    const snapshot = stats.snapshot(session);
    io.to(`session:${sessionId}`).emit("stats", snapshot);

    res.json({ ok: true });
  });

  return r;
}