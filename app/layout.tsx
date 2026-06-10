import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { VizionChat } from '@/components/chat/VizionChat'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'VIZION OS v2',
  description: 'Creative Intelligence Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VIZION OS',
  },
  icons: {
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    icon: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#080810',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080810] text-white antialiased">
        <Providers>
          <div className="flex min-h-screen relative">
            <Sidebar />
            <main className="flex-1 md:ml-64 pb-24 md:pb-0 pt-safe relative z-10 min-h-screen">
              {children}
            </main>
          </div>
          <MobileNav />
          <VizionChat />
        </Providers>
      </body>
    </html>
  )
}
