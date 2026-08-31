import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ProviderAuthentification } from "@/providers/authentification.provider"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { PWARegister } from "@/components/pwa/PWARegister"
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
    icon: [{ url: "/nova-logo.webp", type: "image/webp" }],
    apple: [{ url: "/nova-logo.webp", type: "image/webp" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#102b55",
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
    <html lang="fr">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ProviderAuthentification>{children}</ProviderAuthentification>
        </Suspense>
        <PWARegister />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
