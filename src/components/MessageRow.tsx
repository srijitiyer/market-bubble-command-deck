import { memo } from "react";
import { Crown, Gem, Shield, Star } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";
import { PlatformIcon } from "./icons";

function renderText(text: string) {
  // Split on @mentions and $tickers, keep them as styled spans.
  const parts = text.split(/(@[a-zA-Z0-9_]{2,25}|\$[A-Za-z]{2,8}\b)/g);
  return parts.map((part, i) => {
    if (/^@[a-zA-Z0-9_]{2,25}$/.test(part)) {
      return (
        <span key={i} className="text-brand-2 font-medium">
          {part}
        </span>
      );
    }
    if (/^\$[A-Za-z]{2,8}$/.test(part)) {
      return (
        <span
          key={i}
          className="mono rounded bg-[rgba(46,230,166,0.12)] px-1 text-[0.92em] font-semibold text-[#2ee6a6]"
        >
          {part.toUpperCase()}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Badges({ msg }: { msg: ChatMessage }) {
  return (
    <>
      {msg.isBroadcaster && (
        <Crown className="h-3 w-3 shrink-0 text-amber-400" aria-label="Broadcaster" />
      )}
      {msg.isMod && (
        <Shield className="h-3 w-3 shrink-0 text-emerald-400" aria-label="Moderator" />
      )}
      {msg.isVip && (
        <Gem className="h-3 w-3 shrink-0 text-pink-400" aria-label="VIP" />
      )}
      {msg.isSub && !msg.isMod && !msg.isBroadcaster && (
        <Star className="h-3 w-3 shrink-0 text-sky-400" aria-label="Subscriber" />
      )}
    </>
  );
}

function MessageRowBase({ msg, fresh }: { msg: ChatMessage; fresh?: boolean }) {
  const meta = PLATFORMS[msg.platform];
  return (
    <div
      className={cn(
        "group relative flex gap-2.5 px-3 py-1.5 text-[13px] leading-snug transition-colors hover:bg-white/[0.03]",
        fresh && "animate-msg-in",
      )}
    >
      {/* platform accent rail */}
      <span
        className="absolute left-0 top-0 h-full w-[2px] opacity-70"
        style={{ background: meta.accent }}
      />
      {/* source icon */}
      <span
        className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
        style={{
          background: meta.tint,
          color: meta.accent,
          boxShadow: `inset 0 0 0 1px ${meta.accent}40`,
        }}
        title={`${meta.name} · #${msg.channel}`}
      >
        <PlatformIcon platform={msg.platform} className="h-3 w-3" />
      </span>

      <div className="min-w-0 flex-1">
        <span className="mr-1.5 inline-flex items-center gap-1 align-baseline">
          <Badges msg={msg} />
          <span
            className="font-semibold"
            style={{ color: msg.color }}
            title={`@${msg.username} on ${meta.name}`}
          >
            {msg.displayName}
          </span>
        </span>
        <span className="break-words text-[#d4d8e0]">{renderText(msg.text)}</span>
      </div>

      <span className="mono mt-[3px] shrink-0 text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
        {formatClock(msg.timestamp)}
      </span>
    </div>
  );
}

export const MessageRow = memo(MessageRowBase);
