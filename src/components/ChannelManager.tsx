"use client";

import { useState } from "react";
import { Plus, X as XClose } from "lucide-react";
import { useDeck, channelKey } from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST, type Platform } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import { ConnectionDot } from "./ConnectionDot";

export function ChannelManager() {
  const channels = useDeck((s) => s.channels);
  const connections = useDeck((s) => s.connections);
  const addChannel = useDeck((s) => s.addChannel);
  const removeChannel = useDeck((s) => s.removeChannel);
  const activeStream = useDeck((s) => s.activeStream);
  const setActiveStream = useDeck((s) => s.setActiveStream);

  const [platform, setPlatform] = useState<Platform>("twitch");
  const [value, setValue] = useState("");
  const [chatroomId, setChatroomId] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const id = chatroomId.trim() ? Number(chatroomId.trim()) : undefined;
    addChannel(platform, value, id ? { chatroomId: id } : undefined);
    setValue("");
    setChatroomId("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
          Sources
        </h2>
        <span className="mono text-[11px] text-faint">{channels.length}</span>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-1">
          {PLATFORM_LIST.map((p) => {
            const meta = PLATFORMS[p];
            const on = platform === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition",
                  on ? "text-fg" : "text-faint hover:text-dim",
                )}
                style={
                  on
                    ? {
                        background: meta.tint,
                        boxShadow: `inset 0 0 0 1px ${meta.accent}55`,
                      }
                    : { background: "rgba(255,255,255,0.02)" }
                }
              >
                <PlatformIcon
                  platform={p}
                  className="h-3 w-3"
                  style={{ color: on ? meta.accent : undefined }}
                />
                {meta.name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-faint">
              {platform === "x" ? "@" : "#"}
            </span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                platform === "twitch"
                  ? "channel"
                  : platform === "kick"
                    ? "channel"
                    : "handle"
              }
              className="w-full rounded-lg bg-black/30 py-1.5 pl-6 pr-2 text-xs text-fg placeholder:text-faint outline-none ring-1 ring-border focus:ring-brand/50"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center rounded-lg bg-brand px-2.5 text-white transition hover:brightness-110"
            title="Add source"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {platform === "kick" && (
          <input
            value={chatroomId}
            onChange={(e) =>
              setChatroomId(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="chatroom id (optional, if auto-resolve is blocked)"
            inputMode="numeric"
            className="w-full rounded-lg bg-black/30 px-2.5 py-1.5 text-[11px] text-fg placeholder:text-faint outline-none ring-1 ring-border focus:ring-brand/50"
          />
        )}
      </form>

      <div className="flex flex-col gap-1">
        {channels.length === 0 && (
          <p className="px-1 py-2 text-[11px] leading-relaxed text-faint">
            No sources yet. Add a channel above — try{" "}
            <span className="text-dim">twitch / xqc</span> or flip on Demo mode.
          </p>
        )}
        {channels.map((c) => {
          const key = channelKey(c.platform, c.channel);
          const conn = connections[key];
          const meta = PLATFORMS[c.platform];
          const isActive = activeStream === key;
          return (
            <div
              key={key}
              onClick={() => setActiveStream(key)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition",
                isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
              )}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: meta.tint,
                  color: meta.accent,
                  boxShadow: `inset 0 0 0 1px ${meta.accent}40`,
                }}
              >
                <PlatformIcon platform={c.platform} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-fg">
                    {c.channel}
                  </span>
                  {c.viewers ? (
                    <span className="mono text-[10px] text-faint">
                      {formatNumber(c.viewers)} viewers
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <ConnectionDot state={conn?.state ?? "idle"} withLabel />
                  <span className="mono text-[10px] text-faint">
                    · {conn?.messageCount ?? 0} msg
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeChannel(c.platform, c.channel);
                }}
                className="rounded p-0.5 text-faint opacity-0 transition hover:bg-white/10 hover:text-neg group-hover:opacity-100"
                title="Remove"
              >
                <XClose className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
