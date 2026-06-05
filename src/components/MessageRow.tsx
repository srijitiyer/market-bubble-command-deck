import { memo } from "react";
import { Crown, Gem, Megaphone, Pin, Shield, Star } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { useDeck } from "@/lib/store";
import { cn, formatClock, profileUrl } from "@/lib/utils";
import { getEmote } from "@/lib/emotes";
import { PlatformIcon } from "./icons";
import { CashTag } from "./CashTag";

function renderText(text: string) {
  // Tokenize on whitespace so we can swap @mentions, $cashtags and emote words.
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    if (/^@[a-zA-Z0-9_]{2,25}$/.test(tok)) {
      return (
        <span key={i} className="text-brand-2 font-medium">
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
          className="inline-block h-[22px] w-auto max-w-none translate-y-[-1px] align-middle"
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
  // Subscribe so rows re-render once the global emote sets finish loading.
  useDeck((s) => s.emotesReady);

  if (msg.isHost) {
    return (
      <div
        className={cn(
          "relative mx-2 my-1 flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] leading-snug",
          fresh && "animate-msg-in",
        )}
        style={{
          background: "rgba(184,139,255,0.08)",
          borderColor: "rgba(184,139,255,0.35)",
        }}
      >
        <Megaphone className="mt-[2px] h-3.5 w-3.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <span className="mr-1.5 inline-flex items-center gap-1 align-baseline">
            <span className="font-semibold text-brand">{msg.displayName}</span>
            <span className="rounded bg-brand/20 px-1 text-[9px] font-bold uppercase tracking-wider text-brand">
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
          <a
            href={profileUrl(msg.platform, msg.username)}
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
            style={{ color: msg.color }}
            title={`@${msg.username} on ${meta.name}`}
          >
            {msg.displayName}
          </a>
        </span>
        <span className="break-words text-[#d4d8e0]">{renderText(msg.text)}</span>
      </div>

      <div className="flex shrink-0 items-start gap-1.5">
        <button
          onClick={() => useDeck.getState().setFeatured(msg)}
          className="mt-[1px] rounded p-0.5 text-faint opacity-0 transition hover:bg-white/10 hover:text-brand group-hover:opacity-100"
          title="Feature this message"
          aria-label="Feature this message"
        >
          <Pin className="h-3 w-3" />
        </button>
        <span className="mono mt-[3px] text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
          {formatClock(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

export const MessageRow = memo(MessageRowBase);
