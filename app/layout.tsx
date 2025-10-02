import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LoL Stream Overlay',
  description: 'Interactive League of Legends overlay for OBS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black text-white">
      <body className="min-h-screen overflow-hidden select-none antialiased">{children}</body>
    </html>
  )
}
