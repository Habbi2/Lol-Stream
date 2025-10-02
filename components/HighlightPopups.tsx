"use client"

import { AnimatePresence, motion } from 'framer-motion'

export default function HighlightPopups({ events }: { events: any[] }) {
  const highlights = events.slice(0, 3)
  return (
    <div className="absolute top-24 right-6 flex flex-col gap-2">
      <AnimatePresence>
        {highlights.map((e, i) => (
          <motion.div
            key={i}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className="glass px-4 py-2 rounded-md border-l-2 border-primary shadow-[var(--overlay-glow)]">
            <div className="text-sm font-semibold text-white">{e.title || 'Highlight'}</div>
            <div className="text-xs text-zinc-300">{e.message || 'Nice play!'}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
