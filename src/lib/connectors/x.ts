import type { ConnectionState } from "@/lib/types";
import { type Connector, type ConnectorCallbacks } from "./base";
import { startDemoStream } from "./demo";

// X (Twitter) exposes no public realtime API for live-broadcast / Space chat.
// This connector is built against the same Connector interface as Twitch/Kick
// so a real adapter (paid X API filtered-stream over replies, or a self-hosted
// relay posting to an SSE endpoint) can be dropped in later without touching
// the rest of the app. Until then it sources a realistic replay so X is a
// first-class column in the unified feed. The UI labels this honestly.
export class XConnector implements Connector {
  readonly platform = "x" as const;
  readonly channel: string;
  private cb: ConnectorCallbacks;
  private stop: (() => void) | null = null;

  constructor(channel: string, cb: ConnectorCallbacks) {
    this.channel = channel.replace(/^@/, "").trim();
    this.cb = cb;
  }

  private setState(s: ConnectionState, err?: string) {
    this.cb.onState(s, err);
  }

  connect() {
    this.setState("connecting");
    // Slower cadence than livestream chat - X replies trickle in.
    this.stop = startDemoStream("x", this.channel, this.cb.onMessage, {
      minMs: 1800,
      maxMs: 5200,
    });
    setTimeout(() => this.setState("connected"), 400);
  }

  disconnect() {
    this.stop?.();
    this.stop = null;
    this.setState("idle");
  }
}
