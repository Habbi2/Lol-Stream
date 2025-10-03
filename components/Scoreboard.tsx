"use client"

import Image from 'next/image'
import { championSquare } from '@/lib/riot'

type ActiveGame = any

export default function Scoreboard({ data, gameKey }: { data: ActiveGame | null; gameKey?: string }) {
  return (
    <div className="glass px-4 py-2 rounded-xl flex items-center gap-4">
      <div className="flex items-center gap-2">
  {side(data, 'BLUE').map((p: any, i: number) => (
          <div key={`${p?.summonerName || 'B'}-${p?.championId || i}`} className="relative">
            <Image
              src={`${championSquare(p?.championId)}${gameKey ? `?v=${encodeURIComponent(gameKey)}` : ''}`}
              alt="champ"
              width={34}
              height={34}
              className="rounded"
              unoptimized
            />
          </div>
        ))}
      </div>
      <div className="text-zinc-500">vs</div>
      <div className="flex items-center gap-2">
  {side(data, 'RED').map((p: any, i: number) => (
          <div key={`${p?.summonerName || 'R'}-${p?.championId || i}`} className="relative">
            <Image
              src={`${championSquare(p?.championId)}${gameKey ? `?v=${encodeURIComponent(gameKey)}` : ''}`}
              alt="champ"
              width={34}
              height={34}
              className="rounded"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function side(data: any, which: 'BLUE'|'RED') {
  return data?.participants?.filter((p: any) => p.team === which) ?? new Array(5).fill(null)
}
