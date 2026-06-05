"use client";

// Real Twitch stream metadata (live status, viewer count, title) via Twitch's
// public web GQL endpoint — the same one twitch.tv uses from the browser, so it
// works client-side with no auth and no CORS proxy. Read-only.
const GQL = "https://gql.twitch.tv/gql";
const PUBLIC_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export interface TwitchMeta {
  isLive: boolean;
  viewers: number;
  title?: string;
}

export async function fetchTwitchMeta(channel: string): Promise<TwitchMeta | null> {
  const login = channel.toLowerCase().replace(/^#/, "").trim();
  try {
    const res = await fetch(GQL, {
      method: "POST",
      headers: {
        "Client-Id": PUBLIC_CLIENT_ID,
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify([
        {
          operationName: "UseLive",
          variables: { channelLogin: login },
          query:
            "query UseLive($channelLogin: String!) { user(login: $channelLogin) { id stream { id viewersCount } lastBroadcast { title } } }",
        },
      ]),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.[0]?.data?.user;
    if (!user) return { isLive: false, viewers: 0 };
    const stream = user.stream;
    return {
      isLive: Boolean(stream),
      viewers: stream?.viewersCount ?? 0,
      title: user.lastBroadcast?.title ?? undefined,
    };
  } catch {
    return null;
  }
}
