"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, CheckCircle2, Clock3, KeyRound, Play, QrCode, RefreshCw, Square } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { TeacherShell } from "@/components/enseignant/teacher-shell"
import { servicePointage } from "@/services/pointage.service"
import { enseignantPointageService, type TeacherLessonSlot, type TeacherLessonPointage } from "@/services/enseignant-pointage.service"
import { toast } from "sonner"

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const localTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function EnseignantPointagePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find(item => item.id === establishmentId)

  const [course, setCourse] = useState<any>(null)
  const [slot, setSlot] = useState<TeacherLessonSlot | null>(null)
  const [pointages, setPointages] = useState<TeacherLessonPointage[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState("")
  const [scanAction, setScanAction] = useState<"start" | "finish">("start")
  const [personalCode, setPersonalCode] = useState("")
  const [myPointageCode, setMyPointageCode] = useState<string | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!establishmentId) return
    setLoading(true)
    try {
      const [current, schedule, records] = await Promise.all([
        servicePointage.obtenirCoursActifEnseignant(establishmentId),
        enseignantPointageService.getTeacherSchedule(establishmentId),
        enseignantPointageService.getContext(establishmentId),
      ])
      setCourse(current)
      setSlot(schedule.find(item => item.slot_id === current?.timetable_slot_id) ?? null)
      const teacherId = records?.[0]?.teacher_id
      if (teacherId) {
        setPointages(await enseignantPointageService.getPointages(establishmentId, teacherId, localDate(), localDate()))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le pointage.")
    } finally {
      setLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) void load()
  }, [estEnCoursDeChargement, utilisateur, establishment, router, load])

  const stopScanner = useCallback(() => {
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current)
    scanTimerRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setScannerOpen(false)
  }, [])

  useEffect(() => () => stopScanner(), [stopScanner])

  const submitToken = async (token: string) => {
    if (!token.trim()) return
    setWorking(true)
    try {
      const result = scanAction === "start"
        ? await servicePointage.commencerCoursParQr(token.trim())
        : await servicePointage.terminerCoursParQr(token.trim())

      toast.success(scanAction === "start" ? "Début du cours validé." : "Fin du cours validée.", {
        description: result.scheduled_start && result.scheduled_end
          ? `${result.scheduled_start.slice(0,5)} → ${result.scheduled_end.slice(0,5)}`
          : undefined,
      })
      setManualToken("")
      stopScanner()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR invalide ou expiré.")
    } finally {
      setWorking(false)
    }
  }

  const generateMyPointageCode = async () => {
    setCodeLoading(true)
    try {
      const nextCode = await servicePointage.genererMonCode(establishmentId)
      setMyPointageCode(nextCode)
      toast.success("Votre code de pointage est prêt.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer votre code de pointage.")
    } finally {
      setCodeLoading(false)
    }
  }

  const submitPersonalCode = async () => {
    if (!personalCode.trim() || !course) return
    setWorking(true)
    try {
      const action = course.status === "in_progress" ? "course_end" : "course_start"
      const result = await servicePointage.enregistrerParCode(establishmentId, action, personalCode)
      toast.success(action === "course_start" ? "Début du cours validé par code." : "Fin du cours validée par code.", {
        description: result.scheduled_start && result.scheduled_end
          ? `${result.scheduled_start.slice(0,5)} → ${result.scheduled_end.slice(0,5)}`
          : undefined,
      })
      setPersonalCode("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Code de pointage invalide ou non autorisé.")
    } finally {
      setWorking(false)
    }
  }

  const openScanner = async (action: "start" | "finish") => {
    setScanAction(action)
    setScannerError(null)
    setScannerOpen(true)

    if (!("BarcodeDetector" in globalThis)) {
      setScannerError("La lecture QR native n'est pas disponible dans ce navigateur. Utilisez le jeton temporaire comme secours.")
      return
    }

    try {
      const supported = await (window as any).BarcodeDetector.getSupportedFormats()
      if (!supported.includes("qr_code")) throw new Error("Ce navigateur ne prend pas en charge les QR codes.")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
      scanTimerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || working) return
        try {
          const codes = await detector.detect(videoRef.current)
          const token = codes?.[0]?.rawValue
          if (token) await submitToken(token)
        } catch {
          // Continuer à scanner lorsqu'aucun QR n'est détecté.
        }
      }, 500)
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : "Impossible d'ouvrir la caméra.")
    }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><p className="text-sm text-[#6d7280]">Chargement…</p></main>
  }

  return (
    <TeacherShell establishmentId={establishmentId} establishmentName={establishment.name} active="planning">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center gap-3 border-b pb-5">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pointage enseignant</p>
            <h1 className="text-2xl font-semibold">{establishment.name}</h1>
          </div>
          <div className="ml-auto flex flex-wrap gap-2"><Button onClick={() => void openScanner(course?.status === "in_progress" ? "finish" : "start")} disabled={working}><QrCode className="mr-2 h-4 w-4" />Scanner le QR de l’ordinateur</Button><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button></div>
        </header>

        <section className="rounded-md border bg-white p-5">
          {loading ? <p className="text-sm text-muted-foreground">Recherche du cours actuel…</p> : course && slot ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Cours identifié automatiquement</p>
              <h2 className="mt-2 text-2xl font-semibold">{slot.subject_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{slot.class_name}{slot.room ? ` · Salle ${slot.room}` : ""} · {slot.starts_at} – {slot.ends_at}</p>
              {course.status === "in_progress" && course.started_time && (
                <p className="mt-3 text-sm text-emerald-700">Cours commencé à {String(course.started_time).slice(0, 5)}. Vous pouvez le terminer depuis votre téléphone.</p>
              )}
              {Number(course.late_minutes ?? 0) > 0 && <p className="mt-3 text-sm text-amber-700">Pointage après le début prévu : {course.late_minutes} min.</p>}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void openScanner(course.status === "in_progress" ? "finish" : "start")} disabled={working}>
                  <QrCode className="mr-2 h-4 w-4" /> Scanner le QR de l'ordinateur
                </Button>
              </div>
              <div className="mt-5 border-t pt-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#3152c8]" />
                  <p className="font-medium">Pointage avec mon code personnel</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Utilisez votre code de pointage si vous ne souhaitez pas scanner le QR affiché sur l'ordinateur de l'école.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={personalCode}
                    onChange={event => setPersonalCode(event.target.value.toUpperCase())}
                    onKeyDown={event => { if (event.key === "Enter") void submitPersonalCode() }}
                    placeholder="Ex. A1B2C3D4"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={8}
                    className="h-11 font-mono tracking-[0.2em]"
                  />
                  <Button variant="outline" onClick={() => void submitPersonalCode()} disabled={working || !personalCode.trim()}>
                    Valider le code
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                  <span className="text-sm text-muted-foreground">Mon code personnel :</span>
                  {myPointageCode ? (
                    <span className="rounded-md border bg-muted/30 px-3 py-2 font-mono font-semibold tracking-[0.2em]">{myPointageCode}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">non affiché</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => void generateMyPointageCode()} disabled={codeLoading}>
                    <KeyRound className="mr-2 h-4 w-4" />{codeLoading ? "Génération…" : myPointageCode ? "Renouveler" : "Afficher mon code"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Aucun cours correspondant à l'heure actuelle</p>
              <p className="mt-1 text-sm text-muted-foreground">Vous ne choisissez jamais le cours : l'emploi du temps détermine automatiquement le créneau.</p>
            </div>
          )}
        </section>

        {scannerOpen && (
          <section className="rounded-md border border-[#e1e3eb] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-semibold"><QrCode className="mr-2 inline h-5 w-5" />Scanner le QR de l'ordinateur</h2><p className="text-sm text-muted-foreground">Action : {scanAction === "start" ? "commencer le cours" : "terminer le cours"}.</p></div>
              <Button variant="ghost" onClick={stopScanner}>Fermer</Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /></div>
            {scannerError && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{scannerError}</div>}
            <div className="mt-4 border-t pt-4">
              <label className="text-sm font-medium">Jeton temporaire de secours</label>
              <div className="mt-2 flex gap-2"><Input value={manualToken} onChange={e => setManualToken(e.target.value)} placeholder="Coller le jeton du QR" /><Button onClick={() => void submitToken(manualToken)} disabled={working || !manualToken.trim()}>Valider</Button></div>
            </div>
          </section>
        )}

        <section className="rounded-md border bg-background">
          <div className="border-b px-4 py-3"><h2 className="font-semibold">Pointages du jour</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-[#f4f5f8]"><tr><th className="px-4 py-3 text-left">Cours</th><th className="px-4 py-3 text-left">Début</th><th className="px-4 py-3 text-left">Fin</th><th className="px-4 py-3 text-left">Heures retenues</th><th className="px-4 py-3 text-left">État</th></tr></thead>
              <tbody className="divide-y">
                {pointages.map(record => {
                  const item = pointages.length ? record : null
                  return <tr key={record.id}><td className="px-4 py-3">{item?.timetable_slot_id ?? "Cours"}</td><td className="px-4 py-3">{record.started_time?.slice(0,5) ?? "—"}</td><td className="px-4 py-3">{record.ended_time?.slice(0,5) ?? "—"}</td><td className="px-4 py-3">{record.counted_hours ?? 0} h</td><td className="px-4 py-3">{record.status === "completed" ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" />Terminé</span> : "En cours"}</td></tr>
                })}
                {!pointages.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun cours pointé aujourd'hui.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TeacherShell>
  )
}
