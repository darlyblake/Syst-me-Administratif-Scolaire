"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, CheckCircle2, Mail, Search, UserCog, Users, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAdminEstablishments, type AdminEstablishment } from "@/lib/supabase/services/admin.service"
import { listStaffPaginated } from "@/lib/supabase/services/staff.service"

type PlatformUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  position?: string | null
  active: boolean
  establishment_id: string
  establishment_name: string
}

const roleLabel: Record<string, string> = {
  enseignant: "Enseignant", teacher: "Enseignant", admin: "Administrateur",
  administrator: "Administrateur", direction: "Direction", personnel: "Personnel", staff: "Personnel",
}

export default function Page() {
  const [schools, setSchools] = useState<AdminEstablishment[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [q, setQ] = useState("")
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const establishments = await getAdminEstablishments()
      setSchools(establishments)
      const results = await Promise.all(establishments.map(async school => {
        try {
          const page = await listStaffPaginated(school.id, 1, 200, "", true)
          return page.items.map((staff: any) => ({
            id: String(staff.id), first_name: staff.first_name, last_name: staff.last_name,
            email: staff.email, phone: staff.phone, role: staff.role, position: staff.position,
            active: staff.active !== false && staff.status !== "inactive",
            establishment_id: school.id, establishment_name: school.name,
          }))
        } catch { return [] }
      }))
      setUsers(results.flat())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les utilisateurs.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return users.filter(user => {
      const matchesSchool = schoolFilter === "all" || user.establishment_id === schoolFilter
      const text = [user.first_name, user.last_name, user.email, user.phone, user.role, user.position, user.establishment_name].filter(Boolean).join(" ").toLowerCase()
      return matchesSchool && (!term || text.includes(term))
    })
  }, [users, q, schoolFilter])

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.active).length,
    admins: users.filter(u => ["admin", "administrator"].includes(String(u.role).toLowerCase())).length,
    schools: new Set(users.map(u => u.establishment_id)).size,
  }), [users])

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-primary">Administration NOVA</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Utilisateurs</h1><p className="mt-1 text-muted-foreground">Vue globale des comptes opérationnels à travers tous les établissements.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Utilisateurs</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div><p className="text-sm text-muted-foreground">Actifs</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><UserCog className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Administrateurs</p><p className="text-2xl font-bold">{stats.admins}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Établissements concernés</p><p className="text-2xl font-bold">{stats.schools}</p></div></div></CardContent></Card>
    </div>
    <Card><CardHeader className="space-y-4"><div><CardTitle>Annuaire global</CardTitle><p className="mt-1 text-sm text-muted-foreground">Recherchez rapidement un utilisateur sans naviguer établissement par établissement.</p></div><div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Nom, e-mail, téléphone, rôle…" value={q} onChange={e => setQ(e.target.value)}/></div><select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"><option value="all">Tous les établissements</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></CardHeader>
      <CardContent className="p-0">{loading ? <p className="p-10 text-center text-sm text-muted-foreground">Chargement des utilisateurs…</p> : error ? <div className="p-10 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={() => void load()}>Réessayer</Button></div> : filtered.length === 0 ? <div className="p-10 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8"/><p>Aucun utilisateur trouvé.</p></div> : <div className="divide-y">{filtered.map(user => {
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Utilisateur"
        const role = String(user.role || user.position || "personnel").toLowerCase()
        const initials = name.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase()
        return <div key={user.establishment_id + ":" + user.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{initials}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{name}</p><span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs " + (user.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>{user.active ? <CheckCircle2 className="h-3 w-3"/> : <XCircle className="h-3 w-3"/>}{user.active ? "Actif" : "Inactif"}</span></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{user.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5"/>{user.email}</span>}{user.phone && <span>{user.phone}</span>}</div></div></div><div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{roleLabel[role] || user.position || user.role || "Personnel"}</span><span className="rounded-full border px-3 py-1 text-muted-foreground">{user.establishment_name}</span></div></div>
      })}</div>}</CardContent>
    </Card>
  </div>
}
