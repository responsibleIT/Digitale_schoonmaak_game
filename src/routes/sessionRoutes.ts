// src/routes/sessionRoutes.ts
import { Router } from "express";
import { z } from "zod";
import { SessionManager } from "../core/sessionManager.js";

export function buildSessionRoutes(sessions: SessionManager) {
  const r = Router();

  // Host start een sessie
  const startSchema = z.object({
    hostSocketId: z.string().optional(), // mag via socket worden gezet; hier optioneel
  });

  r.post("/start", (req, res) => {
    const parsed = startSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const hostSocketId = parsed.data.hostSocketId ?? "host";
    const s = sessions.create(hostSocketId);
    res.json({ sessionId: s.id });
  });

  // Debug: lijst actieve sessies
  r.get("/", (_req, res) => {
    res.json({ sessions: sessions.list() });
  });

  // Sessie beëindigen
  const endSchema = z.object({ sessionId: z.string() });
  r.post("/:sessionId/end", (req, res) => {
    const parsed = endSchema.safeParse({ sessionId: req.params.sessionId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    sessions.end(parsed.data.sessionId);
    res.json({ ok: true });
  });

  return r;
}