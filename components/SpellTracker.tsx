"use client"

import { motion } from 'framer-motion'
import Image from 'next/image'
import { spellIcon, championSquare } from '@/lib/riot'

type ActiveGame = any

export default function SpellTracker({ data }: { data: ActiveGame | null }) {
  const blue = data?.participants?.filter((p: any) => p.team === 'BLUE') ?? []
  const red = data?.participants?.filter((p: any) => p.team === 'RED') ?? []

  return (
    <div className="glass px-3 py-3 rounded-xl flex flex-col gap-3 items-start">
      <TeamColumn team="BLUE" players={blue} />
      <div className="w-full h-px bg-white/10" />
      <TeamColumn team="RED" players={red} />
    </div>
  )
}

function TeamColumn({ team, players }: { team: 'BLUE'|'RED', players: any[] }) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <motion.div layout key={`${p?.summonerName || team}-${p?.championId || i}`} className="flex items-center gap-2">
          {/* tiny champ portrait */}
          <Image src={championSquare(p?.championId)} alt="champ" width={20} height={20} className="rounded" />
          {/* small label */}
          <div className="text-[10px] text-zinc-300 max-w-[120px] truncate">{p?.summonerName || ''}</div>
          {/* spells */}
          <div className="flex items-center gap-1">
            <Image src={spellIcon(p?.spell1Id)} alt="s1" width={22} height={22} className="rounded-sm" />
            <Image src={spellIcon(p?.spell2Id)} alt="s2" width={22} height={22} className="rounded-sm" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
