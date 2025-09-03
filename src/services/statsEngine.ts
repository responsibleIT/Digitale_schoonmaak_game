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

  // NEW: Rate
  ratePerMin: number;

  // Milestone flags
  _hitBytes100?: boolean;
  _hitBytes500?: boolean;
  _hitBytes1000?: boolean;
  _hitBytes5000?: boolean;

  _hitItems10?: boolean;
  _hitItems25?: boolean;
  _hitItems50?: boolean;
  _hitItems100?: boolean;
  _hitItems200?: boolean;
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
      s = { userId, displayName, items: 0, bytes: 0, streak: 0, actions: [], ratePerMin: 0 };
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
    const s = this.getUser(session.id, userId, displayName); // ensure this returns a UserStats
    const now = Date.now();

    // --- Totals ---------------------------------------------------------------
    s.items = (s.items ?? 0) + 1;
    s.bytes = (s.bytes ?? 0) + size;

    if (!s.largestSize || size > s.largestSize) {
      s.largestSize = size;
      s.largestName = itemName;
    }

    // --- Streak (<= 8s tussen acties) ----------------------------------------
    if (s.lastAt && now - s.lastAt <= 8000) s.streak = (s.streak ?? 0) + 1;
    else s.streak = 1;
    s.lastAt = now;

    // --- Tempo (acties per minuut) -------------------------------------------
    s.actions = s.actions ?? [];
    s.actions.push(now);
    // Houd lijst compact (en trim meteen tot de laatste 60s)
    const cutoff = now - 60_000;
    let keepFrom = 0;
    // find first index within window
    for (let i = s.actions.length - 1; i >= 0; i--) { if (s.actions[i] < cutoff) { keepFrom = i + 1; break; } }
    if (keepFrom > 0) s.actions.splice(0, keepFrom);
    s.ratePerMin = s.actions.length;     // actions/min; switch to bytes/min if you prefer

    // --- Events ---------------------------------------------------------------
    const events: Array<{ type: string; userId: string; displayName: string; payload?: any } & any> = [];

    // always emit a tiny “tick” for fun feedback
    events.push({
      kind: "tick",
      type: "tick",
      userId,
      byName: displayName,
      displayName,
      payload: { size, itemName }
    });

    // first delete by this user
    if (s.items === 1) {
      events.push({
        kind: "first-blood",
        type: "first-blood",
        userId,
        byName: displayName,
        displayName,
        payload: { itemName, size }
      });
    }

    // streak milestones
    if (s.streak === 3 || s.streak === 5 || s.streak === 8 || s.streak === 10) {
      events.push({
        kind: `streak:${s.streak}`,
        type: "streak",
        userId,
        byName: displayName,
        displayName,
        payload: { streak: s.streak }
      });
    }

    // big file (multiple tiers)
    if (size >= 50 * 1024 * 1024) {
      events.push({
        kind: "bigfile",
        type: "chonk",
        userId,
        byName: displayName,
        displayName,
        payload: { size, itemName }
      });
    }

    // byte milestones (fire once each)
    const MB = 1_000_000 as const;
    type ByteFlag = "_hitBytes100" | "_hitBytes500" | "_hitBytes1000" | "_hitBytes5000";
    type ItemFlag = "_hitItems10"  | "_hitItems25"  | "_hitItems50"   | "_hitItems100"  | "_hitItems200";

    const markByteMilestone = (
      s: UserStats,
      flag: ByteFlag,
      label: "100MB" | "500MB" | "1000MB" | "5000MB",
      userId: string,
      displayName: string,
      bytes: number,
      out: Array<{ type: string; userId: string; displayName: string; payload?: any } & any>
    ) => {
      if (!s[flag]) {
        s[flag] = true;
        out.push({
          kind: `milestone:${label}`,
          type: "milestone-bytes",
          userId,
          byName: displayName,
          displayName,
          payload: { totalMB: Math.round(bytes / MB) }
        });
      }
    };

    const markItemMilestone = (
      s: UserStats,
      flag: ItemFlag,
      threshold: 10 | 25 | 50 | 100 | 200,
      userId: string,
      displayName: string,
      out: Array<{ type: string; userId: string; displayName: string; payload?: any } & any>
    ) => {
      if (!s[flag]) {
        s[flag] = true;
        out.push({
          kind: `milestone:items:${threshold}`,
          type: "milestone-items",
          userId,
          byName: displayName,
          displayName,
          payload: { totalItems: s.items }
        });
      }
    };

    const bytes = s.bytes;
    if (bytes >= 100 * MB)  markByteMilestone(s, "_hitBytes100",  "100MB",  userId, displayName, bytes, events);
    if (bytes >= 500 * MB)  markByteMilestone(s, "_hitBytes500",  "500MB",  userId, displayName, bytes, events);
    if (bytes >= 1_000 * MB)markByteMilestone(s, "_hitBytes1000","1000MB", userId, displayName, bytes, events);
    if (bytes >= 5_000 * MB)markByteMilestone(s, "_hitBytes5000","5000MB", userId, displayName, bytes, events);

    if (s.items >= 10)   markItemMilestone(s, "_hitItems10",  10,  userId, displayName, events);
    if (s.items >= 25)   markItemMilestone(s, "_hitItems25",  25,  userId, displayName, events);
    if (s.items >= 50)   markItemMilestone(s, "_hitItems50",  50,  userId, displayName, events);
    if (s.items >= 100)  markItemMilestone(s, "_hitItems100", 100, userId, displayName, events);
    if (s.items >= 200)  markItemMilestone(s, "_hitItems200", 200, userId, displayName, events);

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
