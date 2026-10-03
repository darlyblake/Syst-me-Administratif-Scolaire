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
  Printer,
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

type DailyReportRow = {
  attendance_date: string
  staff_type: "teacher" | "staff"
  staff_id: string
  employee_number: string | null
  first_name: string
  last_name: string
  job_title: string | null
  planned_minutes: number
  worked_minutes: number
  credited_minutes: number
  late_minutes: number
  early_departure_minutes: number
  overtime_minutes: number
  status: string
  check_in: string | null
  check_out: string | null
}

type PeriodSummaryRow = {
  staff_type: "teacher" | "staff"
  staff_id: string
  employee_number: string | null
  first_name: string
  last_name: string
  job_title: string | null
  planned_hours: number
  worked_hours: number
  credited_hours: number
  late_minutes: number
  early_departure_minutes: number
  overtime_hours: number
  absent_days: number
  incomplete_days: number
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
  const [selectedDate, setSelectedDate] = useState(today)
  const [historyFilter, setHistoryFilter] = useState("all")
  const [peopleFilter, setPeopleFilter] = useState("")
  const [alertFilter, setAlertFilter] = useState("all")
  const [retardTab, setRetardTab] = useState<"enseignants" | "personnel">("enseignants")
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
  const [academicYear, setAcademicYear] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7))
  const [ficheRows, setFicheRows] = useState<DailyReportRow[]>([])
  const [summaryRows, setSummaryRows] = useState<PeriodSummaryRow[]>([])
  const [ficheLoading, setFicheLoading] = useState(false)

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
      await servicePointage.rafraichirAlertes(establishmentId, selectedDate)
      const [nextAlerts, nextStaff, nextLessons, nextHistory, nextPeople, years] = await Promise.all([
        servicePointage.obtenirAlertes(establishmentId, selectedDate),
        servicePointage.obtenirPointagesPersonnel(establishmentId, selectedDate),
        servicePointage.obtenirCoursPointes(establishmentId, selectedDate),
        servicePointage.obtenirHistorique(establishmentId, selectedDate),
        servicePointage.obtenirPersonnelActif(establishmentId),
        getAcademicYears(establishmentId),
      ])

      setAlerts(nextAlerts)
      setStaffRows(nextStaff as AttendanceRow[])
      setLessonRows(nextLessons as LessonRow[])
      setHistoryRows(nextHistory as HistoryRow[])
      setPeople(nextPeople as PersonRow[])
      await servicePointage.garantirCodesPointage(establishmentId)

      const activeYear = years.find((year: any) => year.status === "active")
      if (activeYear) {
        setAcademicYearId(activeYear.id)
        setAcademicYear(activeYear)
        setSettings(await servicePointage.obtenirParametres(establishmentId, activeYear.id))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le pointage.")
    } finally {
      setRefreshing(false)
    }
  }, [establishmentId, selectedDate])

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
        workStartTime: settings?.work_start_time ?? "07:00",
        workEndTime: settings?.work_end_time ?? "15:00",
        workDays: settings?.work_days ?? [1, 2, 3, 4, 5],
      })
      toast.success("Paramètres de pointage enregistrés.")
      await loadMonitoring()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer les paramètres.")
    } finally {
      setSavingSettings(false)
    }
  }

  const monthOptions = useMemo(() => {
    const start = academicYear?.start_date ?? academicYear?.starts_on
    const end = academicYear?.end_date ?? academicYear?.ends_on
    if (!start || !end) return [selectedMonth]
    const options: string[] = []
    const cursor = new Date(start + "T12:00:00")
    const limit = new Date(end + "T12:00:00")
    cursor.setDate(1)
    while (cursor <= limit) {
      options.push(cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0"))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return options.length ? options : [selectedMonth]
  }, [academicYear, selectedMonth])

  const loadFiche = useCallback(async () => {
    if (!establishmentId || !selectedMonth) return
    setFicheLoading(true)
    try {
      const parts = selectedMonth.split("-").map(Number)
      const year = parts[0]
      const month = parts[1]
      const startDate = selectedMonth + "-01"
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = selectedMonth + "-" + String(lastDay).padStart(2, "0")
      const [daily, summary] = await Promise.all([
        servicePointage.obtenirFichePointage(establishmentId, startDate, endDate),
        servicePointage.obtenirSynthesePointage(establishmentId, startDate, endDate),
      ])
      setFicheRows(daily as DailyReportRow[])
      setSummaryRows(summary as PeriodSummaryRow[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer la fiche de pointage.")
    } finally {
      setFicheLoading(false)
    }
  }, [establishmentId, selectedMonth])

  useEffect(() => {
    if (section === "fiches") void loadFiche()
  }, [section, loadFiche])

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

  const filteredHistory = historyRows.filter(row => historyFilter === "all" || row.event_type === historyFilter)
  const filteredPeople = people.filter(person => { const q = peopleFilter.trim().toLowerCase(); return !q || personLabel(person.staff_type, person.id).toLowerCase().includes(q) || (person.employee_number ?? "").toLowerCase().includes(q) })
  const filteredAlerts = alerts.filter(alert => alertFilter === "all" || alert.alert_type === alertFilter)
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
          <div className="flex flex-wrap items-end gap-2 text-sm print:hidden">
            <div><Label htmlFor="pointage-date">Date consultée</Label><Input id="pointage-date" type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="mt-1 w-[170px]" /></div>
            <span className="rounded-md border bg-background px-3 py-2"><Users className="mr-1 inline h-4 w-4" />{counts.present} présent(s)</span>
            <span className="rounded-md border bg-background px-3 py-2"><AlertTriangle className="mr-1 inline h-4 w-4" />{alerts.length} alerte(s)</span>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
            <Button variant="outline" size="sm" onClick={() => void loadMonitoring()} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-1 print:hidden">
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
                <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Heure</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Événement</th><th className="px-4 py-3 text-left">Méthode</th><th className="px-4 py-3 text-left">Cours</th></tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{new Date(row.event_time).toLocaleDateString("fr-FR")}</td><td className="px-4 py-3">{new Date(row.event_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
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
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="fiche-month">Mois de la fiche</Label>
                  <select id="fiche-month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} className="mt-1 h-10 w-[220px] rounded-md border bg-background px-3 text-sm">
                    {monthOptions.map(month => (
                      <option key={month} value={month}>
                        {new Date(month + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="fiche-person-filter">Personnel</Label>
                  <Input id="fiche-person-filter" value={peopleFilter} onChange={event => setPeopleFilter(event.target.value)} placeholder="Nom ou matricule" className="mt-1 w-[240px]" />
                </div>
              </div>
              <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimer / PDF</Button>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <h2 className="font-semibold">Fiche de pointage — {new Date(selectedMonth + "-01T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Le pointage calcule les heures prévues, travaillées et supplémentaires. Finance décide ensuite des primes, retenues et règles de paie.</p>
              {ficheLoading && <p className="mt-2 text-sm text-muted-foreground">Génération de la fiche…</p>}
            </div>

            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Heures prévues</th><th className="px-4 py-3 text-left">Heures travaillées</th><th className="px-4 py-3 text-left">Heures créditées</th><th className="px-4 py-3 text-left">Retards</th><th className="px-4 py-3 text-left">Heures sup.</th><th className="px-4 py-3 text-left">Absences</th></tr>
                </thead>
                <tbody className="divide-y">
                  {summaryRows.filter(row => {
                    const q = peopleFilter.trim().toLowerCase()
                    return !q || (row.first_name + " " + row.last_name).toLowerCase().includes(q) || (row.employee_number ?? "").toLowerCase().includes(q)
                  }).map(row => (
                    <tr key={row.staff_type + ":" + row.staff_id}>
                      <td className="px-4 py-3">{row.first_name} {row.last_name}</td><td className="px-4 py-3">{row.job_title ?? "—"}</td>
                      <td className="px-4 py-3">{Number(row.planned_hours).toFixed(2)} h</td><td className="px-4 py-3">{Number(row.worked_hours).toFixed(2)} h</td>
                      <td className="px-4 py-3">{Number(row.credited_hours).toFixed(2)} h</td><td className="px-4 py-3">{row.late_minutes} min</td>
                      <td className="px-4 py-3">{Number(row.overtime_hours).toFixed(2)} h</td><td className="px-4 py-3">{row.absent_days}</td>
                    </tr>
                  ))}
                  {!summaryRows.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucune donnée pour ce mois.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full min-w-[1300px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Prévu</th><th className="px-4 py-3 text-left">Travaillé</th><th className="px-4 py-3 text-left">Crédité</th><th className="px-4 py-3 text-left">Retard</th><th className="px-4 py-3 text-left">Départ anticipé</th><th className="px-4 py-3 text-left">Heures sup.</th><th className="px-4 py-3 text-left">État</th></tr>
                </thead>
                <tbody className="divide-y">
                  {ficheRows.filter(row => {
                    const q = peopleFilter.trim().toLowerCase()
                    return !q || (row.first_name + " " + row.last_name).toLowerCase().includes(q) || (row.employee_number ?? "").toLowerCase().includes(q)
                  }).map(row => (
                    <tr key={row.attendance_date + ":" + row.staff_type + ":" + row.staff_id}>
                      <td className="px-4 py-3">{new Date(row.attendance_date + "T12:00:00").toLocaleDateString("fr-FR")}</td><td className="px-4 py-3">{row.first_name} {row.last_name}</td><td className="px-4 py-3">{row.job_title ?? "—"}</td>
                      <td className="px-4 py-3">{(row.planned_minutes / 60).toFixed(2)} h</td><td className="px-4 py-3">{(row.worked_minutes / 60).toFixed(2)} h</td>
                      <td className="px-4 py-3">{(row.credited_minutes / 60).toFixed(2)} h</td><td className="px-4 py-3">{row.late_minutes} min</td>
                      <td className="px-4 py-3">{row.early_departure_minutes} min</td><td className="px-4 py-3">{(row.overtime_minutes / 60).toFixed(2)} h</td><td className="px-4 py-3">{row.status}</td>
                    </tr>
                  ))}
                  {!ficheRows.length && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Aucune journée enregistrée pour ce mois.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "absents" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Identifiant</th><th className="px-4 py-3 text-left">État</th></tr>
              </thead>
              <tbody className="divide-y">
                {absents.map(person => (
                  <tr key={`${person.staff_type}:${person.id}`}>
                    <td className="px-4 py-3">{new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">{personLabel(person.staff_type, person.id)}</td>
                    <td className="px-4 py-3">{person.position ?? "—"}</td>
                    <td className="px-4 py-3">{person.employee_number ?? "—"}</td>
                    <td className="px-4 py-3 text-red-600">Aucune arrivée enregistrée</td>
                  </tr>
                ))}
                {!absents.length && <tr><td colSpan={5} className="p-8 text-center text-emerald-700">Aucun absent détecté selon les pointages d'arrivée.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "retards" && (
          <section className="space-y-4">
            <div className="flex gap-2 print:hidden">
              <button onClick={() => setRetardTab("enseignants")} className={`rounded-md border px-3 py-2 text-sm ${retardTab === "enseignants" ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium" : "text-muted-foreground"}`}>Retards enseignants</button>
              <button onClick={() => setRetardTab("personnel")} className={`rounded-md border px-3 py-2 text-sm ${retardTab === "personnel" ? "border-emerald-600 bg-emerald-50 text-emerald-700 font-medium" : "text-muted-foreground"}`}>Retards du personnel</button>
            </div>
            <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
              {retardTab === "enseignants"
                ? "Les retards enseignants sont calculés sur l'heure de début de chaque cours."
                : "Les retards du personnel sont calculés sur l'horaire général configuré dans Paramètres."}
            </div>
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Fonction</th><th className="px-4 py-3 text-left">Début prévu</th><th className="px-4 py-3 text-left">Arrivée / cours</th><th className="px-4 py-3 text-left">Retard</th></tr></thead>
                <tbody className="divide-y">
                  {retardTab === "enseignants" && lateAlerts.map(alert => {
                    const teacher = people.find(person => person.id === alert.teacher_id && person.staff_type === "teacher")
                    return <tr key={alert.teacher_id + "-" + alert.timetable_slot_id}>
                      <td className="px-4 py-3">{new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">{teacher ? personLabel("teacher", teacher.id) : alert.teacher_id}</td>
                      <td className="px-4 py-3">Enseignant</td>
                      <td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td>
                      <td className="px-4 py-3">Cours</td>
                      <td className="px-4 py-3">{alert.late_minutes} min</td>
                    </tr>
                  })}
                  {retardTab === "personnel" && staffRows.filter(row => row.staff_type === "staff" && row.check_in && settings?.work_start_time).map(row => {
                    const person = people.find(p => p.staff_type === "staff" && p.id === row.staff_id)
                    if (!person) return null
                    const expected = new Date(selectedDate + "T" + settings!.work_start_time.slice(0,5) + ":00")
                    const actual = new Date(row.check_in!)
                    const late = Math.max(0, Math.round((actual.getTime() - expected.getTime()) / 60000))
                    if (!late) return null
                    return <tr key={"staff-late-" + row.id}>
                      <td className="px-4 py-3">{new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3">{personLabel("staff", person.id)}</td>
                      <td className="px-4 py-3">{person.position ?? "Personnel"}</td>
                      <td className="px-4 py-3">{settings!.work_start_time.slice(0,5)}</td>
                      <td className="px-4 py-3">{actual.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</td>
                      <td className="px-4 py-3">{late} min</td>
                    </tr>
                  })}
                  {retardTab === "enseignants" && !lateAlerts.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun retard enseignant pour cette date.</td></tr>}
                  {retardTab === "personnel" && !staffRows.some(row => row.staff_type === "staff" && row.check_in && settings?.work_start_time && Math.max(0, Math.round((new Date(row.check_in!).getTime() - new Date(selectedDate + "T" + settings!.work_start_time.slice(0,5) + ":00").getTime()) / 60000)) > 0) && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aucun retard du personnel pour cette date.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "cours" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Enseignant</th><th className="px-4 py-3 text-left">Début</th><th className="px-4 py-3 text-left">Fin prévue</th><th className="px-4 py-3 text-left">État</th></tr></thead>
              <tbody className="divide-y">
                {missingLessons.map(alert => <tr key={`${alert.teacher_id}-${alert.timetable_slot_id}`}><td className="px-4 py-3">{new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR")}</td><td className="px-4 py-3">{personLabel("teacher", alert.teacher_id)}</td><td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td><td className="px-4 py-3">{alert.scheduled_end?.slice(0,5)}</td><td className="px-4 py-3 text-red-600">Non pointé</td></tr>)}
                {!missingLessons.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun cours non pointé détecté pour cette date.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {section === "alertes" && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end gap-2 print:hidden"><div><Label htmlFor="alert-filter">Filtrer les alertes</Label><select id="alert-filter" value={alertFilter} onChange={event => setAlertFilter(event.target.value)} className="mt-1 h-10 rounded-md border bg-background px-3 text-sm"><option value="all">Toutes</option><option value="late">Retards</option><option value="missing_lesson">Cours non pointés</option><option value="lesson_to_close">Cours à clôturer</option></select></div></div>
            {filteredAlerts.map((alert, index) => (
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
            {!alerts.length && <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />Aucune alerte pour cette date.</div>}
          </section>
        )}

        {section === "parametres" && (
          <section className="max-w-3xl rounded-lg border bg-background p-5 space-y-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5" /> Calcul des heures et règles de pointage</h2>
              <p className="mt-1 text-sm text-muted-foreground">Exemple : un cours de 08h00 à 09h40 peut compter 2 h jusqu'au seuil configuré, puis 1 h après ce seuil.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-3 sm:col-span-2">
                <p className="font-medium">Horaires généraux de l'établissement — personnel non enseignant</p>
                <p className="mt-1 text-xs text-muted-foreground">Ces horaires servent au calcul quotidien des retards, heures travaillées et heures supplémentaires du personnel administratif. Les enseignants restent calculés selon leur emploi du temps.</p>
              </div>
              <div><Label>Début de journée</Label><Input className="mt-1" type="time" value={settings?.work_start_time ?? "07:00"} onChange={e => updateSetting("work_start_time", e.target.value)} /></div>
              <div><Label>Fin de journée</Label><Input className="mt-1" type="time" value={settings?.work_end_time ?? "15:00"} onChange={e => updateSetting("work_end_time", e.target.value)} /></div>
              <div className="sm:col-span-2">
                <Label>Jours travaillés</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[[1,"Lun"],[2,"Mar"],[3,"Mer"],[4,"Jeu"],[5,"Ven"],[6,"Sam"],[7,"Dim"]].map(([day,label]) => {
                    const active = (settings?.work_days ?? [1,2,3,4,5]).includes(Number(day))
                    return <button type="button" key={day} onClick={() => updateSetting("work_days", active ? (settings?.work_days ?? []).filter(d => d !== Number(day)) : [...(settings?.work_days ?? []), Number(day)].sort())} className={`rounded-md border px-3 py-1.5 text-sm ${active ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "text-muted-foreground"}`}>{label}</button>
                  })}
                </div>
              </div>
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
      <style jsx global>{`@media print { body { background: white !important; } @page { margin: 10mm; } }`}</style>
    </main>
  )
}
