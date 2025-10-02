import { NextRequest } from 'next/server'
import { normalizeRegion, platformHost, type Platform } from '@/lib/riot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const summoner = searchParams.get('summoner') || 'summoner'
  const region = normalizeRegion(searchParams.get('region') || process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1') as Platform

  const key = process.env.RIOT_API_KEY || ''
  const present = key.length > 0
  const masked = present ? key.slice(0, 6) + '…' + key.slice(-4) : ''

  let externalStatus: number | null = null
  let externalOk = false
  let externalMessage: string | null = null
  if (present) {
    try {
      const isRiotId = summoner.includes('#')
      const looksLikePuuid = !isRiotId && /^[A-Za-z0-9_-]{56,128}$/.test(summoner)

      let url: string
      if (isRiotId) {
        const [gameName, tagLine] = summoner.split('#')
        const regHost = region === 'na1' || region === 'br1' || region === 'la1' || region === 'la2' ? 'americas'
          : (region === 'euw1' || region === 'eun1' || region === 'tr1' || region === 'ru') ? 'europe'
          : (region === 'kr' || region === 'jp1') ? 'asia' : 'sea'
        url = `https://${regHost}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      } else if (looksLikePuuid) {
        url = `https://${platformHost(region)}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(summoner)}`
      } else {
        url = `https://${platformHost(region)}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summoner)}`
      }

      const res = await fetch(url , { headers: { 'X-Riot-Token': key } })
      externalStatus = res.status
      externalOk = res.ok
      if (!res.ok) {
        try {
          const j = await res.json()
          externalMessage = (j?.status?.message as string) || null
        } catch {}
      }
    } catch (e: any) {
      externalMessage = 'fetch error'
    }
  }

  return Response.json({
    env: {
      riotKeyPresent: present,
      riotKeyMasked: masked,
      defaultRegion: process.env.NEXT_PUBLIC_DEFAULT_REGION || null,
      defaultSummoner: process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || null,
      defaultPuuid: process.env.NEXT_PUBLIC_DEFAULT_PUUID || process.env.DEFAULT_PUUID || null,
    },
    probe: {
      region,
      summoner,
      externalStatus,
      externalOk,
      externalMessage,
    }
  })
}
