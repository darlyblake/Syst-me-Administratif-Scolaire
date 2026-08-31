"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherAttendanceStudent, type TeacherClass } from "@/services/enseignant-portal.service"

const statuses = [
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "En retard" },
  { value: "excused", label: "Excusé" },
] as const

export default function PresencesEnseignantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [classId, setClassId] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [students, setStudents] = useState<TeacherAttendanceStudent[]>([])
  const [statusesByStudent, setStatusesByStudent] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) router.replace("/enseignant")
  }, [estEnCoursDeChargement, utilisateur, establishment, router])

  useEffect(() => {
    if (!id || !establishment) return
    enseignantPortalService.getClasses(id).then((rows) => {
      setClasses(rows)
      if (!classId && rows[0]) setClassId(rows[0].class_id)
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Impossible de charger vos classes."))
  }, [id, establishment, classId])

  useEffect(() => {
    if (!classId || !date || !id) return
    setLoading(true); setMessage(null)
    enseignantPortalService.getAttendance(id, classId, date).then((rows) => {
      setStudents(rows)
      setStatusesByStudent(Object.fromEntries(rows.map((row) => [row.student_id, row.status ?? "present"])))
      setReasons(Object.fromEntries(rows.map((row) => [row.student_id, row.reason ?? ""])))
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Impossible de charger les présences.")).finally(() => setLoading(false))
  }, [classId, date, id])

  const save = async (student: TeacherAttendanceStudent) => {
    setSaving(student.student_id); setMessage(null)
    try {
      await enseignantPortalService.recordAttendance(id, student.student_id, classId, date, statusesByStudent[student.student_id] ?? "present", reasons[student.student_id])
      setStudents((current) => current.map((row) => row.student_id === student.student_id ? { ...row, status: statusesByStudent[student.student_id] ?? "present", reason: reasons[student.student_id] || null } : row))
      setMessage("Présence enregistrée.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible.") }
    finally { setSaving(null) }
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return <main className="min-h-screen bg-creme"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
    <header className="mb-6"><Button variant="ghost" size="sm" onClick={() => router.push(`/enseignant/etablissement/${id}`)}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button><h1 className="mt-3 text-2xl font-semibold">Présences</h1><p className="text-sm text-muted-foreground">{establishment.name} · uniquement vos classes</p></header>
    <Card className="mb-5"><CardHeader><CardTitle className="text-base">Choisir une classe et une date</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Classe<select className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Sélectionner…</option>{Array.from(new Map(classes.map((item) => [item.class_id, item]))).map(([value, item]) => <option key={value} value={value}>{item.class_name}</option>)}</select></label><label className="text-sm font-medium">Date<input type="date" className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={date} onChange={(event) => setDate(event.target.value)} /></label></CardContent></Card>
    {message && <div className="mb-5 rounded-lg border bg-white p-3 text-sm">{message}</div>}
    <Card><CardContent className="p-0">{!classId ? <p className="p-8 text-center text-sm text-muted-foreground">Sélectionnez une classe pour commencer l'appel.</p> : loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3">Motif</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{students.map((student) => <tr key={student.student_id}><td className="px-5 py-3 font-medium">{student.last_name} {student.first_name}</td><td className="px-5 py-3"><select className="h-9 rounded-md border bg-background px-2" value={statusesByStudent[student.student_id] ?? "present"} onChange={(event) => setStatusesByStudent((current) => ({ ...current, [student.student_id]: event.target.value }))}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td><td className="px-5 py-3"><input className="h-9 w-full rounded-md border bg-background px-3" value={reasons[student.student_id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [student.student_id]: event.target.value }))} placeholder="Facultatif" /></td><td className="px-5 py-3 text-right"><Button size="sm" onClick={() => void save(student)} disabled={saving === student.student_id}><Save className="mr-2 h-4 w-4" />{saving === student.student_id ? "…" : "Enregistrer"}</Button></td></tr>)}</tbody></table>{students.length === 0 && !loading && <p className="p-8 text-center text-sm text-muted-foreground">Aucun élève dans cette classe.</p>}</div>}</CardContent></Card>
  </div></main>
}
