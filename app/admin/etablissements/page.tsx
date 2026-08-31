"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Building2, Edit3, MoreHorizontal, Power, Plus, Search, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabaseBrowser } from "@/lib/supabase/client"

type School = { id: string; name: string; code: string | null; status: string; created_at: string }

export default function Page() {
  const [schools, setSchools] = useState<School[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true); setError("")
    const { data, error: loadError } = await supabaseBrowser.from("establishments").select("id,name,code,status,created_at").order("created_at", { ascending: false })
    if (loadError) setError(loadError.message)
    setSchools((data || []) as School[]); setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const list = useMemo(() => schools.filter(s => (s.name + (s.code || "")).toLowerCase().includes(q.toLowerCase())), [schools, q])
  const toggleStatus = async (school: School) => {
    setOpenMenu(null); setError("")
    const { error: actionError } = await supabaseBrowser.rpc("set_establishment_status", { p_establishment_id: school.id, p_status: school.status === "active" ? "inactive" : "active" })
    if (actionError) setError(actionError.message); else await load()
  }

  return <div className="mx-auto max-w-7xl space-y-6" onClick={() => openMenu && setOpenMenu(null)}>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Gestion multi-établissements</p><h1 className="text-3xl font-bold">Établissements</h1><p className="mt-1 text-muted-foreground">Créez, consultez et administrez les établissements de NOVA.</p></div><Button asChild><Link href="/admin/etablissements/nouveau"><Plus className="mr-2 h-4 w-4" />Nouvel établissement</Link></Button></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher un établissement…" value={q} onChange={e => setQ(e.target.value)} /></div>
    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    <Card><CardContent className="p-0">{loading ? <p className="p-10 text-center">Chargement…</p> : list.length === 0 ? <div className="p-12 text-center"><Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p>Aucun établissement</p></div> : <div className="divide-y">{list.map(s => <div key={s.id} className="relative flex items-center justify-between gap-4 p-5 hover:bg-muted/40"><Link href={`/admin/etablissements/${s.id}`} className="min-w-0 flex-1"><p className="font-semibold">{s.name}</p><p className="font-mono text-sm text-muted-foreground">{s.code || "—"}</p></Link><div className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{s.status === "active" ? "Actif" : "Suspendu"}</span><div className="relative"><Button type="button" variant="ghost" size="icon" aria-label={`Actions pour ${s.name}`} aria-expanded={openMenu === s.id} onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === s.id ? null : s.id) }}><MoreHorizontal className="h-5 w-5" /></Button>{openMenu === s.id && <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border bg-background p-1 shadow-lg" onClick={e => e.stopPropagation()}><Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}`} onClick={() => setOpenMenu(null)}><Building2 className="h-4 w-4" />Voir l'établissement</Link><Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}?action=edit`} onClick={() => setOpenMenu(null)}><Edit3 className="h-4 w-4" />Modifier</Link><Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}?action=admin`} onClick={() => setOpenMenu(null)}><UserPlus className="h-4 w-4" />Créer le super administrateur</Link><button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => void toggleStatus(s)}><Power className="h-4 w-4" />{s.status === "active" ? "Suspendre" : "Réactiver"}</button><Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/5" href={`/admin/etablissements/${s.id}?action=delete`} onClick={() => setOpenMenu(null)}><Trash2 className="h-4 w-4" />Supprimer</Link></div>}</div></div></div>)}</div>}</CardContent></Card>
  </div>
}
