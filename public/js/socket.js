// public/js/socket.js
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// Create a singleton socket but DO NOT connect automatically.
export const socket = io({
  transports: ["websocket"],
  autoConnect: false,        // 👈 important
});

// Convenience helpers
export function connectSocket() {
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

// Optional debug
socket.on("connect", () => console.log("[socket] connected:", socket.id));
socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
socket.on("connect_error", (err) => console.error("[socket] error:", err.message));
