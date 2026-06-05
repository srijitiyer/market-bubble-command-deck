import type { Badge, ChatMessage, ConnectionState } from "@/lib/types";
import { colorFromString } from "@/lib/utils";
import {
  type Connector,
  type ConnectorCallbacks,
  extractEntities,
} from "./base";

// Kick's web client talks to Pusher. We subscribe to the public chatroom
// channel and read messages with no auth. The only server-side hop is
// resolving the channel slug -> chatroom id (Kick's REST API sits behind
// Cloudflare), which we proxy through our own /api/kick/[slug] route.
const PUSHER_KEY = "32cbd69e4b950bf97679";
const PUSHER_CLUSTER = "us2";
const PUSHER_URL = `wss://ws-${PUSHER_CLUSTER}.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;

interface KickResolveResponse {
  chatroomId?: number;
  channelId?: number;
  title?: string;
  viewers?: number;
  isLive?: boolean;
  error?: string;
}

export class KickConnector implements Connector {
  readonly platform = "kick" as const;
  readonly channel: string;
  private cb: ConnectorCallbacks;
  private ws: WebSocket | null = null;
  private chatroomId: number | null = null;
  private closedByUser = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(channel: string, cb: ConnectorCallbacks, chatroomId?: number) {
    this.channel = channel.toLowerCase().replace(/^@/, "").trim();
    this.cb = cb;
    this.chatroomId = chatroomId ?? null;
  }

  connect() {
    this.closedByUser = false;
    if (this.chatroomId != null) {
      // Manual id supplied - skip the Cloudflare-guarded resolve step.
      this.setState("connecting");
      this.open();
      return;
    }
    void this.resolveAndOpen();
  }

  private setState(s: ConnectionState, err?: string) {
    this.cb.onState(s, err);
  }

  private async resolveAndOpen() {
    this.setState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    try {
      const res = await fetch(`/api/kick/${encodeURIComponent(this.channel)}`);
      const json: KickResolveResponse = await res.json();
      if (!json.chatroomId) {
        this.setState(
          "error",
          json.error || "Could not resolve Kick chatroom (Cloudflare).",
        );
        this.scheduleReconnect();
        return;
      }
      this.chatroomId = json.chatroomId;
      this.open();
    } catch (e) {
      this.setState("error", (e as Error).message);
      this.scheduleReconnect();
    }
  }

  private open() {
    if (this.chatroomId == null) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(PUSHER_URL);
    } catch (e) {
      this.setState("error", (e as Error).message);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      // Wait for pusher:connection_established before subscribing.
    };

    ws.onmessage = (ev) => {
      const raw = typeof ev.data === "string" ? ev.data : "";
      let frame: { event?: string; data?: unknown; channel?: string };
      try {
        frame = JSON.parse(raw);
      } catch {
        return;
      }

      if (frame.event === "pusher:connection_established") {
        ws.send(
          JSON.stringify({
            event: "pusher:subscribe",
            data: { auth: "", channel: `chatrooms.${this.chatroomId}.v2` },
          }),
        );
        return;
      }
      if (frame.event === "pusher_internal:subscription_succeeded") {
        this.reconnectAttempts = 0;
        this.setState("connected");
        return;
      }
      if (frame.event === "pusher:ping") {
        ws.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        return;
      }
      if (
        frame.event === "App\\Events\\ChatMessageEvent" ||
        frame.event === "App\\Events\\ChatMessageSentEvent"
      ) {
        const msg = parseKickMessage(frame.data, this.channel);
        if (msg) this.cb.onMessage(msg);
      }
    };

    ws.onerror = () => this.setState("error", "socket error");
    ws.onclose = () => {
      if (this.closedByUser) {
        this.setState("idle");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    this.reconnectAttempts++;
    this.setState("reconnecting");
    const delay = Math.min(1500 * 2 ** this.reconnectAttempts, 20000);
    this.reconnectTimer = setTimeout(() => void this.resolveAndOpen(), delay);
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.setState("idle");
  }
}

interface KickIdentityBadge {
  type?: string;
  text?: string;
}
interface KickSender {
  id?: number;
  username?: string;
  slug?: string;
  identity?: { color?: string; badges?: KickIdentityBadge[] };
}
interface KickMessageData {
  id?: string;
  chatroom_id?: number;
  content?: string;
  created_at?: string;
  sender?: KickSender;
}

export function parseKickMessage(
  data: unknown,
  channel: string,
): ChatMessage | null {
  let parsed: KickMessageData;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  } else {
    parsed = data as KickMessageData;
  }
  if (!parsed || !parsed.content || !parsed.sender) return null;

  const sender = parsed.sender;
  const username = sender.username || sender.slug || "anon";
  const rawBadges = sender.identity?.badges || [];
  const badges: Badge[] = rawBadges.map((b) => ({
    type: (b.type || "").toLowerCase(),
    label: b.text,
  }));
  const isMod = badges.some((b) => b.type === "moderator");
  const isSub = badges.some(
    (b) => b.type === "subscriber" || b.type === "founder",
  );
  const isVip = badges.some((b) => b.type === "vip");
  const isBroadcaster = badges.some(
    (b) => b.type === "broadcaster" || b.type === "host",
  );
  const color = sender.identity?.color || colorFromString(username);
  const { mentions, tickers } = extractEntities(parsed.content);

  return {
    id: parsed.id || `kick_${Date.now()}_${username}`,
    platform: "kick",
    channel,
    userId: sender.id ? String(sender.id) : undefined,
    username,
    displayName: username,
    color,
    text: parsed.content,
    badges,
    timestamp: parsed.created_at
      ? new Date(parsed.created_at).getTime()
      : Date.now(),
    isMod,
    isSub,
    isVip,
    isBroadcaster,
    mentions,
    tickers,
  };
}
