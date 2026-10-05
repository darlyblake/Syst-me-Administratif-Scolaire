"use client"

import { useEffect, useMemo, useState } from "react"
import { useParentPortal } from "@/hooks/use-parent-portal"

export default function ParentAbsences() {
  const { loading, error, refresh, children, attendance, justificationRequests, requestAttendanceJustification, cancelAttendanceJustification } = useParentPortal()
  const allowed = useMemo(() => children.filter((c) => c.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("eleve")
    if (id) setChildId(id)
  }, [])

  const list = useMemo(() => attendance.filter((a) => a.status !== "present" && (childId === "tous" ? allowed.some((c) => c.id === a.student_id) : a.student_id === childId)), [attendance, childId, allowed])
  const requests = useMemo(() => new Map(justificationRequests.map((r) => [r.attendance_id, r])), [justificationRequests])
  const stats = { total: list.length, absences: list.filter((a) => a.status.includes("absent")).length, retards: list.filter((a) => a.status === "late" || a.status === "retard").length }

  async function submit() {
    const item = attendance.find((a) => a.id === selected)
    if (!item) return
    setBusy(true)
    try { await requestAttendanceJustification(item, reason); setSelected(null); setReason("") } finally { setBusy(false) }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">Vie scolaire</p><h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950">Présences</h1><p className="mt-1.5 text-sm leading-6 text-slate-500">Suivez les absences, retards et demandes de justification.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loading ? "Actualisation…" : "Actualiser"}</button>
      </header>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!loading && allowed.length === 0 ? <div className="border border-dashed border-slate-200 bg-white px-5 py-12 text-center"><p className="font-semibold text-slate-900">Présences non disponibles</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">Votre compte n’a actuellement pas l’autorisation de consulter la vie scolaire.</p></div> :
      <>
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3"><span className="text-sm font-medium text-slate-700">Enfant</span><select value={childId} onChange={(e) => setChildId(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="tous">Tous les enfants</option>{allowed.map((c) => <option key={c.id} value={c.id}>{c.first_name || ""} {c.last_name || ""}</option>)}</select></label>
          <div className="flex flex-wrap gap-6 text-sm text-slate-500"><span><strong className="text-slate-900">{stats.total}</strong> incidents</span><span><strong className="text-slate-900">{stats.absences}</strong> absences</span><span><strong className="text-slate-900">{stats.retards}</strong> retards</span></div>
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_auto] border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid"><span>Date / élève</span><span>Statut</span><span>Justification</span><span /></div>
          {list.map((a) => { const child = children.find((c) => c.id === a.student_id); const r = requests.get(a.id); const label = a.status === "late" || a.status === "retard" ? "Retard" : a.status === "absent" ? "Absence" : "Non justifiée"; return <div key={a.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center"><div><p className="font-medium text-slate-900">{new Date(a.attendance_date).toLocaleDateString("fr-FR")}</p><p className="text-sm text-slate-500">{child?.first_name || ""} {child?.last_name || ""}</p>{a.reason && <p className="mt-1 text-xs text-slate-500">Motif : {a.reason}</p>}</div><span className="text-sm font-medium text-slate-700">{label}</span><span className="text-xs text-slate-500">{r ? r.status === "approved" ? "Acceptée" : r.status === "rejected" ? "Refusée" : r.status === "cancelled" ? "Annulée" : "En attente" : "Aucune"}</span><div>{!r && (a.status === "absent" || a.status === "non_justifie") ? <button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold" onClick={() => { setSelected(a.id); setReason(a.reason ?? "") }}>Justifier</button> : r?.status === "pending" ? <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600" onClick={() => void cancelAttendanceJustification(r.id)}>Annuler</button> : null}</div></div> })}
          {list.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-500">Aucune absence ou retard pour cette sélection.</p>}
        </section>
      </>}
      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">Justifier une absence</h2><p className="mt-1 text-sm text-slate-500">La demande sera transmise à l’établissement.</p></div><button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setSelected(null)}>Fermer</button></div><textarea className="mt-5 min-h-32 w-full rounded-md border border-slate-200 p-3 text-sm" rows={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expliquez brièvement le motif…" maxLength={2000}/><div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setSelected(null)}>Annuler</button><button type="button" disabled={busy || reason.trim().length < 3} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void submit()}>{busy ? "Envoi…" : "Envoyer"}</button></div></div></div>}
    </div>
  )
}
