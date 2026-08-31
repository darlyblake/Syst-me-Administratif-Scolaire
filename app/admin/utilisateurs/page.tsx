"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Baby, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronUp, Mail, Phone, Search, ShieldCheck, ShieldOff, UserCog, UserRound, Users, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAdminEstablishments, getAdminParents, setAdminParentActive, type AdminEstablishment, type AdminParent } from "@/lib/supabase/services/admin.service"
import { listStaffPaginated } from "@/lib/supabase/services/staff.service"

type UserKind = "admin" | "enseignant" | "parent" | "personnel"
type UserFilter = "all" | UserKind

type PlatformUser = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  role?: string | null
  position?: string | null
  active: boolean
  kind: UserKind
  establishment_id: string
  establishment_name: string
  children_count?: number
  parent?: AdminParent
}

const roleLabel: Record<UserKind, string> = { enseignant: "Enseignant", admin: "Administrateur", parent: "Parent", personnel: "Personnel" }
const tabs: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Tous" }, { value: "admin", label: "Administrateurs" }, { value: "enseignant", label: "Enseignants" }, { value: "parent", label: "Parents" }, { value: "personnel", label: "Personnel" },
]

function normalizeStaffKind(role?: string | null, position?: string | null): UserKind {
  const value = `${role ?? ""} ${position ?? ""}`.toLowerCase()
  if (value.includes("enseign") || value.includes("teacher")) return "enseignant"
  if (value.includes("admin") || value.includes("direction")) return "admin"
  return "personnel"
}

export default function Page() {
  const [schools, setSchools] = useState<AdminEstablishment[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [q, setQ] = useState("")
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [userFilter, setUserFilter] = useState<UserFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const establishments = await getAdminEstablishments(); setSchools(establishments)
      const [staffResults, parentResults] = await Promise.all([
        Promise.all(establishments.map(async school => { try { const page = await listStaffPaginated(school.id, 1, 200, "", true); return page.items.map((staff: any): PlatformUser => ({ id: String(staff.id), first_name: staff.first_name, last_name: staff.last_name, email: staff.email, phone: staff.phone, role: staff.role, position: staff.position, active: staff.active !== false && staff.status !== "inactive", kind: normalizeStaffKind(staff.role, staff.position), establishment_id: school.id, establishment_name: school.name })) } catch { return [] } })),
        getAdminParents(),
      ])
      const parents = parentResults.map((parent: AdminParent): PlatformUser => ({ id: parent.guardian_user_id, first_name: parent.first_name, last_name: parent.last_name, email: parent.email, phone: parent.phone, role: "parent", active: parent.active, kind: "parent", establishment_id: parent.establishment_id, establishment_name: parent.establishment_name, children_count: parent.children_count, parent }))
      setUsers([...staffResults.flat(), ...parents])
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les utilisateurs.") } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => ({ all: users.length, admin: users.filter(u => u.kind === "admin").length, enseignant: users.filter(u => u.kind === "enseignant").length, parent: users.filter(u => u.kind === "parent").length, personnel: users.filter(u => u.kind === "personnel").length }), [users])
  const filtered = useMemo(() => { const term = q.trim().toLowerCase(); return users.filter(user => { const kind = userFilter === "all" || user.kind === userFilter; const school = schoolFilter === "all" || user.establishment_id === schoolFilter; const text = [user.first_name, user.last_name, user.email, user.phone, user.role, user.position, user.establishment_name, ...(user.parent?.children ?? []).map(c => `${c.first_name} ${c.last_name} ${c.student_number ?? ""}`)].filter(Boolean).join(" ").toLowerCase(); return kind && school && (!term || text.includes(term)) }) }, [users, q, schoolFilter, userFilter])
  const stats = useMemo(() => ({ total: users.length, active: users.filter(u => u.active).length, admins: counts.admin, schools: new Set(users.map(u => u.establishment_id)).size }), [users, counts.admin])

  const toggleParent = async (user: PlatformUser) => {
    if (!user.parent) return
    const key = `${user.establishment_id}:${user.id}`; setUpdating(key); setError("")
    try { await setAdminParentActive(user.id, user.establishment_id, !user.active); setUsers(cur => cur.map(x => x.id === user.id && x.establishment_id === user.establishment_id ? { ...x, active: !x.active, parent: x.parent ? { ...x.parent, active: !x.active } : x.parent } : x)) } catch (e) { setError(e instanceof Error ? e.message : "Impossible de modifier le statut du parent.") } finally { setUpdating(null) }
  }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-primary">Administration NOVA</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Utilisateurs</h1><p className="mt-1 text-muted-foreground">Un seul espace pour consulter et gérer les administrateurs, enseignants, parents et personnel.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Utilisateurs</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div><p className="text-sm text-muted-foreground">Actifs</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><UserCog className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Administrateurs</p><p className="text-2xl font-bold">{stats.admins}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Établissements</p><p className="text-2xl font-bold">{stats.schools}</p></div></div></CardContent></Card>
    </div>
    <Card><CardHeader className="space-y-4"><div><CardTitle>Annuaire global</CardTitle><p className="mt-1 text-sm text-muted-foreground">Filtrez par type de compte ou établissement. Les détails spécifiques aux parents et enseignants restent accessibles ici.</p></div>
      <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-1">{tabs.map(tab => <button key={tab.value} type="button" onClick={() => setUserFilter(tab.value)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${userFilter === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{tab.label}<span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs">{counts[tab.value]}</span></button>)}</div>
      <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Nom, e-mail, téléphone, élève, rôle…" value={q} onChange={e => setQ(e.target.value)}/></div><select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"><option value="all">Tous les établissements</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    </CardHeader><CardContent className="p-0">
      {loading ? <p className="p-10 text-center text-sm text-muted-foreground">Chargement des utilisateurs…</p> : error ? <div className="p-10 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={() => void load()}>Réessayer</Button></div> : filtered.length === 0 ? <div className="p-10 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8"/><p>Aucun utilisateur trouvé.</p></div> : <div className="divide-y">{filtered.map(user => { const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Utilisateur"; const initials = name.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase(); const key = `${user.establishment_id}:${user.id}`; const open = expanded === key; const busy = updating === key; return <div key={`${key}:${user.kind}`} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{user.kind === "parent" ? <UserRound className="h-5 w-5"/> : user.kind === "enseignant" ? <BookOpen className="h-5 w-5"/> : initials}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{name}</p><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${user.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{user.active ? <CheckCircle2 className="h-3 w-3"/> : <XCircle className="h-3 w-3"/>}{user.active ? "Actif" : "Inactif"}</span></div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5"/>{user.establishment_name}</span>{user.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5"/>{user.email}</span>}{user.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5"/>{user.phone}</span>}{user.kind === "parent" && <span className="inline-flex items-center gap-1"><Baby className="h-3.5 w-3.5"/>{user.children_count ?? 0} enfant{user.children_count === 1 ? "" : "s"}</span>}</div></div></div><div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{roleLabel[user.kind]}</span>{user.kind === "parent" && <><Button variant="outline" onClick={() => setExpanded(open ? null : key)}>{open ? <ChevronUp className="mr-2 h-4 w-4"/> : <ChevronDown className="mr-2 h-4 w-4"/>}{open ? "Masquer" : "Voir les enfants"}</Button><Button variant={user.active ? "outline" : "default"} disabled={busy} onClick={() => void toggleParent(user)}>{user.active ? <ShieldOff className="mr-2 h-4 w-4"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}{busy ? "Mise à jour…" : user.active ? "Désactiver" : "Activer"}</Button></>}<span className="rounded-full border px-3 py-1 text-muted-foreground">{user.position || user.establishment_name}</span></div></div>
        {open && user.parent && <div className="mt-5 rounded-xl border bg-muted/20 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Enfants rattachés</p><p className="text-xs text-muted-foreground">Les droits d’accès sont gérés enfant par enfant.</p></div>{user.parent.establishment_code && <span className="font-mono text-xs text-muted-foreground">{user.parent.establishment_code}</span>}</div><div className="grid gap-3 md:grid-cols-2">{user.parent.children.map(c => <div key={c.id} className="rounded-lg border bg-background p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{c.first_name} {c.last_name}</p><p className="text-xs text-muted-foreground">Matricule : {c.student_number || "—"}</p></div><span className={`rounded-full px-2 py-0.5 text-xs ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{c.active ? "Élève actif" : "Élève inactif"}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-muted px-2 py-1">Relation : {c.relationship || "—"}</span>{c.is_primary && <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">Responsable principal</span>}{c.can_view_academic && <span className="rounded-md bg-muted px-2 py-1">Scolarité</span>}{c.can_view_finance && <span className="rounded-md bg-muted px-2 py-1">Finances</span>}</div></div>)}</div></div>}
      </div> })}</div>}
    </CardContent></Card>
  </div>
}
