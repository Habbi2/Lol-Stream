# LoL Stream Overlay

Production-ready browser overlay for OBS, built with Next.js 14, Tailwind, and Framer Motion. Deploy to Vercel, then add the URL as a Browser Source (1920x1080).

## Quick start

1. Create `.env.local` with your Riot key:

```
RIOT_API_KEY=YOUR_KEY
```

2. Install deps and run dev:

```
npm install
npm run dev
```

3. Open http://localhost:3000?summoner=YourName&region=na1

Add that URL to OBS as a Browser Source.

## Features
- Live active-game polling via SSE
- Scoreboard, spell tracker, and highlight popups
- Clean neon glassmorphism theme

## Deploy
- Push to GitHub and import in Vercel
- Add environment variable `RIOT_API_KEY`

## Notes
- WebSockets on Vercel can be done via a provider (Ably/Supabase Realtime/Upstash WS). This starter uses SSE for simplicity; swap the transport in `/app/api/sse/route.ts`.

MIT Licensed.
