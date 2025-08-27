// src/core/sessionManager.ts
import { randomBytes } from "crypto";
import { Session, SessionId, User, UserId } from "./models.js";
import { log } from "../utils/logger.js";

export class SessionManager {
  private sessions: Map<SessionId, Session> = new Map();

  /**
   * Maak een nieuwe sessie en retourneer het sessie-object.
   */
  create(hostSocketId: string): Session {
    const id = this.generateCode();
    const session: Session = {
      id,
      hostSocketId,
      startedAt: Date.now(),
      users: new Map<UserId, User>(),
      phase: "lobby",               // ← NEW: start in lobby
    };
    
    this.sessions.set(id, session);
    log.info("Session created", id);
    return session;
  }

  //Start session
  start(sessionId: SessionId): Session {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error("Session not found");
    s.phase = "started";
    return s;
  }

  /**
   * Voeg (of merge) een user toe aan een bestaande sessie.
   * Gooit een error als de sessie niet bestaat.
   */
  join(sessionId: SessionId, user: Omit<User, "totalBytesDeleted" | "totalItemsDeleted">): Session {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error("Session not found");

    const existing = s.users.get(user.id);
    const merged: User = {
      id: user.id,
      displayName: user.displayName,
      accessToken: user.accessToken,
      totalBytesDeleted: existing?.totalBytesDeleted ?? 0,
      totalItemsDeleted: existing?.totalItemsDeleted ?? 0,
      largestItemDeleted: existing?.largestItemDeleted,
    };

    s.users.set(user.id, merged);
    return s;
  }

  /**
   * Verwijder een user uit de sessie. Verwijdert de sessie als leeg.
   */
  leave(sessionId: SessionId, userId: UserId): void {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.users.delete(userId);
    if (s.users.size === 0) {
      this.sessions.delete(sessionId);
      log.info("Session removed (empty)", sessionId);
    }
  }

  /**
   * Beëindig en verwijder de sessie.
   */
  end(sessionId: SessionId): void {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.endedAt = Date.now();
    s.phase = "ended";            // ← track phase
    this.sessions.delete(sessionId);
    log.info("Session ended", sessionId);
  } 

  get(sessionId: SessionId): Session | undefined {
    return this.sessions.get(sessionId);
  }

  list(): Array<{ id: SessionId; users: number }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      users: s.users.size,
    }));
  }

  private generateCode(): SessionId {
    // 6-teken hex code, lekker kort en leesbaar voor op het scherm.
    return randomBytes(3).toString("hex").toUpperCase();
  }
}