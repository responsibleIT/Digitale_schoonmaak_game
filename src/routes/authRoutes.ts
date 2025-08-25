// src/routes/authRoutes.ts
import { Router } from "express";
import { z } from "zod";
import { SessionManager } from "../core/sessionManager.js";

/**
 * Simpele join-route. In productie:
 * - valideer/ververs MSAL tokens
 * - koppel user ↔ socket via een server-signed token
 */
export function buildAuthRoutes(sessions: SessionManager) {
  const r = Router();

  // POST /api/auth/join
  const joinSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().min(1),
    displayName: z.string().min(1),
    accessToken: z.string().optional(), // MSAL access token (delegated)
  });

  r.post("/join", (req, res) => {
    const parsed = joinSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { sessionId, userId, displayName, accessToken } = parsed.data;

    try {
      const s = sessions.join(sessionId, {
        id: userId,
        displayName,
        accessToken,
      });
      return res.json({ ok: true, sessionId: s.id });
    } catch (e: any) {
      return res.status(404).json({ error: e?.message ?? "Unable to join session" });
    }
  });

  return r;
}
