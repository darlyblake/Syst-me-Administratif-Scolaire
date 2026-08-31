"use client"

import Link from "next/link"
import { Baby, Building2, Search, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useMemo, useState } from "react"
import { getAdminEstablishments, type AdminEstablishment } from "@/lib/supabase/services/admin.service"

export default function Page() {
  const [schools, setSchools] = useState<AdminEstablishment[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { getAdminEstablishments().then(setSchools).catch(e => setError(e instanceof Error ? e.message : "Impossible de charger les établissements.")).finally(() => setLoading(false)) }, [])
  const filtered = useMemo(() => schools.filter(s => `${s.name} ${s.code ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [schools, q])

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-primary">Gestion des familles</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Parents</h1><p className="mt-1 text-muted-foreground">Supervisez les comptes parents et leur rattachement aux établissements.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Card><CardContent className="p-5"><div className="flex items-center gap-3"><Baby className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Module parents</p><p className="text-lg font-bold">Actif</p></div></div></CardContent></Card><Card><CardContent className="p-5"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Établissements</p><p className="text-2xl font-bold">{schools.length}</p></div></div></CardContent></Card><Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Gestion</p><p className="text-sm font-medium">Par établissement</p></div></div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Parents par établissement</CardTitle><div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Rechercher un établissement…" value={q} onChange={e=>setQ(e.target.value)}/></div></CardHeader><CardContent className="p-0">{loading ? <p className="p-10 text-center text-sm text-muted-foreground">Chargement…</p> : error ? <div className="p-10 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" onClick={()=>window.location.reload()}>Réessayer</Button></div> : filtered.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Aucun établissement trouvé.</div> : <div className="divide-y">{filtered.map(s=><div key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5"/></div><div><p className="font-semibold">{s.name}</p><p className="font-mono text-xs text-muted-foreground">{s.code || "—"}</p></div></div><Link href={`/admin/etablissements/${s.id}`}><Button variant="outline">Gérer les comptes</Button></Link></div>)}</div>}</CardContent></Card>
    <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">La vue globale des parents est préparée côté interface. Les opérations de création, rattachement parent-enfant et gestion des comptes seront branchées sur les fonctions Supabase dédiées lorsque la logique métier correspondante sera disponible.</div>
  </div>
}
