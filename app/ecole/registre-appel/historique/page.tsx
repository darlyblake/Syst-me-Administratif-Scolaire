"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Pencil, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { listTeacherClassSubjects } from "@/lib/supabase/services/absence.service"
import {
  listAttendanceHistoryPaginated,
  updateAbsence,
  type AttendanceHistory,
} from "@/lib/supabase/services/absence.service"

type Status = "present" | "absent" | "late" | "justified" | "excused"

const labels: Record<Status, string> = {
  present: "Présent",
  absent: "Absent",
  late: "Retard",
  justified: "Justifié",
  excused: "Excusé",
}

const classes: Record<Status, string> = {
  present: "text-green-700 bg-green-50 border-green-200",
  absent: "text-red-700 bg-red-50 border-red-200",
  late: "text-amber-700 bg-amber-50 border-amber-200",
  justified: "text-blue-700 bg-blue-50 border-blue-200",
  excused: "text-blue-700 bg-blue-50 border-blue-200",
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function HistoriqueAppelPage() {
  const { primaryEstablishment, utilisateur } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const permissions = primaryEstablishment?.permissions ?? []
  const role = primaryEstablishment?.role ?? ""
  const isTeacher = utilisateur?.role === "enseignant"
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([])

  const canCorrect =
    permissions.includes("attendance.correct") ||
    ["owner", "admin", "director"].includes(role)

  const { data: academicStructure } = useAcademicStructure(establishmentId)

  useEffect(() => {
    if (!isTeacher || !establishmentId) return
    let active = true
    void listTeacherClassSubjects(establishmentId).then((items) => {
      if (active) setTeacherClassIds([...new Set(items.map((item) => item.class_id))])
    }).catch(() => {
      if (active) setTeacherClassIds([])
    })
    return () => { active = false }
  }, [establishmentId, isTeacher])

  const classOptions = useMemo(
    () =>
      academicStructure.flatMap((cycle) =>
        (cycle.grade_levels ?? []).flatMap((level) =>
          (level.school_classes ?? [])
            .filter((schoolClass) => !isTeacher || teacherClassIds.includes(schoolClass.id))
            .map((schoolClass) => ({
              id: schoolClass.id,
              name: schoolClass.name,
            }))
        )
      ),
    [academicStructure, isTeacher, teacherClassIds]
  )

  const [classId, setClassId] = useState("")
  useEffect(() => {
    if (isTeacher && !classId && classOptions.length) setClassId(classOptions[0].id)
  }, [classId, classOptions, isTeacher])

  const [from, setFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  })
  const [to, setTo] = useState(today)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AttendanceHistory[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AttendanceHistory | null>(null)
  const [editStatus, setEditStatus] = useState<Status>("present")
  const [editReason, setEditReason] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!establishmentId) return

    try {
      setLoading(true)
      setError(null)
      const result = await listAttendanceHistoryPaginated({
        establishmentId,
        page,
        pageSize: 100,
        classId: classId || null,
        from: from || undefined,
        to: to || undefined,
      })
      setRows(result.data ?? [])
      setTotalPages(Math.max(1, result.total_pages ?? 1))
      setTotal(result.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'historique.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [classId, establishmentId, from, page, to])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return rows
    return rows.filter((row) =>
      `${row.first_name ?? ""} ${row.last_name ?? ""} ${row.student_id}`.toLowerCase().includes(value)
    )
  }, [rows, search])

  const groupedCalls = useMemo(() => {
    const groups = new Map<string, {
      key: string
      date: string
      className: string
      subjectName: string
      teacherName: string
      startsAt: string | null
      endsAt: string | null
      students: AttendanceHistory[]
    }>()
    for (const row of rows) {
      const slot = row.timetable_slot_id ?? row.subject_id ?? "sans-cours"
      const key = [row.attendance_date, row.class_id, slot].join("|")
      const group = groups.get(key) ?? {
        key,
        date: row.attendance_date,
        className: row.class_name ?? classOptions.find((item) => item.id === row.class_id)?.name ?? "Classe non renseignée",
        subjectName: row.subject_name ?? "Matière non renseignée",
        teacherName: [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(" ") || "Enseignant non renseigné",
        startsAt: row.starts_at ?? null,
        endsAt: row.ends_at ?? null,
        students: [],
      }
      group.students.push(row)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || a.className.localeCompare(b.className))
  }, [classOptions, rows])

  const openEdit = (row: AttendanceHistory) => {
    setEditing(row)
    setEditStatus((row.status as Status) === "excused" ? "justified" : (row.status as Status))
    setEditReason(row.reason ?? "")
    setMessage(null)
    setError(null)
  }

  const saveCorrection = async () => {
    if (!editing) return

    const reason = editReason.trim()
    if (!reason) {
      setError("Le motif est obligatoire pour toute correction.")
      return
    }

    try {
      setSavingId(editing.id)
      setError(null)
      setMessage(null)
      await updateAbsence(editing.id, {
        status: editStatus,
        reason,
      })
      setEditing(null)
      setMessage("Présence corrigée.")
      await loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de corriger cette présence.")
    } finally {
      setSavingId(null)
    }
  }

  const selectedClassName = classOptions.find((item) => item.id === classId)?.name

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ecole/registre-appel">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Registre d'appel
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Historique des présences</h1>
              <p className="text-sm text-slate-500">Consultez les appels enregistrés et corrigez uniquement les présences autorisées.</p>
            </div>
          </div>
        </div>

        <section className="mb-5 border-b pb-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Classe</label>
              <Select value={classId || "all"} onValueChange={(value) => { setClassId(value === "all" ? "" : value); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Du</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Au</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou matricule" />
              </div>
            </div>
          </div>
        </section>

        {message && <div className="mb-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}

        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Appels effectués</h2>
              <p className="text-sm text-slate-500">Un récapitulatif par date, classe et cours.</p>
            </div>
            <span className="text-sm text-slate-500">{groupedCalls.length} appel(s) dans les résultats chargés</span>
          </div>
          {loading ? (
            <div className="border px-4 py-6 text-center text-sm text-slate-500">Chargement des appels…</div>
          ) : groupedCalls.length === 0 ? (
            <div className="border px-4 py-6 text-sm text-slate-500">Aucun appel effectué pour cette classe et cette période.</div>
          ) : (
            <div className="space-y-2">
              {groupedCalls.map((call) => {
                const counts = call.students.reduce((acc, student) => {
                  const status = student.status in labels ? student.status as Status : "present"
                  acc[status] += 1
                  return acc
                }, { present: 0, absent: 0, late: 0, justified: 0, excused: 0 })
                return (
                  <details key={call.key} className="group border bg-white">
                    <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="font-semibold">{new Date(call.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                        <p className="text-sm text-slate-600">{call.className} · {call.subjectName}</p>
                        <p className="text-xs text-slate-500">{call.startsAt && call.endsAt ? `${call.startsAt.slice(0,5)} – ${call.endsAt.slice(0,5)} · ` : ""}{call.teacherName}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="border px-2 py-1">{call.students.length} élèves</span>
                        <span className="bg-green-50 px-2 py-1 text-green-800">{counts.present} présents</span>
                        <span className="bg-red-50 px-2 py-1 text-red-800">{counts.absent} absents</span>
                        <span className="bg-amber-50 px-2 py-1 text-amber-800">{counts.late} retards</span>
                        <span className="text-blue-700">Voir le détail⌄</span>
                      </div>
                    </summary>
                    <div className="border-t bg-slate-50 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {call.students.map((student) => {
                          const status = (student.status in labels ? student.status : "present") as Status
                          return (
                            <div key={student.id} className="flex min-w-0 items-center justify-between gap-2 border bg-white p-2 text-sm">
                              <span className="min-w-0 truncate">{student.last_name ?? ""} {student.first_name ?? ""}</span>
                              <span className={`shrink-0 border px-2 py-0.5 text-xs ${classes[status]}`}>{labels[status]}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>
        {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
          <span>{selectedClassName ? `${selectedClassName} · ` : ""}{total} enregistrement(s)</span>
          {!canCorrect && <span>Consultation uniquement</span>}
        </div>

        {loading ? (
          <div className="border px-6 py-12 text-center text-sm text-slate-500">Chargement de l'historique…</div>
        ) : filteredRows.length === 0 ? (
          <div className="border px-6 py-12 text-center">
            <p className="font-medium">Aucun enregistrement</p>
            <p className="mt-1 text-sm text-slate-500">Modifiez la période ou la classe sélectionnée.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3 lg:hidden">
            {filteredRows.map((row) => {
              const status = (row.status in labels ? row.status : "present") as Status
              return (
                <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{new Date(row.attendance_date + "T12:00:00").toLocaleDateString("fr-FR")}</p>
                      <h3 className="mt-1 break-words font-semibold">{row.last_name ?? "—"} {row.first_name ?? ""}</h3>
                      <p className="text-xs text-slate-500">{row.class_name ?? classOptions.find((item) => item.id === row.class_id)?.name ?? "Classe non renseignée"}</p>
                    </div>
                    <span className={`shrink-0 border px-2 py-1 text-xs font-medium ${classes[status]}`}>{labels[status]}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Matière</dt><dd className="break-words">{row.subject_name ?? "—"}</dd></div>
                    <div><dt className="text-xs text-slate-500">Horaire</dt><dd>{row.starts_at && row.ends_at ? `${row.starts_at.slice(0,5)} – ${row.ends_at.slice(0,5)}` : "—"}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-slate-500">Enseignant</dt><dd>{row.teacher_last_name || row.teacher_first_name ? `${row.teacher_last_name ?? ""} ${row.teacher_first_name ?? ""}`.trim() : "—"}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-slate-500">Motif de l'absence / retard</dt><dd className="break-words">{row.reason || "Aucun motif renseigné"}</dd></div>
                  </dl>
                  {canCorrect && <div className="mt-3 border-t pt-3"><Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(row)} disabled={savingId === row.id}><Pencil className="mr-2 h-4 w-4" />Corriger cette présence</Button></div>}
                </article>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto border lg:block">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Date</th>
                  <th className="px-3 py-3 text-left font-medium">Élève</th>
                  <th className="px-3 py-3 text-left font-medium">Classe</th>
                  <th className="px-3 py-3 text-left font-medium">Cours</th>
                  <th className="px-3 py-3 text-left font-medium">Horaire</th>
                  <th className="px-3 py-3 text-left font-medium">Enseignant</th>
                  <th className="px-3 py-3 text-left font-medium">Statut</th>
                  <th className="px-3 py-3 text-left font-medium">Motif</th>
                  {canCorrect && <th className="px-3 py-3 text-right font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const status = (row.status in labels ? row.status : "present") as Status
                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3">{new Date(row.attendance_date + "T12:00:00").toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-3 font-medium">{row.last_name ?? "—"} {row.first_name ?? ""}</td>
                      <td className="px-3 py-3">{row.class_name ?? classOptions.find((item) => item.id === row.class_id)?.name ?? row.class_id}</td>
                      <td className="px-3 py-3">{row.subject_name ?? "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{row.starts_at && row.ends_at ? `${row.starts_at.slice(0,5)} – ${row.ends_at.slice(0,5)}` : "—"}</td>
                      <td className="px-3 py-3">{row.teacher_last_name || row.teacher_first_name ? `${row.teacher_last_name ?? ""} ${row.teacher_first_name ?? ""}`.trim() : "—"}</td>
                      <td className="px-3 py-3"><span className={`inline-flex border px-2 py-1 text-xs font-medium ${classes[status]}`}>{labels[status]}</span></td>
                      <td className="px-3 py-3 text-slate-600">{row.reason || "—"}</td>
                      {canCorrect && (
                        <td className="px-3 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)} disabled={savingId === row.id}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifier
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
          <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
        </div>

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md border bg-white p-5 shadow-xl">
              <div className="mb-4">
                <h2 className="font-semibold">Corriger la présence</h2>
                <p className="text-sm text-slate-500">
                  {editing.last_name ?? ""} {editing.first_name ?? ""} · {new Date(editing.attendance_date + "T12:00:00").toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Statut</label>
                  <Select value={editStatus} onValueChange={(value) => setEditStatus(value as Status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Présent</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Retard</SelectItem>
                      <SelectItem value="justified">Justifié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Motif <span className="text-red-600">*</span></label>
                  <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Pourquoi cette présence est corrigée ?" />
                  <p className="mt-1 text-xs text-slate-500">Cette correction sera enregistrée dans l'historique avec votre identité, l'ancien statut et le nouveau.</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={!!savingId}>Annuler</Button>
                <Button onClick={saveCorrection} disabled={!!savingId || !editReason.trim()}>
                  <Check className="mr-2 h-4 w-4" />
                  {savingId ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
