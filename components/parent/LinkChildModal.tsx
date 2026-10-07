"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, CheckCircle2, IdCard, Loader2, QrCode, RefreshCw, ScanLine, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BarcodeDetectorInstance { detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>> }
interface BarcodeDetectorConstructor { new(options?: { formats?: string[] }): BarcodeDetectorInstance; getSupportedFormats?: () => Promise<string[]> }
declare global { interface Window { BarcodeDetector?: BarcodeDetectorConstructor } }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { studentNumber?: string; birthDate: string }) => Promise<void>
}

function extractStudentNumber(value: string) {
  const raw = value.trim()
  if (!raw) return ""
  try {
    const parsed = JSON.parse(raw) as { student_number?: string; studentNumber?: string; matricule?: string }
    return String(parsed.student_number ?? parsed.studentNumber ?? parsed.matricule ?? "").trim()
  } catch {}
  const match = raw.match(/(?:student[_-]?number|matricule|identifiant)\s*[:=]\s*([A-Za-z0-9._/-]+)/i)
  return (match?.[1] ?? raw).trim()
}

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : ""
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "L'accès à la caméra est refusé. Autorisez la caméra pour ce site dans les paramètres du navigateur, puis appuyez sur « Relancer »."
  }
  if (name === "NotFoundError") return "Aucune caméra n'est disponible sur cet appareil."
  if (name === "NotReadableError") return "La caméra est déjà utilisée par une autre application ou n'est pas disponible."
  if (name === "SecurityError") return "Le navigateur bloque l'accès à la caméra. Ouvrez le portail en HTTPS et autorisez la caméra."
  if (name === "AbortError") return "L'ouverture de la caméra a été interrompue. Réessayez."
  return error instanceof Error && error.message ? error.message : "Impossible d'accéder à la caméra."
}

export function LinkChildModal({ open, onOpenChange, onSubmit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const startIdRef = useRef(0)
  const [mode, setMode] = useState<"scan" | "manual">("scan")
  const [studentNumber, setStudentNumber] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const stopScanner = () => {
    startIdRef.current += 1
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
    setStarting(false)
  }

  const startScanner = async () => {
    const startId = ++startIdRef.current
    stopScanner()
    const currentStartId = ++startIdRef.current
    setScannerError(null)
    setStarting(true)

    if (!window.isSecureContext) {
      setScannerError("La caméra nécessite une connexion sécurisée (HTTPS). Utilisez l'adresse officielle du portail.")
      setStarting(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Ce navigateur ne permet pas l'accès à la caméra. Utilisez Chrome, Edge ou Safari, ou saisissez l'identifiant manuellement.")
      setStarting(false)
      return
    }
    if (!window.BarcodeDetector) {
      setScannerError("Le scanner QR natif n'est pas disponible sur ce navigateur. Utilisez la saisie manuelle.")
      setMode("manual")
      setStarting(false)
      return
    }

    try {
      const supported = await window.BarcodeDetector.getSupportedFormats?.()
      if (currentStartId !== startIdRef.current) return
      if (supported && !supported.includes("qr_code")) {
        setScannerError("Ce navigateur ne prend pas en charge la lecture des QR codes. Utilisez la saisie manuelle.")
        setMode("manual")
        setStarting(false)
        return
      }

      const cameraPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      const timeoutPromise = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("La demande d'accès à la caméra n'a pas reçu de réponse. Vérifiez l'autorisation caméra du navigateur.")), 12000)
      )
      const stream = await Promise.race([cameraPromise, timeoutPromise])
      if (currentStartId !== startIdRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("Impossible d'initialiser l'aperçu caméra.")
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] })
      setScanning(true)
      setStarting(false)

      const scan = async () => {
        if (currentStartId !== startIdRef.current || !videoRef.current || !streamRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const value = codes.find((code) => code.rawValue)?.rawValue
          if (value) {
            const extracted = extractStudentNumber(value)
            if (extracted) {
              setStudentNumber(extracted)
              stopScanner()
              setMode("manual")
              return
            }
          }
        } catch (error) {
          console.warn("QR scan error", error)
        }
        if (currentStartId === startIdRef.current) {
          animationRef.current = requestAnimationFrame(() => { void scan() })
        }
      }
      void scan()
    } catch (error) {
      if (currentStartId !== startIdRef.current) return
      stopScanner()
      setScannerError(cameraErrorMessage(error))
    }
  }

  useEffect(() => {
    if (!open) {
      stopScanner()
      setSuccess(false)
      setScannerError(null)
      setStarting(false)
      return
    }
    // Ne pas demander silencieusement la caméra à chaque rendu : le bouton
    // d'activation permet au navigateur de présenter clairement sa demande.
    return stopScanner
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    if (!studentNumber.trim() || !birthDate) return
    setSubmitting(true)
    setScannerError(null)
    try {
      await onSubmit({ studentNumber: studentNumber.trim(), birthDate })
      setSuccess(true)
      setTimeout(() => onOpenChange(false), 900)
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : "Impossible de rattacher cet élève.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!submitting) onOpenChange(value) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-terre"><ScanLine className="h-5 w-5" /> Ajouter un enfant</DialogTitle>
          <DialogDescription>Scannez le QR de l'élève ou saisissez son identifiant. Une date de naissance est demandée pour confirmer le rattachement.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h3 className="text-lg font-semibold">Enfant ajouté</h3><p className="text-sm text-pierre">Les informations autorisées sont maintenant disponibles dans votre espace.</p></div>
        ) : (
          <div className="space-y-5">
            <Tabs value={mode} onValueChange={(value) => { stopScanner(); setMode(value as "scan" | "manual") }}>
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="scan"><QrCode className="mr-2 h-4 w-4" />Scanner</TabsTrigger><TabsTrigger value="manual"><IdCard className="mr-2 h-4 w-4" />Identifiant</TabsTrigger></TabsList>
              <TabsContent value="scan" className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-44 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" /></div>
                  {!scanning && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center text-sm text-white"><div><Camera className="mx-auto mb-2 h-8 w-8" />{starting ? "Ouverture de la caméra…" : scannerError ? "Caméra indisponible" : "Caméra prête à être activée"}<div className="mt-3"><Button size="sm" variant="secondary" onClick={() => void startScanner()} disabled={starting}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />{starting ? "Ouverture…" : "Activer / relancer la caméra"}</Button></div></div></div>}
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-pierre"><span>Placez le QR de l'élève dans le cadre.</span><Button size="sm" variant="outline" onClick={() => void startScanner()} disabled={starting}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Relancer</Button></div>
              </TabsContent>
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2"><Label htmlFor="student-number">Identifiant / matricule de l'élève</Label><Input id="student-number" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} placeholder="Ex. ELEVE-2026-0012" autoComplete="off" /></div>
              </TabsContent>
            </Tabs>

            {mode === "scan" && studentNumber && <div className="rounded-lg border bg-slate-50 p-3 text-sm"><span className="text-pierre">Identifiant détecté : </span><strong>{studentNumber}</strong></div>}

            <div className="space-y-2"><Label htmlFor="birth-date">Date de naissance de l'élève</Label><Input id="birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div>
            {scannerError && <Alert variant="destructive"><AlertDescription>{scannerError}</AlertDescription></Alert>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}><X className="mr-1.5 h-4 w-4" />Annuler</Button><Button onClick={() => void submit()} disabled={submitting || !studentNumber.trim() || !birthDate}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Rattacher l'enfant</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
