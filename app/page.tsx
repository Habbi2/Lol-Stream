"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { normalizeRegion } from '@/lib/riot'
import Scoreboard from '@/components/Scoreboard'
import SpellTracker from '@/components/SpellTracker'
import VoteWidget from '@/components/VoteWidget'
import ObsControls from '@/components/ObsControls'
import StatsPanel from '@/components/StatsPanel'

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastStatus, setLastStatus] = useState<number | null>(null)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [configInfo, setConfigInfo] = useState<{ region: string; summoner: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [urlState, setUrlState] = useState<URL | null>(null)

  const sseRef = useRef<EventSource | null>(null)
  const [connKey, setConnKey] = useState<string>("init")

  // SSE connection effect: reconnect on connKey changes or URL updates
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Build SSE endpoint
    const u = new URL(window.location.href)
    const defSum = (process.env.NEXT_PUBLIC_DEFAULT_PUUID || process.env.DEFAULT_PUUID || process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || '') as string
    const defReg = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1'
    const sum = u.searchParams.get('summoner') || defSum
    const regRaw = u.searchParams.get('region') || defReg
    const reg = normalizeRegion(regRaw)
    const ep = u.searchParams.get('mode') === 'liveclient'
      ? '/api/liveclient'
      : `/api/sse?region=${reg}${sum ? `&summoner=${encodeURIComponent(sum)}` : ''}`

    // Clean up previous stream
    if (sseRef.current) {
      try { sseRef.current.close() } catch {}
      sseRef.current = null
    }

    const stream = new EventSource(ep)
    sseRef.current = stream
    // Reset UI on (re)connect
    setConnected(false)
    setEvents([])
    setLastStatus(null)
    setLastMessage(null)
    setConfigInfo(null)

    stream.onopen = () => setConnected(true)
    stream.onerror = () => setConnected(false)

    stream.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'newGame') {
          // full reset by bumping key
          setConnKey(`${Date.now()}`)
          return
        }
        if (data.type === 'activeGame') {
          setLastStatus(data.payload.status ?? null)
          setLastMessage(data.payload.message ?? null)
          if (data.payload.data) setStats(null)
        } else if (data.type === 'config') {
          setConfigInfo(data.payload)
        } else if (data.type === 'stats') {
          if (data.payload.data) setStats(data.payload.data)
        }
        setEvents(prev => [data, ...prev].slice(0, 50))
      } catch {}
    }

    return () => {
      try { stream.close() } catch {}
    }
  }, [connKey])

  // Debug panel state
  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setUrlState(new URL(window.location.href))
      // Allow transparent background in OBS via URL flag
      const u = new URL(window.location.href)
      const bg = (u.searchParams.get('bg') || '').toLowerCase()
      const transparent = u.searchParams.get('transparent') === '1' || bg === 'transparent' || bg === 'none'
      if (transparent) {
        document.documentElement.classList.add('obs-transparent')
      }
    }
  }, [])

  const debugMode = (urlState?.searchParams.get('debug') || '') === '1'
  const defaultSummoner = process.env.NEXT_PUBLIC_DEFAULT_SUMMONER || ''
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'na1'

  const [summonerInput, setSummonerInput] = useState<string>('')
  const [regionInput, setRegionInput] = useState<string>(normalizeRegion(defaultRegion))
  const [modeInput, setModeInput] = useState<string>('')

  useEffect(() => {
    if (!urlState) return
    const s = urlState.searchParams.get('summoner') || defaultSummoner
    const r = normalizeRegion(urlState.searchParams.get('region') || defaultRegion)
    const m = urlState.searchParams.get('mode') || ''
    setSummonerInput(s)
    setRegionInput(r)
    setModeInput(m)
  }, [urlState])
  const applyDebugConnect = () => {
    // Update URL without reload
    const u = new URL(window.location.href)
  if (summonerInput) u.searchParams.set('summoner', summonerInput)
  else u.searchParams.delete('summoner')
    if (regionInput) u.searchParams.set('region', regionInput)
    else u.searchParams.delete('region')
    if (modeInput) u.searchParams.set('mode', modeInput)
    else u.searchParams.delete('mode')
    window.history.replaceState({}, '', u.toString())
    // Trigger reconnect
    setConnKey(`${Date.now()}`)
  }

  const latest = events.find((e) => e.type === 'activeGame')
  const activeGameData = latest?.payload?.data ?? null
  const activeGameId = activeGameData?.gameId ?? null
  const activeGameKey = useMemo(() => {
    if (!activeGameData) return null
    if (activeGameId) return String(activeGameId)
    const parts = (activeGameData.participants || [])
      .map((p: any) => `${p?.summonerName || ''}-${p?.championId || ''}`)
      .sort()
      .join('|')
    return `${activeGameData.mapId || 0}-${(activeGameData.gameMode || '').toUpperCase()}-${parts}`
  }, [activeGameData, activeGameId])


  return (
    <div className="w-screen h-screen relative">
      {/* Debug ribbon */}
      <div className="absolute top-2 right-2 text-[10px] text-zinc-400">
        {connected ? 'SSE: connected' : 'SSE: connecting...'}
        {lastStatus ? ` • status ${lastStatus}${lastMessage ? ` (${lastMessage})` : ''}` : ''}
        {configInfo ? ` • ${configInfo.region}:${configInfo.summoner}` : ''}
      </div>
      <div className="absolute top-4 left-4">
        <VoteWidget />
      </div>
      <AnimatePresence>
        {!connected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute top-4 left-4 text-xs text-zinc-300">
            Connecting...
          </motion.div>
        )}
      </AnimatePresence>

      {activeGameData ? (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            {/* Key by game identity to force a clean remount when a new game starts */}
            <Scoreboard key={activeGameKey || 'nogame'} data={activeGameData} gameKey={activeGameKey || undefined} />
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <SpellTracker key={`spells-${activeGameKey || 'nogame'}`} data={activeGameData} gameKey={activeGameKey || undefined} />
          </div>
        </>
      ) : (
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <StatsPanel data={stats} />
        </div>
      )}

  {/* Highlights removed */}
      <ObsControls />

      {/* Optional debug controls - only render after mount to avoid hydration mismatches */}
      {mounted && debugMode && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/70 border border-zinc-700 rounded p-3 text-xs space-y-2">
          <div className="font-semibold text-zinc-300">Debug Connect</div>
          <div className="flex gap-2 items-center">
            <label className="text-zinc-400">Summoner / Riot ID / PUUID</label>
            <input value={summonerInput} onChange={(e) => setSummonerInput(e.target.value)} className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded w-72 text-zinc-200" placeholder="e.g. GameName#BR1 or PUUID" />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-zinc-400">Region</label>
            <input value={regionInput} onChange={(e) => setRegionInput(normalizeRegion(e.target.value))} className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded w-32 text-zinc-200" placeholder="br1" />
            <label className="text-zinc-400">Mode</label>
            <select value={modeInput} onChange={(e) => setModeInput(e.target.value)} className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-zinc-200">
              <option value="">riot</option>
              <option value="liveclient">liveclient</option>
            </select>
            <button onClick={applyDebugConnect} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded">Connect</button>
          </div>
          <div className="text-zinc-400">Tip: paste your PUUID to bypass by-name lookup.</div>
        </div>
      )}
    </div>
  )
}
