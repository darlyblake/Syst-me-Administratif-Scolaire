"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Pencil, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
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

  const canCorrect =
    permissions.includes("attendance.correct") ||
    ["owner", "admin", "director"].includes(role)

  const { data: academicStructure } = useAcademicStructure(establishmentId)

  const classOptions = useMemo(
    () =>
      academicStructure.flatMap((cycle) =>
        (cycle.grade_levels ?? []).flatMap((level) =>
          (level.school_classes ?? []).map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name,
          }))
        )
      ),
    [academicStructure]
  )

  const [classId, setClassId] = useState("")
  const [from, setFrom] = useState(today)
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
        pageSize: 25,
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

  const openEdit = (row: AttendanceHistory) => {
    setEditing(row)
    setEditStatus((row.status as Status) === "excused" ? "justified" : (row.status as Status))
    setEditReason(row.reason ?? "")
    setMessage(null)
    setError(null)
  }

  const saveCorrection = async () => {
    if (!editing) return

    try {
      setSavingId(editing.id)
      setError(null)
      setMessage(null)
      await updateAbsence(editing.id, {
        status: editStatus,
        reason: editReason,
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
          <div className="overflow-x-auto border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Date</th>
                  <th className="px-3 py-3 text-left font-medium">Élève</th>
                  <th className="px-3 py-3 text-left font-medium">Classe</th>
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
                      <td className="px-3 py-3">{classOptions.find((item) => item.id === row.class_id)?.name ?? row.class_id}</td>
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
                  <label className="mb-1.5 block text-sm font-medium">Motif</label>
                  <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Motif de la correction" />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={!!savingId}>Annuler</Button>
                <Button onClick={saveCorrection} disabled={!!savingId}>
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
