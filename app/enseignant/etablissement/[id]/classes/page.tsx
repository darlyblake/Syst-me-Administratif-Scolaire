"use client"

import { useEffect, useState } from "react"
import { ArrowRight, BookOpen, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherClass } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function TeacherClassesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [rows, setRows] = useState<TeacherClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) { router.replace("/enseignant"); return }
    if (!estEnCoursDeChargement && establishment) void enseignantPortalService.getClasses(id).then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger vos classes.")).finally(() => setLoading(false))
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>
  return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="today">
    <header className="border-b border-[#e4e6ef] pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Pédagogie</p><h1 className="mt-1 text-2xl font-bold">Mes classes</h1><p className="mt-1 text-sm text-[#6d7280]">Les classes et matières qui vous sont attribuées.</p></header>
    {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement…</p></div> :
      <div className="mt-5 overflow-hidden rounded-md border border-[#e1e3eb] bg-white"><div className="divide-y divide-[#eceef3]">{rows.map((row) => <div key={row.class_id + row.subject_id} className="flex items-center gap-3 px-4 py-4"><span className="rounded-md bg-[#eef1ff] p-2.5 text-[#2944a8]"><BookOpen className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{row.class_name}</p><p className="text-sm text-[#6d7280]">{row.subject_name}{row.weekly_hours != null ? " · " + row.weekly_hours + " h/sem." : ""}</p></div><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></div>)}{!rows.length && <p className="p-10 text-center text-sm text-[#6d7280]">Aucune classe ne vous est encore affectée.</p>}</div></div>}
  </TeacherShell>
}
