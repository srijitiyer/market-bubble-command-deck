"use client";

import { useMemo } from "react";
import { useDeck } from "@/lib/store";
import { MessageRow } from "@/components/MessageRow";
import { useObsBoot } from "@/components/ObsShell";

// OBS browser source: the merged live chat as a transparent overlay.
// e.g. /obs/chat?platforms=twitch,kick&limit=14&host=ansem&mock=0
export default function ObsChatPage() {
  const opts = useObsBoot();
  const messages = useDeck((s) => s.messages);

  const rows = useMemo(() => {
    if (!opts) return [];
    return messages
      .filter((m) => {
        if (m.isHost) return true;
        if (!opts.platforms.has(m.platform)) return false;
        if (opts.host) {
          const onHost =
            m.host === opts.host ||
            m.text.toLowerCase().includes(opts.host) ||
            m.mentions?.some((x) => x.toLowerCase().includes(opts.host));
          if (!onHost) return false;
        }
        return true;
      })
      .slice(-opts.limit);
  }, [messages, opts]);

  if (!opts) return null;
  return (
    <div className="flex h-dvh flex-col justify-end overflow-hidden p-2">
      <div
        className={opts.framed ? "panel py-1" : ""}
        style={opts.framed ? { background: "rgba(13,13,13,0.82)" } : undefined}
      >
        {rows.map((m) => (
          <MessageRow key={m.id} msg={m} />
        ))}
      </div>
    </div>
  );
}
