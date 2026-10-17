"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, CheckCircle2, QrCode, RefreshCw } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  const [scanAction, setScanAction] = useState<"start" | "finish">("start")

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
      stopScanner()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR invalide ou expiré.")
    } finally {
      setWorking(false)
    }
  }

  const openScanner = async (action: "start" | "finish") => {
    setScanAction(action)
    setScannerError(null)
    setScannerOpen(true)

    if (!("BarcodeDetector" in globalThis)) {
      setScannerError("La lecture QR n’est pas disponible dans ce navigateur. Ouvrez le portail enseignant avec Chrome récent sur Android et autorisez l’accès à la caméra.")
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
      <div className="mx-auto w-full max-w-screen-xl space-y-6">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#e2e4eb] pb-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <p className="text-sm text-[#6d7280]">Pointage enseignant</p>
            <h1 className="text-xl font-semibold text-[#172033] sm:text-2xl">{establishment.name}</h1>
          </div>
          <div className="ml-auto flex flex-wrap gap-2"><Button onClick={() => void openScanner(course?.status === "in_progress" ? "finish" : "start")} disabled={working} className="bg-[#0b2b83] text-white hover:bg-[#09236b] hover:text-white"><QrCode className="mr-2 h-4 w-4" />{course?.status === "in_progress" ? "Terminer le cours" : "Démarrer le cours"}</Button><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button></div>
        </header>

        <section className="border-b border-[#e2e4eb] pb-5">
          {loading ? <p className="text-sm text-muted-foreground">Recherche du cours actuel…</p> : course && slot ? (
            <>
              <p className="text-sm font-medium text-[#0b2b83]">Cours actuel</p>
              <h2 className="mt-1 text-xl font-semibold text-[#172033]">{slot.subject_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{slot.class_name}{slot.room ? ` · Salle ${slot.room}` : ""} · {slot.starts_at} – {slot.ends_at}</p>
              {course.status === "in_progress" && course.started_time && (
                <p className="mt-3 text-sm text-emerald-700">Cours commencé à {String(course.started_time).slice(0, 5)}. Vous pouvez le terminer depuis votre téléphone.</p>
              )}
              {Number(course.late_minutes ?? 0) > 0 && <p className="mt-3 text-sm text-amber-700">Pointage après le début prévu : {course.late_minutes} min.</p>}

              <p className="mt-3 text-sm text-[#6d7280]">Scannez le QR affiché sur l’ordinateur de l’établissement pour enregistrer le début ou la fin du cours.</p>
            </>
          ) : (
            <div className="py-3">
              <p className="font-medium text-[#172033]">Aucun cours prévu à cette heure</p>
              <p className="mt-1 text-sm text-[#6d7280]">Le cours est déterminé automatiquement à partir de votre emploi du temps.</p>
            </div>
          )}
        </section>

        {scannerOpen && (
          <section className="border-b border-[#e2e4eb] py-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-semibold"><QrCode className="mr-2 inline h-5 w-5" />Scanner le QR de l'ordinateur</h2><p className="text-sm text-muted-foreground">Action automatique : {scanAction === "start" ? "démarrer le cours prévu maintenant" : "terminer le cours en cours"}.</p></div>
              <Button variant="ghost" onClick={stopScanner}>Fermer</Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /></div>
            {scannerError && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">{scannerError}</div>}
            <div className="mt-4 border-t pt-4 text-sm text-muted-foreground">
              Cadrez le QR affiché sur l’ordinateur. Dès qu’il est reconnu, le système vérifie votre emploi du temps et enregistre automatiquement le début ou la fin du cours.
            </div>
          </section>
        )}

        <section className="pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e4eb] py-3"><h2 className="font-semibold text-[#172033]">Pointages du jour</h2><span className="text-sm text-[#6d7280]">{pointages.length} pointage{pointages.length > 1 ? "s" : ""}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="border-b bg-[#f7f8fb] text-[#6d7280]"><tr><th className="px-4 py-3 text-left">Cours</th><th className="px-4 py-3 text-left">Début</th><th className="px-4 py-3 text-left">Fin</th><th className="px-4 py-3 text-left">Heures retenues</th><th className="px-4 py-3 text-left">État</th></tr></thead>
              <tbody className="divide-y divide-[#e2e4eb] text-[#172033]">
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
