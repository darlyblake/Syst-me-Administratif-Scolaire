import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ProviderAuthentification } from "@/providers/authentification.provider"
import { RealtimeSyncProvider } from "@/providers/realtime-sync.provider"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { PWARegister } from "@/components/pwa/PWARegister"
import { ChunkLoadRecovery } from "@/components/system/ChunkLoadRecovery"
import "./globals.css"
import "@/styles/login-book.css"

export const metadata: Metadata = {
  title: {
    default: "NOVA — Système de Gestion Scolaire",
    template: "%s | NOVA",
  },
  description: "Plateforme professionnelle de gestion scolaire pour les établissements.",
  applicationName: "NOVA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NOVA",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/nova-icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/nova-icon-192.svg", type: "image/svg+xml" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#1e40af",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" translate="no">
      <body translate="no" className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ProviderAuthentification><RealtimeSyncProvider>{children}</RealtimeSyncProvider></ProviderAuthentification>
        </Suspense>
        <ChunkLoadRecovery />
        <PWARegister />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
