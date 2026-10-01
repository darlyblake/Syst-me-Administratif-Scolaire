"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Users, Clock3, UserX, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { supabaseBrowser } from "@/lib/supabase/client"

type Summary = {
  total_records: number
  present: number
  absent: number
  late: number
  justified: number
  attendance_rate: number
}

type StudentRow = {
  student_id: string
  first_name: string | null
  last_name: string | null
  student_number: string | null
  class_id: string
  class_name: string
  total_records: number
  present: number
  absent: number
  late: number
  justified: number
  attendance_rate: number
}

type SubjectRow = {
  subject_id: string
  subject_name: string
  total_records: number
  present: number
  absent: number
  late: number
  justified: number
  attendance_rate: number
}

type ReportData = {
  period: { from: string; to: string }
  summary: Summary
  students: StudentRow[]
  subjects: SubjectRow[]
}

const localDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function RapportsAssiduitePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
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
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
  })
  const [to, setTo] = useState(localDate)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!establishmentId) return
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabaseBrowser.rpc("get_attendance_report_data", {
      p_establishment_id: establishmentId,
      p_from: from,
      p_to: to,
      p_class_id: classId || null,
      p_student_id: null,
    })

    if (rpcError) {
      setError(rpcError.message)
      setReport(null)
    } else {
      setReport(data as ReportData)
    }

    setLoading(false)
  }, [classId, establishmentId, from, to])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const summary = report?.summary

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ecole/registre-appel/historique">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Historique
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Rapport d’assiduité</h1>
              <p className="text-sm text-slate-500">Données préparées pour les futurs bulletins et rapports scolaires.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileText className="h-4 w-4" />
            Base de données
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Classe</label>
            <Select value={classId || "all"} onValueChange={(v) => setClassId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Du</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Au</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void loadReport()} disabled={loading || !establishmentId}>
              {loading ? "Chargement…" : "Actualiser"}
            </Button>
          </div>
        </section>

        {error && <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        {loading && !report ? (
          <div className="border px-6 py-12 text-center text-sm text-slate-500">Chargement du rapport…</div>
        ) : report ? (
          <>
            <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="border p-4"><Users className="mb-2 h-5 w-5 text-slate-500" /><p className="text-xs text-slate-500">Appels enregistrés</p><p className="mt-1 text-2xl font-semibold">{summary?.total_records ?? 0}</p></div>
              <div className="border p-4"><CheckCircle2 className="mb-2 h-5 w-5 text-green-600" /><p className="text-xs text-slate-500">Présences</p><p className="mt-1 text-2xl font-semibold">{summary?.present ?? 0}</p></div>
              <div className="border p-4"><UserX className="mb-2 h-5 w-5 text-red-600" /><p className="text-xs text-slate-500">Absences</p><p className="mt-1 text-2xl font-semibold">{summary?.absent ?? 0}</p></div>
              <div className="border p-4"><Clock3 className="mb-2 h-5 w-5 text-amber-600" /><p className="text-xs text-slate-500">Retards</p><p className="mt-1 text-2xl font-semibold">{summary?.late ?? 0}</p></div>
              <div className="border p-4 col-span-2 md:col-span-1"><p className="text-xs text-slate-500">Taux d’assiduité</p><p className="mt-1 text-2xl font-semibold">{Number(summary?.attendance_rate ?? 0).toFixed(2)} %</p><p className="mt-1 text-xs text-slate-500">Présent, retard ou absence justifiée</p></div>
            </section>

            <section className="mb-6 border">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">Assiduité par élève</h2>
                <p className="text-sm text-slate-500">{report.students.length} élève(s) sur la période sélectionnée.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Élève</th>
                      <th className="px-3 py-3 text-left font-medium">Classe</th>
                      <th className="px-3 py-3 text-right font-medium">Appels</th>
                      <th className="px-3 py-3 text-right font-medium">Prés.</th>
                      <th className="px-3 py-3 text-right font-medium">Abs.</th>
                      <th className="px-3 py-3 text-right font-medium">Ret.</th>
                      <th className="px-3 py-3 text-right font-medium">Just.</th>
                      <th className="px-3 py-3 text-right font-medium">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((student) => (
                      <tr key={student.student_id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium">{student.last_name ?? ""} {student.first_name ?? ""}<span className="ml-2 text-xs text-slate-400">{student.student_number ?? ""}</span></td>
                        <td className="px-3 py-3">{student.class_name}</td>
                        <td className="px-3 py-3 text-right">{student.total_records}</td>
                        <td className="px-3 py-3 text-right">{student.present}</td>
                        <td className="px-3 py-3 text-right">{student.absent}</td>
                        <td className="px-3 py-3 text-right">{student.late}</td>
                        <td className="px-3 py-3 text-right">{student.justified}</td>
                        <td className="px-3 py-3 text-right font-semibold">{Number(student.attendance_rate).toFixed(2)} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border">
              <div className="border-b px-4 py-3">
                <h2 className="font-semibold">Assiduité par matière</h2>
                <p className="text-sm text-slate-500">Cette synthèse servira aux futurs rapports et bulletins.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[750px] w-full text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Matière</th>
                      <th className="px-3 py-3 text-right font-medium">Appels</th>
                      <th className="px-3 py-3 text-right font-medium">Prés.</th>
                      <th className="px-3 py-3 text-right font-medium">Abs.</th>
                      <th className="px-3 py-3 text-right font-medium">Ret.</th>
                      <th className="px-3 py-3 text-right font-medium">Just.</th>
                      <th className="px-3 py-3 text-right font-medium">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.subjects.map((subject) => (
                      <tr key={subject.subject_id} className="border-b last:border-0">
                        <td className="px-3 py-3 font-medium">{subject.subject_name}</td>
                        <td className="px-3 py-3 text-right">{subject.total_records}</td>
                        <td className="px-3 py-3 text-right">{subject.present}</td>
                        <td className="px-3 py-3 text-right">{subject.absent}</td>
                        <td className="px-3 py-3 text-right">{subject.late}</td>
                        <td className="px-3 py-3 text-right">{subject.justified}</td>
                        <td className="px-3 py-3 text-right font-semibold">{Number(subject.attendance_rate).toFixed(2)} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
