import type { Badge, ChatMessage, ConnectionState } from "@/lib/types";
import { colorFromString } from "@/lib/utils";
import {
  type Connector,
  type ConnectorCallbacks,
  extractEntities,
} from "./base";

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

// Anonymous read-only Twitch chat over IRC-WebSocket. No OAuth required:
// log in as justinfan<random> and JOIN the channel. This runs entirely in the
// browser - Twitch's gateway accepts anonymous WS clients directly.
export class TwitchConnector implements Connector {
  readonly platform = "twitch" as const;
  readonly channel: string;
  private ws: WebSocket | null = null;
  private cb: ConnectorCallbacks;
  private closedByUser = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(channel: string, cb: ConnectorCallbacks) {
    this.channel = channel.toLowerCase().replace(/^#/, "").trim();
    this.cb = cb;
  }

  connect() {
    this.closedByUser = false;
    this.open();
  }

  private setState(s: ConnectionState, err?: string) {
    this.cb.onState(s, err);
  }

  private open() {
    this.setState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(IRC_URL);
    } catch (e) {
      this.setState("error", (e as Error).message);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      const nick = `justinfan${Math.floor(Math.random() * 80000) + 1000}`;
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws.send("PASS SCHMOOPIIE");
      ws.send(`NICK ${nick}`);
      ws.send(`JOIN #${this.channel}`);
    };

    ws.onmessage = (ev) => {
      const data = typeof ev.data === "string" ? ev.data : "";
      // A single frame can carry multiple IRC lines.
      for (const line of data.split("\r\n")) {
        if (line.length) this.handleLine(line);
      }
    };

    ws.onerror = () => {
      this.setState("error", "socket error");
    };

    ws.onclose = () => {
      if (this.closedByUser) {
        this.setState("idle");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private handleLine(line: string) {
    // Keepalive
    if (line.startsWith("PING")) {
      this.ws?.send("PONG :tmi.twitch.tv");
      return;
    }
    // Connection / join acks
    if (line.includes(" JOIN ") || line.includes(":Welcome, GLHF!")) {
      if (this.reconnectAttempts > 0 || line.includes("JOIN")) {
        this.reconnectAttempts = 0;
        this.setState("connected");
      }
      return;
    }
    if (line.includes(" 001 ") || line.includes("GLHF")) {
      this.setState("connected");
      return;
    }

    if (!line.includes("PRIVMSG")) return;

    const msg = parsePrivmsg(line, this.channel);
    if (msg) this.cb.onMessage(msg);
  }

  private scheduleReconnect() {
    if (this.closedByUser) return;
    this.reconnectAttempts++;
    this.setState("reconnecting");
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    try {
      this.ws?.send(`PART #${this.channel}`);
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.setState("idle");
  }
}

function unescapeTag(v: string): string {
  return v
    .replace(/\\s/g, " ")
    .replace(/\\:/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n");
}

function parseTags(raw: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      tags[part] = "";
      continue;
    }
    tags[part.slice(0, idx)] = unescapeTag(part.slice(idx + 1));
  }
  return tags;
}

function parseBadges(raw?: string): Badge[] {
  if (!raw) return [];
  return raw.split(",").map((b) => {
    const [type] = b.split("/");
    return { type } as Badge;
  });
}

export function parsePrivmsg(
  line: string,
  channel: string,
): ChatMessage | null {
  let rest = line;
  let tags: Record<string, string> = {};

  if (rest.startsWith("@")) {
    const sp = rest.indexOf(" ");
    tags = parseTags(rest.slice(1, sp));
    rest = rest.slice(sp + 1);
  }

  // rest now: ":nick!user@host PRIVMSG #channel :message"
  if (!rest.startsWith(":")) return null;
  const prefixEnd = rest.indexOf(" ");
  const prefix = rest.slice(1, prefixEnd);
  const nick = prefix.split("!")[0];

  const afterPrefix = rest.slice(prefixEnd + 1);
  if (!afterPrefix.startsWith("PRIVMSG")) return null;

  const msgStart = afterPrefix.indexOf(" :");
  if (msgStart === -1) return null;
  const text = afterPrefix.slice(msgStart + 2);

  const badges = parseBadges(tags["badges"]);
  const isMod = tags["mod"] === "1" || badges.some((b) => b.type === "moderator");
  const isSub =
    tags["subscriber"] === "1" || badges.some((b) => b.type === "subscriber");
  const isVip = badges.some((b) => b.type === "vip");
  const isBroadcaster = badges.some((b) => b.type === "broadcaster");
  const displayName = tags["display-name"] || nick;
  const color = tags["color"] || colorFromString(displayName);
  const { mentions, tickers } = extractEntities(text);

  return {
    id: tags["id"] || `tw_${tags["tmi-sent-ts"] || Date.now()}_${nick}`,
    platform: "twitch",
    channel,
    userId: tags["user-id"],
    username: nick,
    displayName,
    color,
    text,
    badges,
    timestamp: tags["tmi-sent-ts"] ? Number(tags["tmi-sent-ts"]) : Date.now(),
    isMod,
    isSub,
    isVip,
    isBroadcaster,
    mentions,
    tickers,
  };
}
