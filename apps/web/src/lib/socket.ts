import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth-store";

// The API's REST base URL is .../api/v1; Socket.IO connects to the bare
// server origin instead, so strip that suffix off rather than maintaining
// a second env var just for this.
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;

/**
 * Lazily creates (or returns) the single shared Socket.IO connection for
 * this tab. Not auto-connected — callers set `socket.auth` to the current
 * access token and call `.connect()` once one is available (see
 * `useNotificationSocket`), since there's nothing to authenticate with
 * before the user is logged in.
 *
 * Known simplification: the access token is only checked at handshake time,
 * same as every other WebSocket auth scheme built on short-lived JWTs. If a
 * long-lived tab's token expires mid-connection, the socket itself doesn't
 * get kicked — a real production hardening pass would re-validate on an
 * interval or a server-side ping. Not worth the complexity at this project's
 * scale, but flagging the tradeoff rather than hiding it.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: { token: useAuthStore.getState().accessToken },
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
