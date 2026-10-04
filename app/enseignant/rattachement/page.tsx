"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, Clock3, Loader2, LogOut, Search, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Establishment = { id: string; name: string; short_name: string | null; city: string | null; code: string | null }
type RequestRow = { id: string; establishment_id: string; status: string; created_at: string; establishment?: Establishment | null }

export default function TeacherAttachmentPage() {
  const router = useRouter()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/connexion?espace=enseignant"); return }

    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle()

    if (teacherError || !teacher) {
      setError("Votre profil enseignant n'est pas encore disponible. Reconnectez-vous après la confirmation de votre compte.")
      setLoading(false)
      return
    }

    setTeacherId(teacher.id)

    const [{ data: schools, error: schoolsError }, { data: pending, error: requestsError }] = await Promise.all([
      supabase.rpc("list_active_establishments_for_teacher"),
      supabase.from("teacher_establishment_requests").select("id,establishment_id,status,created_at,establishment:establishments(id,name,short_name,city,code)").eq("teacher_id", teacher.id).order("created_at", { ascending: false }),
    ])

    if (schoolsError) setError("Impossible de charger les établissements.")
    else setEstablishments((schools ?? []) as Establishment[])
    if (!requestsError) setRequests((pending ?? []) as RequestRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const requestedBySchool = useMemo(() => new Map(requests.map(request => [request.establishment_id, request])), [requests])
  const filtered = establishments.filter(item => {
    const q = search.trim().toLowerCase()
    return !q || [item.name, item.short_name, item.city, item.code].filter(Boolean).some(value => String(value).toLowerCase().includes(q))
  })

  async function requestAttachment(establishmentId: string) {
    if (!teacherId) return
    setSending(establishmentId)
    setError("")
    const { error: requestError } = await supabase.rpc("teacher_request_establishment", {
      p_establishment_id: establishmentId,
      p_teacher_id: teacherId,
    })
    if (requestError) setError(requestError.message)
    else await load()
    setSending(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace("/connexion?espace=enseignant")
  }

  return (
    <main className="min-h-screen bg-[#f8f8fc] text-[#172033]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 border-b border-[#e4e6ef] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#6d7280]">Espace enseignant</p>
            <h1 className="text-2xl font-semibold tracking-tight">Choisir mon établissement</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#555e73]">Demandez votre rattachement. L'établissement devra accepter votre demande avant que vous puissiez accéder à ses données.</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#e1e3eb] px-3 py-2 text-sm hover:bg-[#fafaff]"><LogOut className="h-4 w-4" /> Se déconnecter</button>
        </header>

        <section className="mt-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une école, une ville ou un code" className="h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none focus:border-[#7890ef]" />
          </div>

          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-md border">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="border-b bg-[#f7f8fa] text-left text-slate-600">
                  <tr><th className="px-4 py-3 font-medium">Établissement</th><th className="px-4 py-3 font-medium">Ville</th><th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 text-right font-medium">Action</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(school => {
                    const request = requestedBySchool.get(school.id)
                    const pending = request?.status === "pending"
                    const approved = request?.status === "approved"
                    return (
                      <tr key={school.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><Building2 className="h-4 w-4 text-slate-500" /><div><div className="font-medium">{school.name}</div>{school.short_name && <div className="text-xs text-slate-500">{school.short_name}</div>}</div></div></td>
                        <td className="px-4 py-3">{school.city || "—"}</td>
                        <td className="px-4 py-3">{school.code || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {approved ? <span className="inline-flex items-center gap-1 text-[#277047]"><CheckCircle2 className="h-4 w-4" /> Rattaché</span> :
                           pending ? <span className="inline-flex items-center gap-1 text-[#9a6500]"><Clock3 className="h-4 w-4" /> En attente</span> :
                           <button disabled={sending === school.id} onClick={() => void requestAttachment(school.id)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-medium hover:bg-slate-50 disabled:opacity-50">{sending === school.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Demander</button>}
                        </td>
                      </tr>
                    )
                  })}
                  {!filtered.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Aucun établissement trouvé.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
