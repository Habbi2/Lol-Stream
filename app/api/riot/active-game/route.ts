import { NextRequest } from 'next/server'
import { getActiveGame, normalizeRegion, type Platform } from '@/lib/riot'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const regionEnv = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1'
  const puuidEnv = process.env.NEXT_PUBLIC_DEFAULT_PUUID || process.env.DEFAULT_PUUID || ''
  const summonerEnv = puuidEnv || process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || ''
  const region = normalizeRegion(searchParams.get('region') || regionEnv) as Platform
  const summoner = searchParams.get('summoner') || summonerEnv
  if (!summoner) return new Response(JSON.stringify({ error: 'missing summoner' }), { status: 400 })

  const apiKey = process.env.RIOT_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'server not configured' }), { status: 500 })

  const res = await getActiveGame(region, summoner, apiKey)
  return Response.json(res, { status: res.status === 200 ? 200 : res.status })
}
