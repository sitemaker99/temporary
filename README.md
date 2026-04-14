# Aniflix — Upgraded with Anveshna Streaming Engine

A Next.js anime streaming app with:
- **UnifiedPlayer** — HLS direct stream (via `@vidstack/react`) with automatic iframe fallback
- **Multi-server support** — HD-1 / HD-2 servers, Sub & Dub switching
- **Auto-skip** intro/outro with skip-time detection
- **Episode List** — list / grid / image-grid layouts with search & watch tracking
- **Watch history** saved to localStorage
- **Firebase auth** — Google + email login, bookmarks
- **No ad-blocker required** — streams directly via HLS or trusted iframe providers

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in your backend URLs in .env.local (see below)
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CF_BACKEND_URL` | Recommended | Anveshna-compatible CF backend for streaming. If empty, falls back to built-in hianime scraper. |
| `NEXT_PUBLIC_CF_PROXY_URL` | Optional | Cloudflare media proxy for HLS. If empty, streams directly. |
| `NEXT_PUBLIC_BACKEND_URL` | Optional | Consumet/Anilist backend for search, trending, metadata. |
| `NEXT_PUBLIC_SKIP_TIMES` | Optional | AniSkip API for intro/outro skip times. Defaults to `https://api.aniskip.com/` |
| Firebase vars | Required for auth | See `.env.example` |

## Architecture

```
video-player-section.tsx       ← wires store → UnifiedPlayer + MediaSource
  └─ UnifiedPlayer.tsx         ← HLS player (vidstack) with iframe fallback
  └─ MediaSource.tsx           ← HD-1/HD-2 × Sub/Dub server switcher
  └─ EpisodeList.tsx           ← Episode sidebar (list/grid/image)

hooks/useApi.ts                ← fetchAnimeStreamingLinks()
  ├─ tries CF backend (NEXT_PUBLIC_CF_BACKEND_URL)
  └─ falls back to /api/anime/sources  →  hianime scraper (@dovakiin0/aniwatch)
```

## Streaming Servers

The player supports:
- **HD-1** (megaplay.buzz / vidcloud) — Sub & Dub
- **HD-2** (vidwish.live / vidstreaming) — Sub & Dub

Server selection UI is shown below the player. The player first tries HLS; if no valid `.m3u8` is returned it automatically switches to the iframe player.
