import type { NextRequest } from 'next/server'
import { getActiveGame, getSummonerStats, normalizeRegion, type Platform } from '@/lib/riot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const regionEnv = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1'
  const puuidEnv = process.env.NEXT_PUBLIC_DEFAULT_PUUID || process.env.DEFAULT_PUUID || ''
  const summonerEnv = puuidEnv || process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || ''
  const region = normalizeRegion(searchParams.get('region') || regionEnv) as Platform
  const summoner = searchParams.get('summoner') || summonerEnv
  if (!summoner) return new Response('Bad Request', { status: 400 })

  const apiKey = process.env.RIOT_API_KEY
  if (!apiKey) return new Response('Server not configured', { status: 500 })
  const riotKey: string = apiKey as string

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      async function pushEvent(type: string, payload: any) {
        const data = JSON.stringify({ type, payload, ts: Date.now() })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      let stopped = false
      let pollTimer: any = null
      const IN_GAME_MS = 3000
      const IDLE_MS = 30000
      let backoffMs = 3000
      const MAX_BACKOFF_MS = 120000
      const STATS_COOLDOWN_MS = 60000
      let lastStatsAt = 0

      function jitter(n: number) { return Math.max(0, Math.floor(n + (Math.random() * 0.15 - 0.05) * n)) }
      function scheduleNext(ms: number) {
        if (stopped) return
        if (pollTimer) clearTimeout(pollTimer)
        pollTimer = setTimeout(pollOnce, Math.max(500, ms))
      }
      // Send initial config for easier debugging on the client
      pushEvent('config', { region, summoner: summoner.slice(0, 6) + (summoner.length > 10 ? '…' : '') })

      async function pollOnce() {
        if (stopped) return
        try {
          const res = await getActiveGame(region, summoner, riotKey)

          await pushEvent('activeGame', res)
          if (res.data && Math.random() < 0.25) {
            await pushEvent('highlight', { title: 'Nice Trade', message: `${summoner} won a skirmish` })
          }
          // When not in game, emit stats on a cooldown so we don't spam
          if ((!res.data || res.status === 404) && (Date.now() - lastStatsAt > STATS_COOLDOWN_MS)) {
            try {
              const stats = await getSummonerStats(region, summoner, riotKey)
              await pushEvent('stats', stats)
              lastStatsAt = Date.now()
            } catch {}
          }

          // Adaptive scheduling
          if (res.status === 429) {
            // Prefer server-provided retryAfter
            const retry = (res as any)?.retryAfterMs
            if (typeof retry === 'number' && retry > 0) {
              scheduleNext(jitter(retry))
            } else {
              backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
              scheduleNext(jitter(backoffMs))
            }
          } else if (res.data) {
            backoffMs = IN_GAME_MS
            scheduleNext(IN_GAME_MS)
          } else {
            backoffMs = IDLE_MS
            scheduleNext(IDLE_MS)
          }
        } catch (e: any) {
          await pushEvent('error', { message: 'poll failed', detail: String(e?.message || e) })
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
          scheduleNext(jitter(backoffMs))
        }
      }

      // Immediate first poll, then adaptive scheduling
      pollOnce()

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`))
      }, 15000)

      const close = () => {
        clearInterval(keepAlive)
        stopped = true
        if (pollTimer) clearTimeout(pollTimer)
        controller.close()
      }

      // @ts-ignore - close on client abort if available
      req.signal?.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
