import { memo } from "react";
import { Crown, Gem, Megaphone, Pin, Shield, Star } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { useDeck } from "@/lib/store";
import { cn, formatClock, profileUrl } from "@/lib/utils";
import { getEmote } from "@/lib/emotes";
import { PlatformIcon } from "./icons";
import { CashTag } from "./CashTag";

// Muted, cohesive per-platform tint for the small gutter glyph (full neon would
// shout; these read as a quiet source label, not decoration).
const GLYPH_CLASS: Record<ChatMessage["platform"], string> = {
  twitch: "text-twitch-muted",
  kick: "text-kick-muted",
  x: "text-x-muted",
};

function renderText(text: string) {
  // Tokenize on whitespace so we can swap @mentions, $cashtags and emote words.
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    if (/^@[a-zA-Z0-9_]{2,25}$/.test(tok)) {
      return (
        <span key={i} className="font-medium text-brand-2">
          {tok}
        </span>
      );
    }
    if (/^\$[A-Za-z]{2,8}$/.test(tok)) {
      return <CashTag key={i} symbol={tok.slice(1)} />;
    }
    const emote = getEmote(tok);
    if (emote) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- tiny third-party emote, next/image is inappropriate
        <img
          key={i}
          src={emote.url}
          alt={tok}
          title={tok}
          loading="lazy"
          className="inline-block h-5 w-auto max-w-none translate-y-[-1px] align-middle"
        />
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function Badges({ msg }: { msg: ChatMessage }) {
  return (
    <>
      {msg.isBroadcaster && (
        <Crown className="h-3 w-3 shrink-0 text-warn" aria-label="Broadcaster" />
      )}
      {msg.isMod && (
        <Shield className="h-3 w-3 shrink-0 text-pos" aria-label="Moderator" />
      )}
      {msg.isVip && (
        <Gem className="h-3 w-3 shrink-0 text-brand" aria-label="VIP" />
      )}
      {msg.isSub && !msg.isMod && !msg.isBroadcaster && (
        <Star className="h-3 w-3 shrink-0 text-brand-2" aria-label="Subscriber" />
      )}
    </>
  );
}

function MessageRowBase({
  msg,
  fresh,
  firstOfGroup = true,
}: {
  msg: ChatMessage;
  fresh?: boolean;
  firstOfGroup?: boolean;
}) {
  const meta = PLATFORMS[msg.platform];
  // Subscribe so rows re-render once the global emote sets finish loading.
  useDeck((s) => s.emotesReady);

  if (msg.isHost) {
    return (
      <div
        className={cn(
          "relative mx-2 mb-1 mt-2 flex items-start gap-2.5 rounded-lg px-3 py-2 text-[13px] leading-[1.45]",
          fresh && "animate-msg-in",
        )}
        style={{
          background: "rgba(233,225,209,0.07)",
          boxShadow: "inset 0 0 0 1px rgba(233,225,209,0.22)",
        }}
      >
        <Megaphone className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <span className="mr-1.5 inline-flex items-center gap-1.5 align-baseline">
            <span className="font-medium text-brand">{msg.displayName}</span>
            <span className="eyebrow rounded bg-brand/15 px-1 py-px text-brand">
              Host → all
            </span>
          </span>
          <span className="break-words text-fg">{renderText(msg.text)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex pr-2 pl-[30px] text-[13px] leading-[1.45] transition-colors duration-150 hover:bg-white/[0.02]",
        firstOfGroup ? "mt-2 pt-px" : "mt-0",
        "pb-px",
        fresh && "animate-msg-in",
      )}
    >
      {/* fixed-width source gutter — small muted platform glyph, head of group only */}
      {firstOfGroup && (
        <span
          className={cn(
            "absolute left-[8px] top-[3px] flex h-4 w-4 items-center justify-center opacity-90",
            GLYPH_CLASS[msg.platform],
          )}
          title={`${meta.name} · #${msg.channel}`}
        >
          <PlatformIcon platform={msg.platform} className="h-[13px] w-[13px]" />
        </span>
      )}

      <div className="min-w-0 flex-1 break-words">
        {firstOfGroup && (
          <span className="mr-2 inline-flex items-center gap-1 align-baseline">
            <Badges msg={msg} />
            <a
              href={profileUrl(msg.platform, msg.username)}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
              style={{ color: msg.color }}
              title={`@${msg.username} on ${meta.name}`}
            >
              {msg.displayName}
            </a>
          </span>
        )}
        <span className="text-[#d4d7df]">{renderText(msg.text)}</span>
      </div>

      <div className="flex shrink-0 items-start gap-1 pl-1">
        <button
          onClick={() => useDeck.getState().setFeatured(msg)}
          className="rounded p-0.5 text-faint opacity-0 transition-colors duration-150 hover:bg-white/10 hover:text-brand group-hover:opacity-100"
          title="Feature this message"
          aria-label="Feature this message"
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <span className="mono mt-[2px] text-[11px] tabular-nums text-faint opacity-0 transition-opacity group-hover:opacity-100">
          {formatClock(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

export const MessageRow = memo(MessageRowBase);
