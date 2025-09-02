// src/routes/fileRoutes.ts
import { Router } from "express";
import { z } from "zod";
import type { Server as IOServer } from "socket.io";
import { SessionManager } from "../core/sessionManager.js";
import { StatsEngine } from "../services/statsEngine.js";
import { GoogleDriveClient } from "../services/googleDriveClient.js";

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
    if (session.phase !== "started") return res.status(403).json({ error: "Game not started yet" });

    const user = session.users.get(parsed.data.userId);
    if (!user) return res.status(404).json({ error: "User not in session" });
    if (!user.accessToken) return res.status(401).json({ error: "Not authenticated with Google. Please log in." });

    try {
      const drive = new GoogleDriveClient(user.accessToken);
      const files = await drive.listUserDrive();
      return res.json({ files });
    } catch (err: any) {
      const msg = err?.message || "Google Drive error";
      const status = /insufficientPermissions|unauthorized|invalid_grant|401|403/i.test(msg) ? 401 : 502;
      return res.status(status).json({ error: status === 401 ? "Google token expired or missing. Please log in again." : msg });
    }
  });

  // POST /api/files/delete
  const deleteSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    itemId: z.string().min(1),
    itemName: z.string().default("item"),
    size: z.coerce.number().nonnegative().default(0), // trusted from client (ok for workshop)
  });

  r.post("/delete", async (req, res) => {
    const parsed = deleteSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { sessionId, userId, itemId, itemName, size } = parsed.data;
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.phase !== "started") return res.status(403).json({ error: "Game not started yet" });

    const user = session.users.get(userId);
    if (!user) return res.status(404).json({ error: "User not in session" });
    if (!user.accessToken) return res.status(401).json({ error: "Not authenticated with Google. Please log in." });

    try {
      const drive = new GoogleDriveClient(user.accessToken);
      await drive.deleteItem(itemId);

      // Stats bijwerken + events
      const events = stats.applyDeletion(session, userId, itemName, size);
      const snapshot = stats.snapshot(session);

      // broadcast reguliere stats
      io.to(`session:${sessionId}`).emit("stats", snapshot);

      // broadcast leuke events (toasts/confetti)
      for (const ev of events) {
        io.to(`session:${sessionId}`).emit("game:event", ev);
      }
      
      return res.json({ ok: true });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/insufficientPermissions|cannotTrash|forbidden|403/i.test(msg)) {
        return res.status(403).json({
          error: "You don’t have permission to trash this file (shared or read-only).",
        });
      }
      // existing 401 mapping if you had it:
      if (/unauthorized|invalid_grant|401/i.test(msg)) {
        return res.status(401).json({ error: "Google token expired or missing. Please log in again." });
      }
      return res.status(502).json({ error: "Google Drive error while deleting." });
    }
  });

  return r;
}
