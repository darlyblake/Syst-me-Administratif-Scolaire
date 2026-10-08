"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ExternalLink, FileText, Search, X } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type RequestRow = {
  id: string
  attendance_id: string
  student_id: string
  establishment_id: string
  parent_user_id: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  reviewer_note: string | null
  created_at: string
  attachment_path: string | null
  attachment_name: string | null
  attendance?: {
    attendance_date: string
    status: string
    lesson_key: string | null
    class_id: string
    subject_id: string | null
  }
  student?: { first_name: string; last_name: string }
}

type EnrichedRequest = RequestRow & {
  className: string
  subjectName: string
  startsAt: string | null
  endsAt: string | null
}

export default function JustificationsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [rows, setRows] = useState<EnrichedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<EnrichedRequest | null>(null)
  const [reviewNote, setReviewNote] = useState("")

  const load = useCallback(async () => {
    if (!establishmentId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: requestError } = await supabaseBrowser
        .from("attendance_justification_requests")
        .select("id,attendance_id,student_id,establishment_id,parent_user_id,reason,status,reviewer_note,created_at,attachment_path,attachment_name")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false })
        .limit(300)
      if (requestError) throw requestError

      const requests = (data ?? []) as RequestRow[]
      const attendanceIds = [...new Set(requests.map((item) => item.attendance_id))]
      const studentIds = [...new Set(requests.map((item) => item.student_id))]
      const { data: attendance, error: attendanceError } = attendanceIds.length
        ? await supabaseBrowser.from("attendance_records").select("id,attendance_date,status,lesson_key,class_id,subject_id").in("id", attendanceIds)
        : { data: [], error: null }
      if (attendanceError) throw attendanceError

      const { data: students, error: studentsError } = studentIds.length
        ? await supabaseBrowser.from("students").select("id,first_name,last_name").in("id", studentIds)
        : { data: [], error: null }
      if (studentsError) throw studentsError

      const classIds = [...new Set((attendance ?? []).map((item) => item.class_id).filter(Boolean))]
      const subjectIds = [...new Set((attendance ?? []).map((item) => item.subject_id).filter(Boolean))]
      const lessonKeys = [...new Set((attendance ?? []).map((item) => item.lesson_key).filter(Boolean))]

      const [classesResult, subjectsResult, slotsResult] = await Promise.all([
        classIds.length ? supabaseBrowser.from("school_classes").select("id,name").in("id", classIds) : Promise.resolve({ data: [], error: null }),
        subjectIds.length ? supabaseBrowser.from("subjects").select("id,name").in("id", subjectIds) : Promise.resolve({ data: [], error: null }),
        lessonKeys.length ? supabaseBrowser.from("timetable_slots").select("id,starts_at,ends_at").in("id", lessonKeys) : Promise.resolve({ data: [], error: null }),
      ])
      if (classesResult.error) throw classesResult.error
      if (subjectsResult.error) throw subjectsResult.error
      if (slotsResult.error) throw slotsResult.error

      const attendanceMap = new Map((attendance ?? []).map((item) => [item.id, item]))
      const studentMap = new Map((students ?? []).map((item) => [item.id, item]))
      const classMap = new Map((classesResult.data ?? []).map((item) => [item.id, item.name]))
      const subjectMap = new Map((subjectsResult.data ?? []).map((item) => [item.id, item.name]))
      const slotMap = new Map((slotsResult.data ?? []).map((item) => [item.id, item]))

      setRows(requests.map((request) => {
        const item = attendanceMap.get(request.attendance_id)
        const student = studentMap.get(request.student_id)
        const slot = item?.lesson_key ? slotMap.get(item.lesson_key) : undefined
        return {
          ...request,
          attendance: item,
          student,
          className: item ? classMap.get(item.class_id) ?? "—" : "—",
          subjectName: item?.subject_id ? subjectMap.get(item.subject_id) ?? "—" : "—",
          startsAt: slot?.starts_at ?? null,
          endsAt: slot?.ends_at ?? null,
        }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les demandes de justification.")
    } finally {
      setLoading(false)
    }
  }, [establishmentId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const studentName = ((row.student?.last_name ?? "") + " " + (row.student?.first_name ?? "")).toLowerCase()
      return (status === "all" || row.status === status) && (!search || studentName.includes(search.toLowerCase()))
    })
  }, [rows, search, status])

  async function review(row: EnrichedRequest, nextStatus: "approved" | "rejected") {
    setBusyId(row.id)
    setError(null)
    try {
      const { error: reviewError } = await supabaseBrowser.rpc("review_attendance_justification", {
        p_request_id: row.id,
        p_status: nextStatus,
        p_reviewer_note: reviewNote.trim() || null,
      })
      if (reviewError) throw reviewError
      setSelected(null)
      setReviewNote("")
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de traiter la demande.")
    } finally {
      setBusyId(null)
    }
  }

  async function openAttachment(row: EnrichedRequest) {
    if (!row.attachment_path) return
    const { data, error: urlError } = await supabaseBrowser.storage
      .from("attendance-justifications")
      .createSignedUrl(row.attachment_path, 300)
    if (urlError) {
      setError(urlError.message)
      return
    }
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 border-b border-[#d9dce5] pb-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e3a8a]">Vie scolaire</p>
          <h1 className="text-2xl font-semibold text-[#131b2e]">Justifications</h1>
          <p className="mt-1 text-sm text-[#64748b]">Recevez, consultez et validez les justificatifs transmis par les parents.</p>
        </div>

        <div className="mb-5 border-y border-[#d9dce5] bg-white p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_280px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un élève..." className="h-10 w-full border border-[#c5c5d3] bg-white pl-9 pr-3 text-sm text-[#131b2e] outline-none focus:border-[#1e3a8a]" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 border border-[#c5c5d3] bg-white px-3 text-sm text-[#131b2e]">
              <option value="pending">À traiter</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Refusées</option>
              <option value="all">Toutes</option>
            </select>
            <div className="flex items-center justify-end text-sm text-[#64748b]">{filtered.length} demande(s)</div>
          </div>
        </div>

        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="border border-[#d9dce5] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-[#d9dce5] bg-[#f7f8fc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-5 py-3">Élève</th>
                  <th className="px-5 py-3">Cours</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Justification</th>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {filtered.map((row) => {
                  const name = ((row.student?.last_name ?? "") + " " + (row.student?.first_name ?? "")).trim() || "Élève"
                  return (
                    <tr key={row.id} className="hover:bg-[#faf8ff]">
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#131b2e]">{name}</p>
                        <p className="text-xs text-[#64748b]">{row.className}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#131b2e]">{row.subjectName}</p>
                        <p className="text-xs text-[#64748b]">{row.startsAt?.slice(0,5) ?? "—"} – {row.endsAt?.slice(0,5) ?? "—"}</p>
                      </td>
                      <td className="px-5 py-4 text-[#515f74]">{row.attendance?.attendance_date ? new Date(row.attendance.attendance_date + "T12:00:00").toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {row.attendance?.status === "late" ? "Retard" : row.attendance?.status === "absent" ? "Absent" : row.attendance?.status}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-5 py-4 text-[#515f74]">{row.reason}</td>
                      <td className="px-5 py-4">
                        {row.attachment_path
                          ? <button type="button" onClick={() => void openAttachment(row)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3a8a] hover:underline"><FileText className="h-4 w-4" />Voir</button>
                          : <span className="text-xs text-[#94a3b8]">Aucun</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {row.status === "pending"
                          ? <div className="flex justify-end gap-2">
                              <button type="button" disabled={busyId === row.id} onClick={() => { setSelected(row); setReviewNote("") }} className="inline-flex items-center gap-1.5 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Approuver</button>
                              <button type="button" disabled={busyId === row.id} onClick={() => { setSelected(row); setReviewNote("") }} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-3.5 w-3.5" />Refuser</button>
                            </div>
                          : <span className={"text-xs font-medium " + (row.status === "approved" ? "text-emerald-700" : "text-red-700")}>{row.status === "approved" ? "Approuvée" : "Refusée"}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && <div className="px-5 py-12 text-center text-sm text-[#64748b]">Aucune demande pour les filtres sélectionnés.</div>}
          {loading && <div className="px-5 py-12 text-center text-sm text-[#64748b]">Chargement des demandes…</div>}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/40 p-4">
          <div className="w-full max-w-lg border border-[#d9dce5] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#131b2e]">Traiter la justification</h2>
                <p className="mt-1 text-sm text-[#64748b]">Choisissez l'action à appliquer au statut de présence.</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-[#64748b]" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 border-y border-[#e5e7eb] py-4 text-sm">
              <p className="font-semibold text-[#131b2e]">{selected.student?.last_name} {selected.student?.first_name}</p>
              <p className="mt-1 text-[#64748b]">{selected.subjectName} · {selected.startsAt?.slice(0,5) ?? "—"} – {selected.endsAt?.slice(0,5) ?? "—"}</p>
              <p className="mt-3 text-[#515f74]">{selected.reason}</p>
              {selected.attachment_path && <button type="button" onClick={() => void openAttachment(selected)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1e3a8a]"><ExternalLink className="h-4 w-4" />Ouvrir le justificatif</button>}
            </div>
            <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Note de l'administration (facultatif)" className="mt-4 min-h-24 w-full border border-[#c5c5d3] p-3 text-sm text-[#131b2e] outline-none focus:border-[#1e3a8a]" />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="border border-[#c5c5d3] px-4 py-2 text-sm font-semibold text-[#515f74]">Annuler</button>
              <button type="button" disabled={busyId === selected.id} onClick={() => void review(selected, "rejected")} className="border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">{busyId === selected.id ? "Traitement…" : "Refuser"}</button>
              <button type="button" disabled={busyId === selected.id} onClick={() => void review(selected, "approved")} className="bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === selected.id ? "Traitement…" : "Approuver"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
