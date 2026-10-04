"use client"

import { useCallback, useEffect, useState } from "react"
import { Monitor, QrCode, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserContext } from "@/hooks/useUserContext"
import { servicePointage } from "@/services/pointage.service"

export default function LecteurPointagePage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [qrSvg, setQrSvg] = useState("")
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!establishmentId) return
    setBusy(true)
    setError(null)
    try {
      const session = await servicePointage.creerSessionQr(establishmentId, "Ordinateur central", 60)
      const { qrcode } = await import("@/lib/qrcode-generator.mjs")
      const qr = qrcode(0, "M")
      qr.addData(session.token)
      qr.make()
      setQrSvg(qr.createSvgTag({ cellSize: 8, margin: 5, scalable: true }))
      setExpiresAt(session.expires_at)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de générer le QR de pointage.")
    } finally {
      setBusy(false)
    }
  }, [establishmentId])

  useEffect(() => {
    if (!establishmentId) return
    void generate()
    const timer = window.setInterval(() => void generate(), 50000)
    return () => window.clearInterval(timer)
  }, [establishmentId, generate])

  if (estEnCoursDeChargement) {
    return <main className="min-h-screen flex items-center justify-center"><p>Chargement…</p></main>
  }

  if (!establishmentId) {
    return <main className="min-h-screen flex items-center justify-center p-6"><p className="text-sm text-muted-foreground">Aucun établissement n'est associé à votre compte.</p></main>
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md border bg-white p-3"><Monitor className="h-6 w-6 text-[#0b2b83]" /></div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Pointage central</p>
            <h1 className="text-2xl font-semibold">Scanner depuis le téléphone</h1>
            <p className="text-sm text-muted-foreground">{primaryEstablishment?.name ?? "Établissement"}</p>
          </div>
        </div>

        <section className="w-full max-w-xl rounded-md border bg-white p-8 shadow-sm">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
            <QrCode className="h-4 w-4" /> QR de pointage actif
          </div>
          {qrSvg ? (
            <div className="mx-auto mt-6 aspect-square w-full max-w-[430px] bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          ) : (
            <div className="flex aspect-square w-full max-w-[430px] mx-auto mt-6 items-center justify-center border bg-muted/20 text-sm text-muted-foreground">
              {error ?? "Génération du QR…"}
            </div>
          )}
          <p className="mt-5 text-base font-medium">L'enseignant ouvre « Pointage » dans son compte puis appuie sur « Scanner le QR de l'ordinateur ».</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Le QR est temporaire et se renouvelle automatiquement toutes les 50 secondes. Il ne contient pas le code personnel de l'enseignant.
          </p>
          <p className="mt-4 text-sm font-medium">
            Expire à {expiresAt ? new Date(expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          </p>
          <div className="mt-5">
            <Button variant="outline" onClick={() => void generate()} disabled={busy}>
              <RefreshCw className="mr-2 h-4 w-4" /> {busy ? "Actualisation…" : "Nouveau QR"}
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </section>
      </div>
    </main>
  )
}
