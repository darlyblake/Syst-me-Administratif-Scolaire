"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileClock,
  History,
  LogIn,
  LogOut,
  Play,
  QrCode,
  RefreshCw,
  Settings2,
  Square,
  Users,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useUserContext } from "@/hooks/useUserContext"
import { getAcademicYears } from "@/lib/supabase/services/academic-year.service"
import { servicePointage, type PointageAction, type PointageAlert, type PointageSettings } from "@/services/pointage.service"
import { toast } from "sonner"

type Mode = "arrival" | "departure" | "course_start" | "course_end"
type Section = "pointage" | "historique" | "fiches" | "absents" | "retards" | "cours" | "alertes" | "parametres"

type AttendanceRow = {
  id: string
  staff_id: string
  staff_type: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string
  notes: string | null
}

type LessonRow = {
  id: string
  teacher_id: string
  timetable_slot_id: string
  attendance_date: string
  started_time: string | null
  ended_time: string | null
  status: string
  scheduled_hours: number | null
  counted_hours: number | null
  credited_minutes: number | null
  late_minutes: number
  start_method: string | null
  end_method: string | null
  actual_duration_minutes: number | null
}

type HistoryRow = {
  id: string
  staff_type: "teacher" | "staff"
  staff_id: string
  event_type: string
  event_time: string
  method: string
  attendance_id: string | null
  metadata: Record<string, unknown>
}

type PersonRow = {
  id: string
  staff_type: "teacher" | "staff"
  first_name: string
  last_name: string
  employee_number?: string | null
  position?: string | null
}

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const ACTIONS: { id: Mode; label: string; description: string; icon: typeof LogIn }[] = [
  { id: "arrival", label: "Arrivée à l'établissement", description: "Enregistrer le début de journée.", icon: LogIn },
  { id: "departure", label: "Départ de l'établissement", description: "Enregistrer la fin de journée.", icon: LogOut },
  { id: "course_start", label: "Début de cours", description: "Le cours est déterminé automatiquement par l'emploi du temps.", icon: Play },
  { id: "course_end", label: "Fin de cours", description: "Clôturer le cours actuellement en cours.", icon: Square },
]

const SECTIONS: { id: Section; label: string; icon: typeof History }[] = [
  { id: "pointage", label: "Effectuer un pointage", icon: FileClock },
  { id: "historique", label: "Historique", icon: History },
  { id: "fiches", label: "Fiches de pointage", icon: FileClock },
  { id: "absents", label: "Absents", icon: Users },
  { id: "retards", label: "Retards", icon: AlertTriangle },
  { id: "cours", label: "Cours non pointés", icon: Play },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
  { id: "parametres", label: "Paramètres", icon: Settings2 },
]

const eventLabel = (event: string) => ({
  arrival: "Arrivée",
  departure: "Départ",
  course_start: "Début de cours",
  course_end: "Fin de cours",
}[event] ?? event)

const methodLabel = (method: string) => ({
  code: "Code",
  qr: "QR",
  admin: "Administration",
  automatic: "Automatique",
}[method] ?? method)

export default function PersonnelPointagePage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const today = localDate()

  const [section, setSection] = useState<Section>("pointage")
  const [mode, setMode] = useState<Mode>("arrival")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<PointageAlert[]>([])
  const [staffRows, setStaffRows] = useState<AttendanceRow[]>([])
  const [lessonRows, setLessonRows] = useState<LessonRow[]>([])
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([])
  const [people, setPeople] = useState<PersonRow[]>([])
  const [settings, setSettings] = useState<PointageSettings | null>(null)
  const [academicYearId, setAcademicYearId] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState("")
  const [qrBusy, setQrBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const personMap = useMemo(() => new Map(
    people.map(person => [`${person.staff_type}:${person.id}`, person])
  ), [people])

  const personLabel = useCallback((staffType: string, staffId: string) => {
    const person = personMap.get(`${staffType}:${staffId}`)
    if (!person) return staffId
    return [person.first_name, person.last_name].filter(Boolean).join(" ") || staffId
  }, [personMap])

  const loadMonitoring = useCallback(async () => {
    if (!establishmentId) return
    setRefreshing(true)
    try {
      await servicePointage.rafraichirAlertes(establishmentId, today)
      const [nextAlerts, nextStaff, nextLessons, nextHistory, nextPeople, years] = await Promise.all([
        servicePointage.obtenirAlertes(establishmentId, today),
        servicePointage.obtenirPointagesPersonnel(establishmentId, today),
        servicePointage.obtenirCoursPointes(establishmentId, today),
        servicePointage.obtenirHistorique(establishmentId, today),
        servicePointage.obtenirPersonnelActif(establishmentId),
        getAcademicYears(establishmentId),
      ])

      setAlerts(nextAlerts)
      setStaffRows(nextStaff as AttendanceRow[])
      setLessonRows(nextLessons as LessonRow[])
      setHistoryRows(nextHistory as HistoryRow[])
      setPeople(nextPeople as PersonRow[])

      const activeYear = years.find((year: any) => year.status === "active")
      if (activeYear) {
        setAcademicYearId(activeYear.id)
        setSettings(await servicePointage.obtenirParametres(establishmentId, activeYear.id))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le pointage.")
    } finally {
      setRefreshing(false)
    }
  }, [establishmentId, today])

  useEffect(() => {
    void loadMonitoring()
  }, [loadMonitoring])

  const createQrSession = async () => {
    if (!establishmentId) return
    setQrBusy(true)
    try {
      const session = await servicePointage.creerSessionQr(establishmentId, "Ordinateur central", 60)
      const { qrcode } = await import("@/lib/qrcode-generator.mjs")
      const qr = qrcode(0, "M")
      qr.addData(session.token)
      qr.make()
      setQrToken(session.token)
      setQrExpiresAt(session.expires_at)
      setQrSvg(qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer le QR de pointage.")
    } finally {
      setQrBusy(false)
    }
  }

  useEffect(() => {
    if (!qrToken) return
    const timer = window.setInterval(() => void createQrSession(), 50000)
    return () => window.clearInterval(timer)
  }, [qrToken, establishmentId])

  const submitPointage = async () => {
    if (!establishmentId || !code.trim()) {
      setMessage("Saisissez le code personnel.")
      return
    }

    setBusy(true)
    setMessage(null)
    try {
      const result = await servicePointage.enregistrerParCode(establishmentId, mode as PointageAction, code)
      const label =
        mode === "arrival" ? "Arrivée enregistrée" :
        mode === "departure" ? "Départ enregistré" :
        mode === "course_start" ? "Début de cours validé" :
        "Fin de cours validée"

      const detail = result.scheduled_start && result.scheduled_end
        ? `${result.scheduled_start.slice(0, 5)} → ${result.scheduled_end.slice(0, 5)} · ${result.late_minutes ?? 0} min de retard · ${result.credited_hours ?? 0} h retenue(s)`
        : "L'événement a été enregistré."

      setMessage(`${label}. ${detail}`)
      setCode("")
      await loadMonitoring()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pointage refusé.")
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async () => {
    if (!establishmentId || !academicYearId) return
    setSavingSettings(true)
    try {
      await servicePointage.enregistrerParametres({
        establishmentId,
        academicYearId,
        earlyArrivalToleranceMinutes: settings?.early_arrival_tolerance_minutes ?? 15,
        fullCreditThresholdMinutes: settings?.full_credit_threshold_minutes ?? 40,
        fullCreditHours: settings?.full_credit_hours ?? 2,
        partialCreditHours: settings?.partial_credit_hours ?? 1,
        allowTeacherClose: settings?.allow_teacher_close ?? true,
        requireAdminClosureAfterScheduleEnd: settings?.require_admin_closure_after_schedule_end ?? true,
        alertMissingLessonAfterMinutes: settings?.alert_missing_lesson_after_minutes ?? 10,
        alertsEnabled: settings?.alerts_enabled ?? true,
        codeEnabled: settings?.code_enabled ?? true,
        qrEnabled: settings?.qr_enabled ?? true,
      })
      toast.success("Paramètres de pointage enregistrés.")
      await loadMonitoring()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer les paramètres.")
    } finally {
      setSavingSettings(false)
    }
  }

  const updateSetting = <K extends keyof PointageSettings>(key: K, value: PointageSettings[K]) => {
    setSettings(current => current ? { ...current, [key]: value } : current)
  }

  const absents = useMemo(() => {
    const presentKeys = new Set(staffRows.map(row => `${row.staff_type}:${row.staff_id}`))
    return people.filter(person => !presentKeys.has(`${person.staff_type}:${person.id}`))
  }, [people, staffRows])

  const lateAlerts = alerts.filter(alert => alert.alert_type === "late")
  const missingLessons = alerts.filter(alert => alert.alert_type === "missing_lesson")
  const lessonsToClose = alerts.filter(alert => alert.alert_type === "lesson_to_close")

  const counts = {
    present: staffRows.filter(row => row.status === "present" || row.status === "late").length,
    late: lateAlerts.length,
    missingCourses: missingLessons.length,
    toClose: lessonsToClose.length,
  }

  if (estEnCoursDeChargement) {
    return <main className="min-h-screen p-6 text-sm text-muted-foreground">Chargement du pointage…</main>
  }

  return (
    <main className="min-h-screen bg-muted/20 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/ecole/personnel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Personnel
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pointage</h1>
            <p className="text-sm text-muted-foreground">Pointage centralisé du personnel et suivi des cours enseignants.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border bg-background px-3 py-2"><Users className="mr-1 inline h-4 w-4" />{counts.present} présent(s)</span>
            <span className="rounded-md border bg-background px-3 py-2"><AlertTriangle className="mr-1 inline h-4 w-4" />{alerts.length} alerte(s)</span>
            <Button variant="outline" size="sm" onClick={() => void loadMonitoring()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-1">
          {SECTIONS.map(item => {
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => setSection(item.id)} className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${section === item.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{item.label}
              </button>
            )
          })}
        </nav>

        {section === "pointage" && (
          <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ACTIONS.map(action => {
                const Icon = action.icon
                const selected = mode === action.id
                return (
                  <button key={action.id} onClick={() => { setMode(action.id); setMessage(null) }} className={`rounded-lg border bg-background p-4 text-left transition ${selected ? "border-emerald-600 ring-1 ring-emerald-600" : "hover:border-gray-300"}`}>
                    <Icon className="mb-3 h-5 w-5" />
                    <div className="font-medium">{action.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{action.description}</div>
                  </button>
                )
              })}
            </div>

            <div className="mx-auto max-w-xl rounded-xl border bg-background p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">{ACTIONS.find(action => action.id === mode)?.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Le code identifie automatiquement la personne. Pour un enseignant, le cours est recherché automatiquement dans l'emploi du temps.</p>
              </div>

              <Label htmlFor="pointage-code">Code personnel</Label>
              <Input
                id="pointage-code"
                inputMode="text"
                autoComplete="off"
                value={code}
                onChange={event => setCode(event.target.value.toUpperCase())}
                onKeyDown={event => { if (event.key === "Enter") void submitPointage() }}
                placeholder="Ex. A1B2C3D4"
                className="mt-2 h-12 text-center text-lg tracking-[0.25em]"
                maxLength={8}
              />
              <Button onClick={() => void submitPointage()} disabled={busy || !code.trim()} className="mt-4 h-11 w-full">
                {busy ? "Vérification…" : "Valider le pointage"}
              </Button>

              {message && <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">{message}</div>}

              <div className="mt-5 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Pointage par QR</p>
                    <p className="mt-1 text-xs text-muted-foreground">Le QR est temporaire et se renouvelle automatiquement. L'enseignant le scanne depuis son téléphone.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void createQrSession()} disabled={qrBusy}>
                    <QrCode className="mr-2 h-4 w-4" />{qrBusy ? "Génération…" : "Afficher le QR"}
                  </Button>
                </div>

                {qrSvg && (
                  <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border bg-white p-4">
                    <div className="h-64 w-64" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    <p className="text-xs text-muted-foreground">Valide jusqu'à {qrExpiresAt ? new Date(qrExpiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {section === "historique" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr><th className="px-4 py-3 text-left">Heure</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Événement</th><th className="px-4 py-3 text-left">Méthode</th><th className="px-4 py-3 text-left">Cours</th></tr>
              </thead>
              <tbody className="divide-y">
                {historyRows.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{new Date(row.event_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3">{personLabel(row.staff_type, row.staff_id)}</td>
                    <td className="px-4 py-3">{eventLabel(row.event_type)}</td>
                    <td className="px-4 py-3">{methodLabel(row.method)}</td>
                    <td className="px-4 py-3">{row.attendance_id ? "Session de cours" : "—"}</td>
                  </tr>
                ))}
                {!historyRows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun événement enregistré aujourd'hui.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "fiches" && (
          <section className="space-y-4">
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Arrivée</th><th className="px-4 py-3 text-left">Départ</th><th className="px-4 py-3 text-left">Cours</th><th className="px-4 py-3 text-left">Heures réelles</th><th className="px-4 py-3 text-left">Heures retenues</th></tr>
                </thead>
                <tbody className="divide-y">
                  {people.map(person => {
                    const attendance = staffRows.find(row => row.staff_type === person.staff_type && row.staff_id === person.id)
                    const lessons = lessonRows.filter(row => row.teacher_id === person.id)
                    const actualMinutes = lessons.reduce((sum, row) => sum + (row.actual_duration_minutes ?? 0), 0)
                    const credited = lessons.reduce((sum, row) => sum + Number(row.counted_hours ?? 0), 0)
                    return (
                      <tr key={`${person.staff_type}:${person.id}`}>
                        <td className="px-4 py-3">{personLabel(person.staff_type, person.id)}</td>
                        <td className="px-4 py-3">{person.position ?? "—"}</td>
                        <td className="px-4 py-3">{attendance?.check_in ? new Date(attendance.check_in).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="px-4 py-3">{attendance?.check_out ? new Date(attendance.check_out).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="px-4 py-3">{lessons.length}</td>
                        <td className="px-4 py-3">{(actualMinutes / 60).toFixed(2)} h</td>
                        <td className="px-4 py-3">{credited.toFixed(2)} h</td>
                      </tr>
                    )
                  })}
                  {!people.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucun personnel actif.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "absents" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Identifiant</th><th className="px-4 py-3 text-left">État</th></tr>
              </thead>
              <tbody className="divide-y">
                {absents.map(person => (
                  <tr key={`${person.staff_type}:${person.id}`}>
                    <td className="px-4 py-3">{personLabel(person.staff_type, person.id)}</td>
                    <td className="px-4 py-3">{person.position ?? "—"}</td>
                    <td className="px-4 py-3">{person.employee_number ?? "—"}</td>
                    <td className="px-4 py-3 text-red-600">Aucune arrivée enregistrée</td>
                  </tr>
                ))}
                {!absents.length && <tr><td colSpan={4} className="p-8 text-center text-emerald-700">Aucun absent détecté selon les pointages d'arrivée.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "retards" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Enseignant</th><th className="px-4 py-3 text-left">Début prévu</th><th className="px-4 py-3 text-left">Retard</th><th className="px-4 py-3 text-left">Heures retenues</th></tr></thead>
              <tbody className="divide-y">
                {lateAlerts.map(alert => {
                  const teacher = people.find(person => person.id === alert.teacher_id && person.staff_type === "teacher")
                  const lesson = lessonRows.find(row => row.id === alert.lesson_attendance_id)
                  return <tr key={`${alert.teacher_id}-${alert.timetable_slot_id}`}><td className="px-4 py-3">{teacher ? personLabel("teacher", teacher.id) : alert.teacher_id}</td><td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td><td className="px-4 py-3">{alert.late_minutes} min</td><td className="px-4 py-3">{lesson?.counted_hours ?? "selon paramètres"} h</td></tr>
                })}
                {!lateAlerts.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun retard détecté.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "cours" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Enseignant</th><th className="px-4 py-3 text-left">Début</th><th className="px-4 py-3 text-left">Fin prévue</th><th className="px-4 py-3 text-left">État</th></tr></thead>
              <tbody className="divide-y">
                {missingLessons.map(alert => <tr key={`${alert.teacher_id}-${alert.timetable_slot_id}`}><td className="px-4 py-3">{personLabel("teacher", alert.teacher_id)}</td><td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td><td className="px-4 py-3">{alert.scheduled_end?.slice(0,5)}</td><td className="px-4 py-3 text-red-600">Non pointé</td></tr>)}
                {!missingLessons.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun cours non pointé détecté.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "alertes" && (
          <section className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={`${alert.alert_type}-${alert.teacher_id}-${alert.timetable_slot_id}-${index}`} className="flex flex-wrap items-start gap-3 rounded-lg border bg-background p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {alert.alert_type === "missing_lesson" ? "Cours non pointé" : alert.alert_type === "lesson_to_close" ? "Cours à clôturer" : "Retard"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {personLabel("teacher", alert.teacher_id)} · {alert.scheduled_start?.slice(0,5)} → {alert.scheduled_end?.slice(0,5)}
                    {alert.late_minutes ? ` · ${alert.late_minutes} min` : ""}
                  </div>
                </div>
                {alert.lesson_attendance_id && alert.alert_type === "lesson_to_close" && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      await servicePointage.cloturerCours(alert.lesson_attendance_id!)
                      toast.success("Cours clôturé.")
                      await loadMonitoring()
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Clôture impossible.")
                    }
                  }}>
                    Clôturer
                  </Button>
                )}
              </div>
            ))}
            {!alerts.length && <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />Aucune alerte actuellement.</div>}
          </section>
        )}

        {section === "parametres" && (
          <section className="max-w-3xl rounded-lg border bg-background p-5 space-y-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5" /> Calcul des heures et règles de pointage</h2>
              <p className="mt-1 text-sm text-muted-foreground">Exemple : un cours de 08h00 à 09h40 peut compter 2 h jusqu'au seuil configuré, puis 1 h après ce seuil.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Tolérance avant le début (minutes)</Label><Input className="mt-1" type="number" min="0" value={settings?.early_arrival_tolerance_minutes ?? 15} onChange={e => updateSetting("early_arrival_tolerance_minutes", Number(e.target.value))} /></div>
              <div><Label>Seuil pour les heures complètes (minutes)</Label><Input className="mt-1" type="number" min="0" value={settings?.full_credit_threshold_minutes ?? 40} onChange={e => updateSetting("full_credit_threshold_minutes", Number(e.target.value))} /></div>
              <div><Label>Heures retenues avant le seuil</Label><Input className="mt-1" type="number" min="0" step="0.25" value={settings?.full_credit_hours ?? 2} onChange={e => updateSetting("full_credit_hours", Number(e.target.value))} /></div>
              <div><Label>Heures retenues après le seuil</Label><Input className="mt-1" type="number" min="0" step="0.25" value={settings?.partial_credit_hours ?? 1} onChange={e => updateSetting("partial_credit_hours", Number(e.target.value))} /></div>
              <div><Label>Délai avant alerte cours non pointé (minutes)</Label><Input className="mt-1" type="number" min="0" value={settings?.alert_missing_lesson_after_minutes ?? 10} onChange={e => updateSetting("alert_missing_lesson_after_minutes", Number(e.target.value))} /></div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <label className="flex items-center justify-between gap-4 text-sm"><span>Autoriser l'enseignant à clôturer depuis son téléphone</span><Switch checked={settings?.allow_teacher_close ?? true} onCheckedChange={value => updateSetting("allow_teacher_close", value)} /></label>
              <label className="flex items-center justify-between gap-4 text-sm"><span>Alerter l'administration lorsqu'un cours arrive à sa fin sans clôture</span><Switch checked={settings?.require_admin_closure_after_schedule_end ?? true} onCheckedChange={value => updateSetting("require_admin_closure_after_schedule_end", value)} /></label>
              <label className="flex items-center justify-between gap-4 text-sm"><span>Activer les alertes</span><Switch checked={settings?.alerts_enabled ?? true} onCheckedChange={value => updateSetting("alerts_enabled", value)} /></label>
              <label className="flex items-center justify-between gap-4 text-sm"><span>Autoriser l'identification par code</span><Switch checked={settings?.code_enabled ?? true} onCheckedChange={value => updateSetting("code_enabled", value)} /></label>
              <label className="flex items-center justify-between gap-4 text-sm"><span>Autoriser l'identification par QR</span><Switch checked={settings?.qr_enabled ?? true} onCheckedChange={value => updateSetting("qr_enabled", value)} /></label>
            </div>

            <Button onClick={() => void saveSettings()} disabled={savingSettings || !academicYearId}>
              {savingSettings ? "Enregistrement…" : "Enregistrer les paramètres"}
            </Button>
          </section>
        )}
      </div>
    </main>
  )
}
