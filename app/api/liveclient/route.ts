import type { NextRequest } from 'next/server'
import { summonerSpellNameToId, championIconFor } from '@/lib/riot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const pollMs = Math.max(1000, Number(url.searchParams.get('poll') || 2000))

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      let stopped = false

      async function push(type: string, payload: any) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type, payload, ts: Date.now() })}\n\n`))
      }

      async function snapshot() {
        try {
          const res = await fetch('http://127.0.0.1:2999/liveclientdata/allgamedata')
          if (!res.ok) {
            await push('activeGame', { status: res.status, message: 'liveclient fetch failed', data: null })
            return
          }
          const j = await res.json()
          const players = (j.allPlayers || []).map((p: any) => ({
            summonerName: p.summonerName,
            championId: p.championId || p.rawChampionId || 0,
            spell1Id: summonerSpellNameToId(p.summonerSpells?.summonerSpellOne?.displayName) || undefined,
            spell2Id: summonerSpellNameToId(p.summonerSpells?.summonerSpellTwo?.displayName) || undefined,
            team: p.team === 'ORDER' ? 'BLUE' : 'RED',
          }))
          const payload = {
            gameMode: j.gameData?.gameMode || 'CLASSIC',
            mapId: j.gameData?.mapName?.includes('Howling') ? 12 : 11,
            participants: players,
            // goldLead intentionally omitted per request
          }
          await push('activeGame', { status: 200, data: payload })
        } catch (e) {
          await push('activeGame', { status: 0, message: 'liveclient connection error', data: null })
        }
      }

      const interval = setInterval(snapshot, pollMs)
      await snapshot()

      const close = () => { clearInterval(interval); stopped = true; controller.close() }
      // @ts-ignore
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
