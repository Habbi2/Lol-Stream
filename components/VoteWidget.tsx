"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import tmi from 'tmi.js'

export default function VoteWidget() {
  const [params, setParams] = useState<URLSearchParams | null>(null)

  // Initialize URLSearchParams on client only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParams(new URLSearchParams(window.location.search))
    }
  }, [])

  const enabled = !!params && (params.get('vote') !== null || params.get('twitch') !== null)
  const channel = (params?.get('twitch') || '').replace(/^#/, '')
  const optsRaw = params?.get('vote') || 'Top,Mid,Bot'
  const options = useMemo(() => optsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6), [optsRaw])
  const [tally, setTally] = useState<Record<string, number>>(() => Object.fromEntries(options.map((o) => [o, 0])))
  const voters = useRef<Set<string>>(new Set())

  // Connect to Twitch chat when enabled
  useEffect(() => {
    if (!enabled || !channel) return
    const client = new tmi.Client({ channels: [channel] })
    client.connect().catch(() => {})

    const handler = (channelName: string, userstate: tmi.ChatUserstate, message: string) => {
      const m = message.toLowerCase().trim()
      const match = m.match(/^!vote\s+(.+)/)
      if (!match) return
      const choiceRaw = match[1].trim()
      const choice = options.find((o) => o.toLowerCase() === choiceRaw.toLowerCase())
      const user = userstate['user-id'] || userstate.username || Math.random().toString(36)
      if (!choice || voters.current.has(user as string)) return
      voters.current.add(user as string)
      setTally((prev) => ({ ...prev, [choice]: (prev[choice] || 0) + 1 }))
    }

    client.on('message', handler)
    return () => {
      // tmi.js client doesn't have `off` in types; removeListener is supported
      // @ts-ignore
      if (typeof (client as any).off === 'function') (client as any).off('message', handler)
      else (client as any).removeListener?.('message', handler)
      client.disconnect().catch(() => {})
    }
  }, [enabled, channel, options])

  if (!enabled) return null
  const total = Object.values(tally).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="glass px-3 py-2 rounded-lg w-80">
      <div className="text-xs text-zinc-300 mb-2">Chat Vote {!channel ? '(add ?twitch=channel)' : `#${channel}`}</div>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const count = tally[o] || 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={o} className="w-full">
              <div className="flex justify-between text-xs"><span>{o}</span><span>{count} • {pct}%</span></div>
              <div className="h-2 bg-white/10 rounded">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-2 bg-primary rounded" />
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-[10px] text-zinc-500 mt-1">Use: !vote {options[0]}</div>
    </div>
  )
}
