// src/services/statsEngine.ts
import { Session, StatsSnapshot } from "../core/models.js";

/**
 * Verantwoordelijk voor het berekenen en updaten van statistieken.
 * Houdt zelf geen state; werkt op de Session (bron van waarheid).
 */
export class StatsEngine {
  snapshot(session: Session): StatsSnapshot {
    const users = Array.from(session.users.values());

    const leaderboard = users
      .map((u) => ({
        userId: u.id,
        displayName: u.displayName,
        bytes: u.totalBytesDeleted,
        items: u.totalItemsDeleted,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const biggestDeletes = users
      .filter((u) => u.largestItemDeleted)
      .map((u) => ({
        userId: u.id,
        displayName: u.displayName,
        name: u.largestItemDeleted!.name,
        size: u.largestItemDeleted!.size,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const totalBytes = users.reduce((acc, u) => acc + u.totalBytesDeleted, 0);
    const totalItems = users.reduce((acc, u) => acc + u.totalItemsDeleted, 0);

    return { sessionId: session.id, leaderboard, biggestDeletes, totalBytes, totalItems };
  }

  /**
   * Pas een delete-event toe op de sessie en update afgeleide velden.
   */
  applyDeletion(session: Session, userId: string, name: string, size: number) {
    const u = session.users.get(userId);
    if (!u) return;
    u.totalBytesDeleted += size;
    u.totalItemsDeleted += 1;
    if (!u.largestItemDeleted || size > u.largestItemDeleted.size) {
      u.largestItemDeleted = { id: "n/a", name, size };
    }
  }

  /**
   * (Optioneel) Simple CO₂-schatting in kg.
   * Pas 'factorKgPerByte' aan met je eigen bron/assumpties.
   */
  estimateCO2Kg(bytes: number, factorKgPerByte = 0.0000005): number {
    return bytes * factorKgPerByte;
  }
}
