import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'OmniPost AI - Social Media Management Dashboard',
  description: 'AI-powered social media management platform with scheduling, analytics, and content generation',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/logo-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/logo-64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        url: '/logo-128x128.png',
        sizes: '128x128',
        type: 'image/png',
      },
      {
        url: '/logo-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/logo-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/logo-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
