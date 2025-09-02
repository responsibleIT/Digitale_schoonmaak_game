import { Router } from "express";
import { z } from "zod";
import { SessionManager } from "../core/sessionManager.js";

export function buildSessionRoutes(sessions: SessionManager) {
  const r = Router();

  // POST /api/session/join
  const joinSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    displayName: z.string().min(1),
    accessToken: z.string().optional(),            // ← accept Google token
  });

  r.post("/join", (req, res) => {
    const parsed = joinSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { sessionId, userId, displayName, accessToken } = parsed.data;

    const s = sessions.get(sessionId);
    if (!s) return res.status(404).json({ error: "Session not found" });

    // Store/overwrite the token on the user record
    sessions.join(sessionId, { id: userId, displayName, accessToken });

    return res.json({ ok: true });
  });

  // POST /api/session/attach-token  (for refreshing on game page)
  const tokenSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    accessToken: z.string().min(10),
  });

  r.post("/attach-token", (req, res) => {
    const parsed = tokenSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { sessionId, userId, accessToken } = parsed.data;
    const s = sessions.get(sessionId);
    if (!s) return res.status(404).json({ error: "Session not found" });

    const u = s.users.get(userId);
    if (!u) return res.status(404).json({ error: "User not in session" });

    u.accessToken = accessToken;                    // ← update token
    s.users.set(userId, u);
    return res.json({ ok: true });
  });

  return r;
}
