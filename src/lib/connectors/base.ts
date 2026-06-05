import type { ChatMessage, ConnectionState, Platform } from "@/lib/types";

export interface ConnectorCallbacks {
  onMessage: (msg: ChatMessage) => void;
  onState: (state: ConnectionState, error?: string) => void;
}

export interface Connector {
  readonly platform: Platform;
  readonly channel: string;
  connect(): void;
  disconnect(): void;
}

// Pull @mentions and $TICKER cashtags out of a message body so the feed can
// highlight them. Kept intentionally simple - this is chat, not a parser.
export function extractEntities(text: string): {
  mentions: string[];
  tickers: string[];
} {
  const mentions = [...text.matchAll(/@([a-zA-Z0-9_]{2,25})/g)].map((m) => m[1]);
  const tickers = [...text.matchAll(/\$([A-Za-z]{2,8})\b/g)].map((m) =>
    m[1].toUpperCase(),
  );
  return { mentions, tickers };
}

let counter = 0;
export function uid(prefix = "m"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}
