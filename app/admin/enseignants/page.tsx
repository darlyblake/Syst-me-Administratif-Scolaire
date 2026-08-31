"use client"

import Link from "next/link"
import { BookOpen, Building2, Search, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminEstablishments, type AdminEstablishment } from "@/lib/supabase/services/admin.service"
import { listStaffPaginated } from "@/lib/supabase/services/staff.service"

type Teacher = { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; position?: string | null; establishment: string }

export default function Page() {
  const [schools, setSchools] = useState<AdminEstablishment[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const establishments = await getAdminEstablishments()
      setSchools(establishments)
      const results = await Promise.all(establishments.map(async school => {
        try {
          const page = await listStaffPaginated(school.id, 1, 100, "", true)
          return page.items.filter((staff: any) => staff.role === "enseignant" || staff.role === "teacher").map((staff: any) => ({ ...staff, establishment: school.name }))
        } catch { return [] }
      }))
      setTeachers(results.flat())
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les enseignants.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => teachers.filter(t => `${t.first_name ?? ""} ${t.last_name ?? ""} ${t.email ?? ""} ${t.establishment}`.toLowerCase().includes(q.trim().toLowerCase())), [teachers, q])

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-primary">Gestion du personnel pédagogique</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Enseignants</h1><p className="mt-1 text-muted-foreground">Vue globale des enseignants rattachés aux établissements de NOVA.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Card><CardContent className="p-5"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Enseignants</p><p className="text-2xl font-bold">{teachers.length}</p></div></div></CardContent></Card><Card><CardContent className="p-5"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Établissements</p><p className="text-2xl font-bold">{schools.length}</p></div></div></CardContent></Card><Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Non filtrés</p><p className="text-2xl font-bold">{filtered.length}</p></div></div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Annuaire des enseignants</CardTitle><div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Rechercher un enseignant ou un établissement…" value={q} onChange={e=>setQ(e.target.value)}/></div></CardHeader><CardContent className="p-0">{loading ? <p className="p-10 text-center text-sm text-muted-foreground">Chargement des enseignants…</p> : error ? <div className="p-10 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={()=>void load()}>Réessayer</Button></div> : filtered.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Aucun enseignant trouvé.</div> : <div className="divide-y">{filtered.map(t=><div key={`${t.establishment}-${t.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{`${t.first_name?.[0] ?? ""}${t.last_name?.[0] ?? ""}`.toUpperCase() || "E"}</div><div><p className="font-medium">{[t.first_name,t.last_name].filter(Boolean).join(" ") || "Enseignant"}</p><p className="text-xs text-muted-foreground">{t.email || "E-mail non disponible"}</p></div></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="rounded-full bg-muted px-3 py-1">{t.position || "Enseignant"}</span><Link href="/admin/etablissements"><span className="rounded-full border px-3 py-1">{t.establishment}</span></Link></div></div>)}</div>}</CardContent></Card>
  </div>
}
