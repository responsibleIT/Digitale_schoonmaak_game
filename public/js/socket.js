// public/js/socket.js
// Verbind met je eigen server. De CDN-versie van Socket.IO (ESM) gebruiken we hier.
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// Transports alleen websocket voor minder latency; pas aan als nodig
export const socket = io({
  transports: ["websocket"],
});

// Handige logging (kan je verwijderen als je wilt)
socket.on("connect", () => console.log("[socket] connected:", socket.id));
socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
socket.on("connect_error", (err) => console.error("[socket] error:", err.message));