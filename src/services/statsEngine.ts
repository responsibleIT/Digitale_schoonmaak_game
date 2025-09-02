// src/services/statsEngine.ts
export type UserId = string;

export interface UserStats {
  userId: UserId;
  displayName: string;

  items: number;          // totaal verwijderde items
  bytes: number;          // totaal bytes
  largestName?: string;   // grootste bestand (naam)
  largestSize?: number;   // grootste bestand (bytes)

  // tempo & streaks
  lastAt?: number;        // ms
  streak: number;         // aaneengesloten acties (<= 8s ertussen)
  actions: number[];      // timestamps (ms) voor tempo berekening
}

export interface LeaderRow {
  userId: UserId;
  displayName: string;
  items: number;
  bytes: number;
  largestName?: string;
  largestSize?: number;
  streak: number;
  ratePerMin: number;     // acties/min laatste 60s
  co2kg: number;          // schatting CO2 bespaard (kg)
}

export interface StatsSnapshot {
  leaderboard: LeaderRow[];  // gesorteerd op bytes desc
  totalBytes: number;
  totalItems: number;
  totalCo2kg: number;
}

const CO2_KG_PER_GB = 0.2; // speelse aanname: 0.2 kg CO₂ per GB langdurige opslag

function ratePerMin(actions: number[], now: number): number {
  const from = now - 60_000;
  const n = actions.filter(t => t >= from).length;
  return n; // ~ acties per minuut
}

export class StatsEngine {
  // sessionId -> userId -> UserStats
  private bySession: Map<string, Map<UserId, UserStats>> = new Map();

  private getMap(sessionId: string) {
    let m = this.bySession.get(sessionId);
    if (!m) { m = new Map(); this.bySession.set(sessionId, m); }
    return m;
  }

  private getUser(sessionId: string, userId: string, displayName: string) {
    const m = this.getMap(sessionId);
    let s = m.get(userId);
    if (!s) {
      s = { userId, displayName, items: 0, bytes: 0, streak: 0, actions: [] };
      m.set(userId, s);
    } else if (displayName && s.displayName !== displayName) {
      s.displayName = displayName;
    }
    return s;
  }

  /**
   * Registreer een delete en retourneer evt. ‘milestone’ events om te tonen.
   */
  applyDeletion(
    session: { id: string; users: Map<string, { id: string; displayName: string }> },
    userId: string,
    itemName: string,
    size: number
  ): Array<{ type: string; userId: string; displayName: string; payload?: any }> {
    const user = session.users.get(userId);
    const displayName = user?.displayName ?? "Speler";
    const s = this.getUser(session.id, userId, displayName);
    const now = Date.now();

    // totals
    s.items += 1;
    s.bytes += size;
    if (!s.largestSize || size > s.largestSize) {
      s.largestSize = size;
      s.largestName = itemName;
    }

    // streak (<= 8s tussen acties)
    if (s.lastAt && now - s.lastAt <= 8000) s.streak += 1;
    else s.streak = 1;
    s.lastAt = now;

    // tempo
    s.actions.push(now);
    if (s.actions.length > 200) s.actions.splice(0, s.actions.length - 200);

    // milestones
    const events: Array<{ type: string; userId: string; displayName: string; payload?: any }> = [];
    if (s.items === 1) {
      events.push({ type: "first-blood", userId, displayName, payload: { itemName, size }});
    }
    if (s.streak === 3 || s.streak === 5 || s.streak === 8) {
      events.push({ type: "streak", userId, displayName, payload: { streak: s.streak }});
    }
    if (size >= 200 * 1024 * 1024) { // 200 MB+
      events.push({ type: "chonk", userId, displayName, payload: { size, itemName }});
    }
    const mb = s.bytes / 1_000_000;
    if ([100, 500, 1000, 5000].some(t => Math.abs(mb - t) < 5)) {
      events.push({ type: "milestone-bytes", userId, displayName, payload: { totalMB: Math.round(mb) }});
    }
    if ([10, 25, 50, 100].includes(s.items)) {
      events.push({ type: "milestone-items", userId, displayName, payload: { totalItems: s.items }});
    }

    return events;
  }

  snapshot(session: { id: string; users: Map<string, { id: string; displayName: string }> }): StatsSnapshot {
    const m = this.getMap(session.id);
    const now = Date.now();

    let totalBytes = 0, totalItems = 0;
    const rows: LeaderRow[] = [];

    for (const [userId, s] of m.entries()) {
      totalBytes += s.bytes;
      totalItems += s.items;
      const gb = s.bytes / 1_000_000_000;
      rows.push({
        userId,
        displayName: s.displayName,
        items: s.items,
        bytes: s.bytes,
        largestName: s.largestName,
        largestSize: s.largestSize,
        streak: s.streak,
        ratePerMin: ratePerMin(s.actions, now),
        co2kg: gb * CO2_KG_PER_GB,
      });
    }

    rows.sort((a,b) => b.bytes - a.bytes);
    return {
      leaderboard: rows,
      totalBytes,
      totalItems,
      totalCo2kg: (totalBytes / 1_000_000_000) * CO2_KG_PER_GB,
    };
  }

  reset(sessionId: string) { this.bySession.delete(sessionId); }
}
