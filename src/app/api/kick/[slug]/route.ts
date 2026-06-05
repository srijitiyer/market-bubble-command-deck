import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve a Kick channel slug -> chatroom id. Kick's public REST endpoints sit
// behind Cloudflare, which fingerprints clients beyond the User-Agent, so a
// plain server fetch can be 403'd. We try a couple of endpoints with browser-
// like headers and surface a clean error if Cloudflare blocks us, so the client
// can fall back gracefully (manual chatroom id, or demo mode).
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://kick.com/",
  Origin: "https://kick.com",
};

interface KickChannelResponse {
  id?: number;
  chatroom?: { id?: number };
  livestream?: {
    is_live?: boolean;
    viewer_count?: number;
    session_title?: string;
  } | null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const clean = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!clean) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const endpoints = [
    `https://kick.com/api/v2/channels/${clean}`,
    `https://kick.com/api/v1/channels/${clean}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) continue;
      const json = (await res.json()) as KickChannelResponse;
      const chatroomId = json.chatroom?.id;
      if (chatroomId) {
        return NextResponse.json(
          {
            chatroomId,
            channelId: json.id,
            title: json.livestream?.session_title,
            viewers: json.livestream?.viewer_count,
            isLive: Boolean(json.livestream?.is_live),
          },
          { headers: { "Cache-Control": "public, max-age=30" } },
        );
      }
    } catch {
      // try next endpoint
    }
  }

  return NextResponse.json(
    {
      error:
        "Kick blocked the lookup (Cloudflare). Enter the chatroom id manually or use demo mode.",
    },
    { status: 502 },
  );
}
