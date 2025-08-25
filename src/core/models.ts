// src/core/models.ts

export type SessionId = string;
export type UserId = string;

export interface User {
  id: UserId;
  displayName: string;
  accessToken?: string;        // MSAL delegated token (optioneel in skeleton)
  totalBytesDeleted: number;
  totalItemsDeleted: number;
  largestItemDeleted?: { id: string; name: string; size: number };
}

export interface Session {
  id: SessionId;
  hostSocketId: string;
  startedAt: number;
  users: Map<UserId, User>;
  endedAt?: number;
}

export interface StatsSnapshot {
  sessionId: SessionId;
  leaderboard: Array<{ userId: UserId; displayName: string; bytes: number; items: number }>;
  biggestDeletes: Array<{ userId: UserId; displayName: string; name: string; size: number }>;
  totalBytes: number;
  totalItems: number;
}
