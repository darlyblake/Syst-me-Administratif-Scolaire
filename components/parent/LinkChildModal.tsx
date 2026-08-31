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

export function LinkChildModal({ open, onOpenChange, onSubmit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const [mode, setMode] = useState<"scan" | "manual">("scan")
  const [studentNumber, setStudentNumber] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const stopScanner = () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }

  const startScanner = async () => {
    stopScanner()
    setScannerError(null)
    if (!window.BarcodeDetector) {
      setScannerError("Le scanner QR n'est pas disponible sur ce navigateur. Utilisez la saisie manuelle.")
      setMode("manual")
      return
    }
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats?.()
      if (supported && !supported.includes("qr_code")) throw new Error("Les QR codes ne sont pas pris en charge par ce navigateur.")
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] })
      setScanning(true)

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return
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
        animationRef.current = requestAnimationFrame(() => { void scan() })
      }
      void scan()
    } catch (error) {
      stopScanner()
      setScannerError(error instanceof Error ? error.message : "Impossible d'accéder à la caméra.")
    }
  }

  useEffect(() => {
    if (!open) {
      stopScanner()
      setSuccess(false)
      return
    }
    if (mode === "scan") void startScanner()
    return stopScanner
    // mode is intentionally included: switching to manual must stop the camera.
  }, [open, mode])

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
            <Tabs value={mode} onValueChange={(value) => setMode(value as "scan" | "manual")}>
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="scan"><QrCode className="mr-2 h-4 w-4" />Scanner</TabsTrigger><TabsTrigger value="manual"><IdCard className="mr-2 h-4 w-4" />Identifiant</TabsTrigger></TabsList>
              <TabsContent value="scan" className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-44 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" /></div>
                  {!scanning && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-center text-sm text-white"><div><Camera className="mx-auto mb-2 h-8 w-8" />Préparation de la caméra…</div></div>}
                </div>
                <div className="flex items-center justify-between text-xs text-pierre"><span>Placez le QR de l'élève dans le cadre.</span><Button size="sm" variant="outline" onClick={() => void startScanner()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Relancer</Button></div>
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
