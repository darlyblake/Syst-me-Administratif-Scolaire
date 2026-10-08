"use client"

import { useMemo, useState } from "react"
import { useParentPortal, type ParentAttendance } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"

type StatusFilter = "all" | "present" | "absent" | "late" | "justified"

function dayOfWeekFromDate(value: string) {
  const date = new Date(value + "T12:00:00")
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—"
  return value.slice(0, 5)
}

function statusLabel(status: string) {
  if (status === "present") return "Présent"
  if (status === "late" || status === "retard") return "Retard"
  if (status === "justified" || status === "excused") return "Justifié"
  return "Absent"
}

function statusClass(status: string) {
  if (status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "late" || status === "retard") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "justified" || status === "excused") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function ParentAbsences() {
  const {
    loading,
    error,
    refresh,
    children,
    attendance,
    timetable,
    justificationRequests,
  } = useParentPortal()

  const allowed = useMemo(() => children.filter((c) => c.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selected, setSelected] = useState<ParentAttendance | null>(null)
  const [reason, setReason] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const requests = useMemo(
    () => new Map(justificationRequests.map((request) => [request.attendance_id, request])),
    [justificationRequests],
  )

  const rows = useMemo(() => {
    const day = dayOfWeekFromDate(date)
    const selectedChildren = allowed.filter((child) => childId === "tous" || child.id === childId)
    const result: Array<{
      key: string
      childId: string
      childName: string
      slotId: string
      subject: string
      startsAt: string
      endsAt: string
      attendance: ParentAttendance | null
      derivedStatus: string
    }> = []

    for (const child of selectedChildren) {
      const slots = timetable
        .filter((slot) => slot.class_id === child.class_id && slot.day_of_week === day)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

      for (const slot of slots) {
        const record = attendance.find(
          (item) =>
            item.student_id === child.id &&
            item.attendance_date === date &&
            item.lesson_key === slot.id,
        ) ?? null

        result.push({
          key: child.id + "-" + slot.id,
          childId: child.id,
          childName: (child.first_name + " " + child.last_name).trim(),
          slotId: slot.id,
          subject: slot.subject,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          attendance: record,
          derivedStatus: record?.status ?? "pending",
        })
      }
    }

    return result.filter((row) => {
      if (statusFilter === "all") return true
      if (statusFilter === "present") return row.derivedStatus === "present"
      if (statusFilter === "late") return row.derivedStatus === "late" || row.derivedStatus === "retard"
      if (statusFilter === "justified") return row.derivedStatus === "justified" || row.derivedStatus === "excused"
      return row.derivedStatus === "absent"
    })
  }, [allowed, attendance, childId, date, statusFilter, timetable])

  const counts = useMemo(() => {
    const allRows = rows
    return {
      present: allRows.filter((row) => row.derivedStatus === "present").length,
      absent: allRows.filter((row) => row.derivedStatus === "absent").length,
      late: allRows.filter((row) => row.derivedStatus === "late" || row.derivedStatus === "retard").length,
      justified: allRows.filter((row) => row.derivedStatus === "justified" || row.derivedStatus === "excused").length,
    }
  }, [rows])

  async function submitJustification() {
    if (!selected?.attendance) return
    const trimmed = reason.trim()
    if (trimmed.length < 3 || trimmed.length > 2000) {
      setFormError("Le motif doit contenir entre 3 et 2000 caractères.")
      return
    }
    if (file && (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setFormError("Le document doit être une image ou un PDF de 10 Mo maximum.")
      return
    }

    setBusy(true)
    setFormError(null)
    try {
      const child = allowed.find((item) => item.id === selected.student_id)
      const { data: auth, error: authError } = await supabaseBrowser.auth.getUser()
      if (authError || !auth.user || !child) throw new Error("Session parent introuvable.")

      const { data: request, error: requestError } = await supabaseBrowser
        .from("attendance_justification_requests")
        .insert({
          attendance_id: selected.attendance.id,
          student_id: selected.student_id,
          establishment_id: child.establishment_id,
          parent_user_id: auth.user.id,
          reason: trimmed,
          status: "pending",
        })
        .select("id")
        .single()

      if (requestError) throw requestError

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = auth.user.id + "/" + request.id + "/" + safeName
        const { error: uploadError } = await supabaseBrowser.storage
          .from("attendance-justifications")
          .upload(path, file, { contentType: file.type, upsert: false })

        if (uploadError) throw uploadError

        const { error: attachError } = await supabaseBrowser
          .from("attendance_justification_requests")
          .update({
            attachment_path: path,
            attachment_name: file.name,
            attachment_mime_type: file.type,
            attachment_size_bytes: file.size,
          })
          .eq("id", request.id)
          .eq("parent_user_id", auth.user.id)
          .eq("status", "pending")

        if (attachError) throw attachError
      }

      setSelected(null)
      setReason("")
      setFile(null)
      await refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Impossible d'envoyer la justification.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">Vie scolaire</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950">Présences</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            Consultez chaque cours de votre enfant, son horaire et son statut de présence.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="border-y border-slate-200 bg-white">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enfant</span>
            <select value={childId} onChange={(event) => setChildId(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="tous">Tous les enfants</option>
              {allowed.map((child) => <option key={child.id} value={child.id}>{child.first_name} {child.last_name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Présence</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="all">Tous les statuts</option>
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">Retard</option>
              <option value="justified">Justifié</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-6 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span><strong className="text-emerald-700">{counts.present}</strong> présent(s)</span>
          <span><strong className="text-red-700">{counts.absent}</strong> absent(s)</span>
          <span><strong className="text-amber-700">{counts.late}</strong> retard(s)</span>
          <span><strong className="text-blue-700">{counts.justified}</strong> justifié(s)</span>
        </div>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {new Date(date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Enfant</th>
                <th className="px-5 py-3">Horaire</th>
                <th className="px-5 py-3">Matière</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const record = row.attendance
                const request = record ? requests.get(record.id) : undefined
                const pending = !record
                const label = pending ? "En attente" : statusLabel(row.derivedStatus)
                const canJustify = !!record && (row.derivedStatus === "absent" || row.derivedStatus === "late" || row.derivedStatus === "retard") && !request
                return (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{row.childName}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{formatTime(row.startsAt)} – {formatTime(row.endsAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.subject}</td>
                    <td className="px-5 py-4">
                      {pending
                        ? <span className="text-xs text-slate-400">En attente de l'appel</span>
                        : <span className={"inline-flex border px-2.5 py-1 text-xs font-semibold " + statusClass(row.derivedStatus)}>{label}</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {request?.status === "pending"
                        ? <span className="text-xs font-medium text-amber-700">En attente</span>
                        : request?.status === "approved"
                          ? <span className="text-xs font-medium text-emerald-700">Acceptée</span>
                          : request?.status === "rejected"
                            ? <span className="text-xs font-medium text-red-700">Refusée</span>
                            : canJustify
                              ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFormError(null) }} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Justifier</button>
                              : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Aucun cours correspondant aux filtres sélectionnés.</div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Justifier le {selected.status === "late" || selected.status === "retard" ? "retard" : "cours"}</h2>
                <p className="mt-1 text-sm text-slate-500">La demande sera transmise à l'administration de l'établissement.</p>
              </div>
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setSelected(null)}>Fermer</button>
            </div>

            <textarea className="mt-5 min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-500" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez brièvement le motif…" maxLength={2000} />

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Document justificatif</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <span className="mt-1 block text-xs text-slate-500">Photo du document ou PDF — 10 Mo maximum.</span>
            </label>

            {formError && <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setSelected(null)}>Annuler</button>
              <button type="button" disabled={busy || reason.trim().length < 3} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void submitJustification()}>
                {busy ? "Envoi…" : "Envoyer la justification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
