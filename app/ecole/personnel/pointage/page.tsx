"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, LogIn, LogOut, Play, QrCode, Settings2, Square, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useUserContext } from "@/hooks/useUserContext"
import { getAcademicYears } from "@/lib/supabase/services/academic-year.service"
import { supabaseBrowser } from "@/lib/supabase/client"
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

const ACTIONS: { id: Mode; label: string; description: string; icon: typeof LogIn }[] = [
  { id: "arrival", label: "Arrivée à l'établissement", description: "Enregistrer le début de journée.", icon: LogIn },
  { id: "departure", label: "Départ de l'établissement", description: "Enregistrer la fin de journée.", icon: LogOut },
  { id: "course_start", label: "Début de cours", description: "Le cours est déterminé automatiquement par l'emploi du temps.", icon: Play },
  { id: "course_end", label: "Fin de cours", description: "Clôturer le cours actuellement en cours.", icon: Square },
]

const SECTIONS: { id: Section; label: string }[] = [
  { id: "pointage", label: "Effectuer un pointage" },
  { id: "historique", label: "Historique" },
  { id: "fiches", label: "Fiches de pointage" },
  { id: "absents", label: "Absents" },
  { id: "retards", label: "Retards" },
  { id: "cours", label: "Cours non pointés" },
  { id: "alertes", label: "Alertes" },
  { id: "parametres", label: "Paramètres" },
]

export default function PersonnelPointagePage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const today = new Date().toISOString().slice(0, 10)

  const [section, setSection] = useState<Section>("pointage")
  const [mode, setMode] = useState<Mode>("arrival")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<PointageAlert[]>([])
  const [staffRows, setStaffRows] = useState<AttendanceRow[]>([])
  const [lessonRows, setLessonRows] = useState<LessonRow[]>([])
  const [settings, setSettings] = useState<PointageSettings | null>(null)
  const [academicYearId, setAcademicYearId] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [qrSvg, setQrSvg] = useState("")
  const [qrBusy, setQrBusy] = useState(false)

  const loadMonitoring = useCallback(async () => {
    if (!establishmentId) return
    try {
      const [nextAlerts, nextStaff, nextLessons, years] = await Promise.all([
        servicePointage.obtenirAlertes(establishmentId, today),
        servicePointage.obtenirPointagesPersonnel(establishmentId, today),
        servicePointage.obtenirCoursPointes(establishmentId, today),
        getAcademicYears(establishmentId),
      ])
      setAlerts(nextAlerts)
      setStaffRows(nextStaff as AttendanceRow[])
      setLessonRows(nextLessons as LessonRow[])
      const activeYear = years.find((year: any) => year.status === "active")
      if (activeYear) {
        setAcademicYearId(activeYear.id)
        const nextSettings = await servicePointage.obtenirParametres(establishmentId, activeYear.id)
        setSettings(nextSettings)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger le pointage.")
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
      const label = mode === "arrival" ? "Arrivée enregistrée" : mode === "departure" ? "Départ enregistré" : mode === "course_start" ? "Début de cours validé" : "Fin de cours validée"
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

  const counts = useMemo(() => ({
    present: staffRows.filter(row => row.status === "present" || row.status === "late").length,
    late: alerts.filter(alert => alert.alert_type === "late").length,
    missingCourses: alerts.filter(alert => alert.alert_type === "missing_lesson").length,
    toClose: alerts.filter(alert => alert.alert_type === "lesson_to_close").length,
  }), [staffRows, alerts])

  if (estEnCoursDeChargement) {
    return <main className="min-h-screen p-6 text-sm text-muted-foreground">Chargement du pointage…</main>
  }

  return (
    <main className="min-h-screen bg-muted/20 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/ecole/personnel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Personnel</Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pointage</h1>
            <p className="text-sm text-muted-foreground">Pointage centralisé du personnel et suivi des cours enseignants.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border bg-background px-3 py-2"><Users className="mr-1 inline h-4 w-4" />{counts.present} présent(s)</span>
            <span className="rounded-md border bg-background px-3 py-2"><AlertTriangle className="mr-1 inline h-4 w-4" />{alerts.length} alerte(s)</span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-background px-1">
          {SECTIONS.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${section === item.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
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
                <p className="mt-1 text-sm text-muted-foreground">Le code identifie automatiquement la personne. Pour un enseignant, le cours est recherché dans l'emploi du temps actuel.</p>
              </div>
              <Label htmlFor="pointage-code">Code personnel</Label>
              <Input id="pointage-code" inputMode="text" autoComplete="off" value={code} onChange={event => setCode(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === "Enter") void submitPointage() }} placeholder="Ex. A1B2C3D4" className="mt-2 h-12 text-center text-lg tracking-[0.25em]" maxLength={8} />
              <Button onClick={() => void submitPointage()} disabled={busy || !code.trim()} className="mt-4 w-full h-11">
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
                    <p className="max-w-full break-all text-center font-mono text-[10px] text-muted-foreground">{qrToken}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {section === "historique" && (
          <section className="space-y-5">
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Personne</th><th className="px-4 py-3 text-left">Arrivée / début</th><th className="px-4 py-3 text-left">Départ / fin</th><th className="px-4 py-3 text-left">Statut</th></tr></thead>
                <tbody className="divide-y">
                  {staffRows.map(row => <tr key={`staff-${row.id}`}><td className="px-4 py-3">Personnel</td><td className="px-4 py-3">{row.staff_id}</td><td className="px-4 py-3">{row.check_in ? String(row.check_in).slice(0,5) : "—"}</td><td className="px-4 py-3">{row.check_out ? String(row.check_out).slice(0,5) : "—"}</td><td className="px-4 py-3">{row.status}</td></tr>)}
                  {lessonRows.map(row => <tr key={`lesson-${row.id}`}><td className="px-4 py-3">Cours</td><td className="px-4 py-3">{row.teacher_id}</td><td className="px-4 py-3">{row.started_time?.slice(0,5) ?? "—"}</td><td className="px-4 py-3">{row.ended_time?.slice(0,5) ?? "—"}</td><td className="px-4 py-3">{row.status}</td></tr>)}
                  {staffRows.length === 0 && lessonRows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun pointage enregistré aujourd'hui.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "fiches" && (
          <section className="rounded-lg border bg-background p-5">
            <h2 className="font-semibold">Fiches de pointage</h2>
            <p className="mt-1 text-sm text-muted-foreground">La base de données conserve maintenant les heures réelles, les heures retenues et les méthodes de pointage. L'impression/export détaillé sera branché sur ces données.</p>
          </section>
        )}

        {section === "absents" && (
          <section className="rounded-lg border bg-background p-5">
            <h2 className="font-semibold">Absents</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les absences seront déterminées à partir des événements attendus et des règles de tolérance, sans saisie manuelle du cours.</p>
          </section>
        )}

        {section === "retards" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Enseignant</th><th className="px-4 py-3 text-left">Début prévu</th><th className="px-4 py-3 text-left">Retard</th><th className="px-4 py-3 text-left">Heures retenues</th></tr></thead>
              <tbody className="divide-y">{alerts.filter(alert => alert.alert_type === "late").map(alert => <tr key={`${alert.teacher_id}-${alert.timetable_slot_id}`}><td className="px-4 py-3">{alert.teacher_id}</td><td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td><td className="px-4 py-3">{alert.late_minutes} min</td><td className="px-4 py-3">selon paramètres</td></tr>)}{alerts.filter(alert => alert.alert_type === "late").length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun retard détecté.</td></tr>}</tbody>
            </table>
          </section>
        )}

        {section === "cours" && (
          <section className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b bg-muted/40"><tr><th className="px-4 py-3 text-left">Enseignant</th><th className="px-4 py-3 text-left">Début</th><th className="px-4 py-3 text-left">Fin prévue</th><th className="px-4 py-3 text-left">État</th></tr></thead>
              <tbody className="divide-y">{alerts.filter(alert => alert.alert_type === "missing_lesson").map(alert => <tr key={`${alert.teacher_id}-${alert.timetable_slot_id}`}><td className="px-4 py-3">{alert.teacher_id}</td><td className="px-4 py-3">{alert.scheduled_start?.slice(0,5)}</td><td className="px-4 py-3">{alert.scheduled_end?.slice(0,5)}</td><td className="px-4 py-3 text-red-600">Non pointé</td></tr>)}{alerts.filter(alert => alert.alert_type === "missing_lesson").length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun cours non pointé détecté.</td></tr>}</tbody>
            </table>
          </section>
        )}

        {section === "alertes" && (
          <section className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={`${alert.alert_type}-${alert.teacher_id}-${alert.timetable_slot_id}-${index}`} className="flex items-start gap-3 rounded-lg border bg-background p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div><div className="font-medium">{alert.alert_type === "missing_lesson" ? "Cours non pointé" : alert.alert_type === "lesson_to_close" ? "Cours à clôturer" : "Retard"}</div><div className="text-sm text-muted-foreground">Enseignant {alert.teacher_id} · {alert.scheduled_start?.slice(0,5)} → {alert.scheduled_end?.slice(0,5)}{alert.late_minutes ? ` · ${alert.late_minutes} min` : ""}</div></div>
                {alert.lesson_attendance_id && alert.alert_type === "lesson_to_close" && <Button size="sm" variant="outline" className="ml-auto" onClick={async () => { try { await servicePointage.cloturerCours(alert.lesson_attendance_id!); toast.success("Cours clôturé."); await loadMonitoring() } catch (error) { toast.error(error instanceof Error ? error.message : "Clôture impossible.") } }}>Clôturer</Button>}
              </div>
            ))}
            {alerts.length === 0 && <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />Aucune alerte actuellement.</div>}
          </section>
        )}

        {section === "parametres" && (
          <section className="max-w-3xl rounded-lg border bg-background p-5 space-y-5">
            <div><h2 className="flex items-center gap-2 font-semibold"><Settings2 className="h-5 w-5" /> Calcul des heures et règles de pointage</h2><p className="mt-1 text-sm text-muted-foreground">Exemple par défaut : un cours de 1h40 peut compter 2h jusqu'au seuil de 40 minutes de retard, puis 1h.</p></div>
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
            <Button onClick={() => void saveSettings()} disabled={savingSettings || !academicYearId}>{savingSettings ? "Enregistrement…" : "Enregistrer les paramètres"}</Button>
          </section>
        )}
      </div>
    </main>
  )
}
