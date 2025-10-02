"use client"

import Image from 'next/image'
import { championSquare } from '@/lib/riot'

type RankedEntry = {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

type StatsData = {
  profile: { name: string; level: number; profileIconId: number }
  ranked: RankedEntry[]
  topMastery: Array<{ championId: number; championPoints: number }>
  recent?: Array<{ id: string; championId: number; kills: number; deaths: number; assists: number; win: boolean; queueId: number; gameDuration: number; gameCreation: number }>
}

export default function StatsPanel({ data }: { data: StatsData | null }) {
  if (!data) return null
  const solo = data.ranked.find(r => r.queueType?.toUpperCase().includes('RANKED_SOLO'))
  const flex = data.ranked.find(r => r.queueType?.toUpperCase().includes('RANKED_FLEX'))

  return (
    <div className="glass rounded-xl p-4 w-[380px] text-sm text-zinc-200 space-y-3">
      <div className="flex items-center gap-3">
        <Image src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${data.profile.profileIconId}.jpg`} alt="icon" width={48} height={48} className="rounded" />
        <div>
          <div className="text-lg font-semibold">{data.profile.name}</div>
          <div className="text-zinc-400 text-xs">Level {data.profile.level}</div>
        </div>
      </div>

        {Array.isArray(data.recent) && data.recent.length > 0 && (
          <div>
            <div className="text-xs text-zinc-400 mb-2">Recent matches</div>
            <div className="flex flex-col gap-2">
              {data.recent.slice(0,3).map((m, i) => (
                <div key={m.id || i} className="flex items-center justify-between bg-zinc-900/50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <Image src={championSquare(m.championId)} alt="champ" width={28} height={28} className="rounded" />
                    <div className="text-xs text-zinc-300">
                      {m.kills}/{m.deaths}/{m.assists}
                    </div>
                  </div>
                  <div className={`text-xs ${m.win ? 'text-emerald-400' : 'text-rose-400'}`}>{m.win ? 'Win' : 'Loss'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="grid grid-cols-2 gap-3">
        <QueueCard title="Solo/Duo" entry={solo} />
        <QueueCard title="Flex" entry={flex} />
      </div>

      <div>
        <div className="text-xs text-zinc-400 mb-2">Top champions</div>
        <div className="flex items-center gap-3">
          {data.topMastery.slice(0,3).map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <Image src={championSquare(m.championId)} alt="champ" width={36} height={36} className="rounded" />
              <div className="text-xs text-zinc-300">{formatK(m.championPoints)} pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QueueCard({ title, entry }: { title: string; entry?: RankedEntry }) {
  if (!entry) return (
    <div className="bg-zinc-900/50 rounded p-3">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-zinc-300">Unranked</div>
    </div>
  )
  const wr = entry.wins + entry.losses > 0 ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0
  return (
    <div className="bg-zinc-900/50 rounded p-3">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-zinc-200 font-semibold">{entry.tier} {entry.rank} • {entry.leaguePoints} LP</div>
      <div className="text-xs text-zinc-400">{entry.wins}W {entry.losses}L • {wr}% WR</div>
    </div>
  )
}

function formatK(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}
