"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Search, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherClass, type TeacherStudent } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function TeacherClassesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [rows, setRows] = useState<TeacherClass[]>([])
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) { router.replace("/enseignant"); return }
    if (!estEnCoursDeChargement && establishment) {
      Promise.all([enseignantPortalService.getClasses(id), enseignantPortalService.getStudents(id)])
        .then(([classes, students]) => { setRows(classes); setStudents(students) })
        .catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger vos classes."))
        .finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const classOptions = useMemo(() => {
    const map = new Map<string, TeacherClass>()
    rows.forEach((row) => { if (!map.has(row.class_id)) map.set(row.class_id, row) })
    return Array.from(map.values())
  }, [rows])

  const selectedClass = classOptions.find((item) => item.class_id === selectedClassId) ?? null
  const selectedStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((student) => student.class_id === selectedClassId && (!q || (student.first_name + " " + student.last_name + " " + (student.student_number ?? "")).toLowerCase().includes(q)))
  }, [students, selectedClassId, search])

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="today">
    <header className="border-b border-[#e4e6ef] pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Pédagogie</p>
      <h1 className="mt-1 text-2xl font-bold">Mes classes</h1>
      <p className="mt-1 text-sm text-[#6d7280]">Vos classes attribuées et les élèves associés.</p>
    </header>

    {error && <div className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement…</p></div> : selectedClass ? (
      <>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e4eb] pb-3">
          <div><button type="button" onClick={() => { setSelectedClassId(null); setSearch("") }} className="mb-2 inline-flex items-center gap-2 text-sm text-[#6d7280] hover:text-[#172033]"><ArrowLeft className="h-4 w-4" /> Toutes les classes</button><h2 className="text-xl font-bold">{selectedClass.class_name}</h2><p className="text-sm text-[#6d7280]">Élèves de cette classe</p></div>
          <span className="text-sm text-[#6d7280]">{selectedStudents.length} élève{selectedStudents.length > 1 ? "s" : ""}</span>
        </div>
        <div className="mt-4 max-w-md relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a90a0]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève…" className="h-10 w-full border border-[#dfe2ec] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#7890ef]" /></div>
        <div className="mt-4 overflow-x-auto border border-[#e1e3eb] bg-white">
          <table className="min-w-[650px] w-full text-sm">
            <thead className="border-b bg-[#f7f8fa] text-left text-[#555e73]"><tr><th className="px-4 py-3 font-medium">Élève</th><th className="px-4 py-3 font-medium">Matricule</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
            <tbody className="divide-y divide-[#eceef3]">
              {selectedStudents.map((student) => <tr key={student.student_id} className="hover:bg-[#fafbfc]"><td className="px-4 py-3 font-semibold">{student.last_name} {student.first_name}</td><td className="px-4 py-3 text-[#6d7280]">{student.student_number || "—"}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/classe/" + student.class_id)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#2441a5]">Voir <ArrowRight className="h-4 w-4" /></button></td></tr>)}
              {!selectedStudents.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-[#6d7280]">Aucun élève dans cette classe.</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    ) : (
      <div className="mt-5 overflow-hidden border border-[#e1e3eb] bg-white">
        <div className="border-b bg-[#f7f8fa] px-4 py-3 text-sm font-medium text-[#555e73]">Classes attribuées</div>
        <div className="divide-y divide-[#eceef3]">
          {classOptions.map((row) => {
            const count = students.filter((student) => student.class_id === row.class_id).length
            const subjects = rows.filter((item) => item.class_id === row.class_id).map((item) => item.subject_name).filter((value, index, list) => list.indexOf(value) === index)
            return <button key={row.class_id} type="button" onClick={() => setSelectedClassId(row.class_id)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-[#fafbfc]"><span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><BookOpen className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{row.class_name}</span><span className="block text-sm text-[#6d7280]">{subjects.join(", ") || "Matière non précisée"} · {count} élève{count > 1 ? "s" : ""}</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></button>
          })}
          {!classOptions.length && <p className="p-10 text-center text-sm text-[#6d7280]">Aucune classe ne vous est encore affectée.</p>}
        </div>
      </div>
    )}
  </TeacherShell>
}
