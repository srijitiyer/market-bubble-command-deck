"use client";

import { useDeck } from "@/lib/store";
import { HOSTS } from "@/lib/types";
import { cn } from "@/lib/utils";

// Ansem / Banks / Both — the Stage host switch. "Both" is the merged room (our
// whole point); picking a host narrows the feed to their takes + the chatter
// about them, and relabels the broadcast.
export function HostSwitch() {
  const hostFilter = useDeck((s) => s.hostFilter);
  const setHostFilter = useDeck((s) => s.setHostFilter);

  const Item = ({ id, label, accent }: { id: string; label: string; accent?: string }) => {
    const on = hostFilter === id;
    return (
      <button
        onClick={() => setHostFilter(id)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150",
          on ? "bg-white/[0.12] text-fg" : "text-dim hover:text-fg",
        )}
        aria-pressed={on}
      >
        {accent && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent, boxShadow: on ? `0 0 8px ${accent}` : "none" }}
          />
        )}
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-black/50 p-0.5 ring-1 ring-white/10 backdrop-blur">
      <Item id="all" label="Both" />
      {HOSTS.map((h) => (
        <Item key={h.id} id={h.id} label={h.name} accent={h.accent} />
      ))}
    </div>
  );
}
