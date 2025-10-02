"use client"

import { useEffect, useMemo, useState } from 'react'
import OBSWebSocket from 'obs-websocket-js'

export default function ObsControls() {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParams(new URLSearchParams(window.location.search))
    }
  }, [])
  const enabled = (params?.get('obs') || '0') === '1'
  const address = params?.get('obsHost') || 'ws://127.0.0.1:4455'
  const password = params?.get('obsPass') || ''
  const [status, setStatus] = useState<string>('idle')

  useEffect(() => {
    if (!enabled) return
    const obs = new OBSWebSocket()
    obs.connect(address, password).then(() => setStatus('connected')).catch(() => setStatus('error'))
    return () => { try { obs.disconnect() } catch {} }
  }, [enabled, address, password])

  if (!enabled) return null
  return (
    <div className="absolute bottom-6 right-6 glass px-3 py-2 rounded-lg">
      <div className="text-xs text-zinc-300">OBS: {status}</div>
      <div className="flex gap-2 mt-2">
        <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/15" onClick={async () => {
          try {
            const obs = new OBSWebSocket()
            await obs.connect(address, password)
            await obs.call('TriggerHotkeyByName', { hotkeyName: 'OverlayToggle' })
            await obs.disconnect()
          } catch {}
        }}>Toggle Overlay</button>
      </div>
    </div>
  )
}
