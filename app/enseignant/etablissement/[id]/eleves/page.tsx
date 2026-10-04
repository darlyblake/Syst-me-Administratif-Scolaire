"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Loader2, Search, Users } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherStudent } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function TeacherStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [rows, setRows] = useState<TeacherStudent[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) { router.replace("/enseignant"); return }
    if (!estEnCoursDeChargement && establishment) void enseignantPortalService.getStudents(id).then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger vos élèves.")).finally(() => setLoading(false))
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return q ? rows.filter((r) => (r.first_name + " " + r.last_name + " " + (r.student_number ?? "") + " " + r.class_name).toLowerCase().includes(q)) : rows }, [rows, search])
  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>
  return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="today">
    <header className="border-b border-[#e4e6ef] pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Pédagogie</p><h1 className="mt-1 text-2xl font-bold">Mes élèves</h1><p className="mt-1 text-sm text-[#6d7280]">Uniquement les élèves des classes qui vous sont attribuées.</p></header>
    <div className="mt-5 relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a90a0]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève…" className="h-10 w-full rounded-md border border-[#dfe2ec] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#7890ef]" /></div>
    {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement…</p></div> :
      <div className="mt-4 overflow-hidden rounded-lg border border-[#e1e3eb] bg-white"><div className="divide-y divide-[#eceef3]">{filtered.map((row) => <div key={row.student_id + row.class_id} className="flex items-center gap-3 px-4 py-4"><span className="rounded-full bg-[#eef1ff] p-2.5 text-[#2944a8]"><Users className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{row.last_name} {row.first_name}</p><p className="text-sm text-[#6d7280]">{row.class_name}{row.student_number ? " · " + row.student_number : ""}</p></div><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></div>)}{!filtered.length && <p className="p-10 text-center text-sm text-[#6d7280]">{search ? "Aucun élève ne correspond à votre recherche." : "Aucun élève dans vos classes."}</p>}</div></div>}
  </TeacherShell>
}
