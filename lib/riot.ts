export type Platform = 'na1'|'euw1'|'eun1'|'kr'|'br1'|'jp1'|'la1'|'la2'|'oc1'|'ru'|'tr1'

const DDRAGON_VERSION = '13.24.1' // fallback; can be refreshed via API

export function platformHost(region: Platform) {
  return `${region}.api.riotgames.com`
}

// Regional routing for Account-V1 and Match-V5
export type RegionCluster = 'americas' | 'europe' | 'asia' | 'sea'
export function regionalHost(platform: Platform): RegionCluster {
  switch (platform) {
    case 'na1':
    case 'br1':
    case 'la1':
    case 'la2':
      return 'americas'
    case 'euw1':
    case 'eun1':
    case 'tr1':
    case 'ru':
      return 'europe'
    case 'kr':
    case 'jp1':
      return 'asia'
    case 'oc1':
      return 'sea'
  }
}

/**
 * Normalize user-provided region strings to Platform codes.
 * Accepts values like 'brazil', 'br', 'br1' => 'br1', 'na' => 'na1', 'euw' => 'euw1', etc.
 */
export function normalizeRegion(input: string | null | undefined): Platform {
  const raw = (input || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const map: Record<string, Platform> = {
    // North America
    na: 'na1', na1: 'na1', northamerica: 'na1', northamericA: 'na1', northamericawest: 'na1',
    // Europe West
    euw: 'euw1', euw1: 'euw1', europewest: 'euw1', europew: 'euw1',
    // Europe Nordic & East
    eune: 'eun1', eun1: 'eun1', europenordiceast: 'eun1', europenordicandeseast: 'eun1', europeeast: 'eun1',
    // Korea
    kr: 'kr', korea: 'kr',
    // Brazil
    br: 'br1', br1: 'br1', brazil: 'br1',
    // Japan
    jp: 'jp1', jp1: 'jp1', japan: 'jp1',
    // Latin America North/South
    lan: 'la1', la1: 'la1', latinamericanorth: 'la1',
    las: 'la2', la2: 'la2', latinamericasouth: 'la2',
    // Oceania
    oce: 'oc1', oc1: 'oc1', oceania: 'oc1',
    // Russia
    ru: 'ru', russia: 'ru',
    // Turkey
    tr: 'tr1', tr1: 'tr1', turkey: 'tr1',
  }
  return map[raw] || 'na1'
}

export function championSquare(champId?: number) {
  if (!champId) return 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg'
  // CommunityDragon mapping by numeric id is available; for now use CDragon square by id
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champId}.png`
}

// Map numeric summoner spell id -> DDragon filename slug
function spellIdToSlug(id?: number): string {
  const map: Record<number, string> = {
    1: 'SummonerBoost',        // Cleanse
    3: 'SummonerExhaust',      // Exhaust
    4: 'SummonerFlash',        // Flash
    6: 'SummonerHaste',        // Ghost
    7: 'SummonerHeal',         // Heal
    11: 'SummonerSmite',       // Smite (base icon)
    12: 'SummonerTeleport',    // Teleport
    13: 'SummonerMana',        // Clarity (ARAM)
    14: 'SummonerDot',         // Ignite
    21: 'SummonerBarrier',     // Barrier
    32: 'SummonerSnowball',    // Mark/Snowball
  }
  return map[id ?? -1] || 'SummonerFlash'
}

export function spellIcon(spellId?: number) {
  const slug = spellIdToSlug(spellId)
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/spell/${slug}.png`
}

// Aliases expected by components (single, robust implementations)
export function championIconFor(input: number | { championId?: number } | null | undefined) {
  const id = typeof input === 'number' ? input : input?.championId
  return championSquare(id)
}

export function summonerSpellIconFor(
  input: number | { spell1Id?: number; spell2Id?: number } | null | undefined,
  which: 1 | 2 = 1,
) {
  if (typeof input === 'number') return spellIcon(input)
  const id = which === 1 ? input?.spell1Id : input?.spell2Id
  return spellIcon(id)
}

// Minimal mapping for Live Client Data (names → IDs)
export function summonerSpellNameToId(name?: string): number | undefined {
  const n = (name || '').toLowerCase()
  const map: Record<string, number> = {
    barrier: 21,
    boost: 1, cleanse: 1,
    clarity: 13,
    teleport: 12, teleportenhanced: 12,
    exhaust: 3,
    flash: 4,
    ghost: 6,
    heal: 7,
    ignite: 14,
    smite: 11, smitechallenging: 11, smitechilling: 11,
    snowball: 32, mark: 32,
  }
  return map[n]
}

export type ActiveGameShape = {
  gameId: number
  gameMode: string
  mapId: number
  participants: Array<{
    summonerName: string
    championId: number
    spell1Id: number
    spell2Id: number
    team: 'BLUE' | 'RED'
  }>
  goldLead: number
}

export type ActiveGameResult = { data: ActiveGameShape | null; status: number; message?: string; retryAfterMs?: number; source?: 'spectator-v5' | 'spectator-v4' }

export async function getActiveGame(region: Platform, summonerOrRiotId: string, apiKey: string): Promise<ActiveGameResult> {
  const base = `https://${platformHost(region)}`
  let summoner: any = null
  let puuid: string | null = null

  // Heuristics
  const isRiotId = summonerOrRiotId.includes('#')
  const looksLikePuuid = !isRiotId && /^[A-Za-z0-9_-]{56,128}$/.test(summonerOrRiotId)
  const parseErr = async (res: Response, fallback: string) => {
    try {
      const j = await res.json() as any
      return (j?.status?.message as string) || fallback
    } catch {
      return fallback
    }
  }
  const parseRetryAfter = (res: Response): number | undefined => {
    const v = res.headers.get('Retry-After') || res.headers.get('retry-after')
    if (!v) return undefined
    if (/^\d+$/.test(v)) return parseInt(v, 10) * 1000
    const dateMs = Date.parse(v)
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now())
    return undefined
  }

  // Input is Riot ID (GameName#TagLine): Account-V1 -> Summoner-V4 by PUUID
  if (isRiotId) {
    const [gameName, tagLine] = summonerOrRiotId.split('#')
    const reg = regionalHost(region)
    const acct = await fetch(`https://${reg}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, {
      headers: { 'X-Riot-Token': apiKey },
    })
  if (!acct.ok) return { data: null, status: acct.status, message: await parseErr(acct, 'account lookup failed'), retryAfterMs: acct.status === 429 ? parseRetryAfter(acct) : undefined }
    const account = await acct.json()
    puuid = account.puuid
    // Optionally fetch summoner to have id for v4 fallback
  const sum = await fetch(`${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid!)}`, { headers: { 'X-Riot-Token': apiKey } })
  if (sum.ok) summoner = await sum.json()
  } else if (looksLikePuuid) {
    // Input is raw PUUID: Summoner-V4 by-puuid
    puuid = summonerOrRiotId
  const res = await fetch(`${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid!)}`, { headers: { 'X-Riot-Token': apiKey } })
  if (res.ok) summoner = await res.json()
  else return { data: null, status: res.status, message: await parseErr(res, 'summoner lookup by puuid failed'), retryAfterMs: res.status === 429 ? parseRetryAfter(res) : undefined }
  } else {
    // Fallback: by-name
    const summonerRes = await fetch(`${base}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerOrRiotId)}`, {
      headers: { 'X-Riot-Token': apiKey }
    })
  if (!summonerRes.ok) return { data: null, status: summonerRes.status, message: await parseErr(summonerRes, 'summoner lookup failed'), retryAfterMs: summonerRes.status === 429 ? parseRetryAfter(summonerRes) : undefined }
    summoner = await summonerRes.json()
    puuid = summoner.puuid
  }

  // Try Spectator-V5 by PUUID first (per current API docs)
  if (puuid) {
    const v5 = await fetch(`${base}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid!)}`, {
      headers: { 'X-Riot-Token': apiKey }
    })
    if (v5.ok) {
      const game = await v5.json()
      const participants = (game.participants || []).map((p: any) => ({
        summonerName: p.summonerName,
        championId: p.championId,
        spell1Id: p.spell1Id,
        spell2Id: p.spell2Id,
        team: p.teamId === 100 ? 'BLUE' : 'RED'
      }))
      return {
        data: { gameId: game.gameId, gameMode: game.gameMode, mapId: game.mapId, participants, goldLead: 0 },
        status: 200,
        source: 'spectator-v5',
      }
    } else if (v5.status === 404) {
      return { data: null, status: 404, message: 'no active game' }
    } else {
      // Will try V4 fallback if we have summoner id; otherwise report v5 error
      if (!summoner?.id) {
  const sum = await fetch(`${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid!)}`, { headers: { 'X-Riot-Token': apiKey } })
        if (sum.ok) summoner = await sum.json()
      }
      if (!summoner?.id) {
        return { data: null, status: v5.status, message: await parseErr(v5, 'spectator v5 request failed'), retryAfterMs: v5.status === 429 ? parseRetryAfter(v5) : undefined }
      }
      // fallthrough to V4 below
    }
  }

  // Fallback: Spectator-V4 by encryptedSummonerId
  if (!summoner?.id) {
    return { data: null, status: 400, message: 'missing summoner id for v4 fallback' }
  }
  const gameRes = await fetch(`${base}/lol/spectator/v4/active-games/by-summoner/${encodeURIComponent(summoner.id)}`, {
    headers: { 'X-Riot-Token': apiKey }
  })
  if (!gameRes.ok) {
    const status = gameRes.status
    if (status === 404) return { data: null, status, message: 'no active game' }
    const msg = await parseErr(gameRes, 'spectator v4 request failed')
    return { data: null, status, message: msg, retryAfterMs: status === 429 ? parseRetryAfter(gameRes) : undefined }
  }
  const game = await gameRes.json()

  const participants = (game.participants || []).map((p: any) => ({
    summonerName: p.summonerName,
    championId: p.championId,
    spell1Id: p.spell1Id,
    spell2Id: p.spell2Id,
    team: p.teamId === 100 ? 'BLUE' : 'RED'
  }))
  return {
    data: {
      gameId: game.gameId,
      gameMode: game.gameMode,
      mapId: game.mapId,
      participants,
      goldLead: 0,
    },
    status: 200,
    source: 'spectator-v4',
  }
}

// --------- Stats (profile + ranked + mastery) ---------
export type RankedEntry = {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

export type SummonerStats = {
  profile: { name: string; level: number; profileIconId: number }
  ranked: RankedEntry[]
  topMastery: Array<{ championId: number; championPoints: number }>
  recent?: RecentMatch[]
}

export type RecentMatch = {
  id: string
  championId: number
  kills: number
  deaths: number
  assists: number
  win: boolean
  queueId: number
  gameDuration: number
  gameCreation: number
}

async function resolveSummoner(region: Platform, summonerOrRiotId: string, apiKey: string): Promise<{ id: string; puuid: string; name: string; profileIconId: number; summonerLevel: number } | null> {
  const base = `https://${platformHost(region)}`
  const isRiotId = summonerOrRiotId.includes('#')
  const looksLikePuuid = !isRiotId && /^[A-Za-z0-9_-]{56,128}$/.test(summonerOrRiotId)
  try {
    if (isRiotId) {
      const [gameName, tagLine] = summonerOrRiotId.split('#')
      const reg = regionalHost(region)
      const acct = await fetch(`https://${reg}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, { headers: { 'X-Riot-Token': apiKey } })
      if (!acct.ok) return null
      const a = await acct.json()
      const s = await fetch(`${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(a.puuid)}`, { headers: { 'X-Riot-Token': apiKey } })
      if (!s.ok) return null
      return await s.json()
    } else if (looksLikePuuid) {
      const s = await fetch(`${base}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(summonerOrRiotId)}`, { headers: { 'X-Riot-Token': apiKey } })
      if (!s.ok) return null
      return await s.json()
    } else {
      const s = await fetch(`${base}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerOrRiotId)}`, { headers: { 'X-Riot-Token': apiKey } })
      if (!s.ok) return null
      return await s.json()
    }
  } catch {
    return null
  }
}

export async function getSummonerStats(region: Platform, summonerOrRiotId: string, apiKey: string): Promise<{ status: number; data: SummonerStats | null; message?: string }> {
  const base = `https://${platformHost(region)}`
  const s = await resolveSummoner(region, summonerOrRiotId, apiKey)
  if (!s) return { status: 404, data: null, message: 'summoner not found' }
  try {
    // Prefer fetching league entries by PUUID (per Riot docs), fallback to by-summoner if needed
    const rankedByPuuidRes = await fetch(`${base}/lol/league/v4/entries/by-puuid/${encodeURIComponent(s.puuid)}`, { headers: { 'X-Riot-Token': apiKey } })
    let ranked: RankedEntry[] = []
    if (rankedByPuuidRes.ok) {
      ranked = await rankedByPuuidRes.json()
    } else {
      const rankedBySummonerRes = await fetch(`${base}/lol/league/v4/entries/by-summoner/${encodeURIComponent(s.id)}`, { headers: { 'X-Riot-Token': apiKey } })
      ranked = rankedBySummonerRes.ok ? await rankedBySummonerRes.json() : []
    }

    const masteryRes = await fetch(`${base}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(s.puuid)}/top?count=3`, { headers: { 'X-Riot-Token': apiKey } })
    const masteryRaw: any[] = masteryRes.ok ? await masteryRes.json() : []
    const topMastery = (masteryRaw || []).map(m => ({ championId: m.championId, championPoints: m.championPoints }))

    // Recent matches (limit to 3 to avoid rate limits)
    const reg = regionalHost(region)
    let recent: RecentMatch[] = []
    try {
      const idsRes = await fetch(`https://${reg}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(s.puuid)}/ids?start=0&count=3`, { headers: { 'X-Riot-Token': apiKey } })
      if (idsRes.ok) {
        const ids: string[] = await idsRes.json()
        const detailRes = await Promise.all(ids.map(id => fetch(`https://${reg}.api.riotgames.com/lol/match/v5/matches/${id}`, { headers: { 'X-Riot-Token': apiKey } })))
        const detailJson = await Promise.all(detailRes.map(r => r.ok ? r.json() : null))
        recent = detailJson.filter(Boolean).map((m: any, idx: number) => {
          const info = m.info || {}
          const part = (info.participants || []).find((p: any) => p.puuid === s.puuid) || {}
          return {
            id: ids[idx],
            championId: part.championId || 0,
            kills: part.kills || 0,
            deaths: part.deaths || 0,
            assists: part.assists || 0,
            win: !!part.win,
            queueId: info.queueId || 0,
            gameDuration: info.gameDuration || 0,
            gameCreation: info.gameCreation || 0,
          } as RecentMatch
        })
      }
    } catch {}
    return {
      status: 200,
      data: {
        profile: { name: s.name, level: s.summonerLevel, profileIconId: s.profileIconId },
        ranked,
        topMastery,
        recent,
      }
    }
  } catch {
    return { status: 500, data: null, message: 'stats fetch failed' }
  }
}
