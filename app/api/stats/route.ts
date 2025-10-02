import { NextRequest } from 'next/server'
import { getSummonerStats, normalizeRegion } from '@/lib/riot'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = normalizeRegion(searchParams.get('region') || process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1')
  const summoner = searchParams.get('summoner') || process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || ''
  const apiKey = process.env.RIOT_API_KEY || ''
  if (!apiKey) return new Response(JSON.stringify({ message: 'Missing RIOT_API_KEY' }), { status: 500 })
  const res = await getSummonerStats(region, summoner, apiKey)
  return new Response(JSON.stringify(res), { status: res.status, headers: { 'content-type': 'application/json' } })
}
