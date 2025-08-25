// public/js/api.js
// Kleine fetch-helpers voor je REST endpoints.

async function handle(r) {
  const ct = r.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    const msg = typeof payload === "string" ? payload : (payload?.error || "Request failed");
    throw new Error(msg);
  }
  return payload;
}

export async function apiJoin({ sessionId, userId, displayName, accessToken }) {
  const r = await fetch("/api/auth/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, userId, displayName, accessToken }),
  });
  return handle(r);
}

export async function apiListFiles({ sessionId, userId }) {
  const r = await fetch(`/api/files?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`);
  return handle(r);
}

export async function apiDelete({ sessionId, userId, itemId, itemName, size }) {
  const r = await fetch("/api/files/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, userId, itemId, itemName, size }),
  });
  return handle(r);
}
