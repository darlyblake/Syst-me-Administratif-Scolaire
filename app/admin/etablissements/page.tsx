"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Building2, Edit3, MoreHorizontal, Power, Plus, Search, Trash2, UserPlus, Users, CreditCard, RefreshCw, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getAdminEstablishments, type AdminEstablishment } from "@/lib/supabase/services/admin.service"
import { supabaseBrowser } from "@/lib/supabase/client"

type School = AdminEstablishment

function subscriptionLabel(school: School) {
  if (!school.subscription_status) return "Sans abonnement"
  if (school.subscription_status === "active") return school.subscription_ends_at ? `Actif · fin ${new Date(`${school.subscription_ends_at}T00:00:00`).toLocaleDateString("fr-FR")}` : "Actif"
  if (school.subscription_status === "expired") return "Expiré"
  return "Suspendu"
}

export default function Page() {
  const [schools, setSchools] = useState<School[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [deleteSchool, setDeleteSchool] = useState<School | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true)
    setError("")
    try { setSchools(await getAdminEstablishments()) }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Impossible de charger les établissements.") }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const list = useMemo(() => schools.filter(s => `${s.name} ${s.code || ""}`.toLowerCase().includes(q.trim().toLowerCase())), [schools, q])

  const toggleStatus = async (school: School) => {
    setOpenMenu(null); setError("")
    const { error: actionError } = await supabaseBrowser.rpc("set_establishment_status", { p_establishment_id: school.id, p_status: school.status === "active" ? "inactive" : "active" })
    if (actionError) setError(actionError.message); else await load()
  }

  const openDelete = (school: School) => {
    setOpenMenu(null)
    setDeleteSchool(school)
    setDeleteName("")
    setDeleteError("")
  }

  const closeDelete = () => {
    if (deleting) return
    setDeleteSchool(null)
    setDeleteName("")
    setDeleteError("")
  }

  const confirmDelete = async () => {
    if (!deleteSchool || deleteName.trim() !== deleteSchool.name.trim()) return
    setDeleting(true)
    setDeleteError("")
    const { error: actionError } = await supabaseBrowser.rpc("platform_admin_delete_establishment", { p_establishment_id: deleteSchool.id })
    if (actionError) {
      setDeleteError(actionError.message)
      setDeleting(false)
      return
    }
    const deletedId = deleteSchool.id
    setSchools(current => current.filter(s => s.id !== deletedId))
    setDeleting(false)
    closeDelete()
  }

  const canDelete = Boolean(deleteSchool && deleteName.trim() === deleteSchool.name.trim() && !deleting)

  return <div className="mx-auto max-w-7xl space-y-6" onClick={() => openMenu && setOpenMenu(null)}>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Gestion multi-établissements</p><h1 className="text-3xl font-bold tracking-tight">Établissements</h1><p className="mt-1 text-muted-foreground">Créez, consultez et administrez les établissements de NOVA.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load(true)} disabled={refreshing || loading}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Actualiser</Button><Button asChild><Link href="/admin/etablissements/nouveau"><Plus className="mr-2 h-4 w-4" />Nouvel établissement</Link></Button></div></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher un établissement…" value={q} onChange={e => setQ(e.target.value)} /></div>
    {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load(true)}>Réessayer</Button></div>}
    <Card><CardContent className="p-0">{loading ? <p className="p-10 text-center text-sm text-muted-foreground">Chargement des établissements…</p> : list.length === 0 ? <div className="p-12 text-center"><Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-medium">{q ? "Aucun résultat" : "Aucun établissement"}</p><p className="mt-1 text-sm text-muted-foreground">{q ? "Modifiez votre recherche." : "Créez votre premier établissement pour commencer."}</p></div> : <div className="divide-y">{list.map(s => <div key={s.id} className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"><Link href={`/admin/etablissements/${s.id}`} className="min-w-0 flex-1"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="mt-0.5 font-mono text-sm text-muted-foreground">{s.code || "—"}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.users_count} compte{s.users_count > 1 ? "s" : ""}</span><span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{subscriptionLabel(s)}</span></div></div></div></Link><div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{s.status === "active" ? "Actif" : "Suspendu"}</span><div className="relative"><Button type="button" variant="ghost" size="icon" aria-label={`Actions pour ${s.name}`} aria-expanded={openMenu === s.id} onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === s.id ? null : s.id) }}><MoreHorizontal className="h-5 w-5" /></Button>{openMenu === s.id && <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border bg-background p-1 shadow-xl" onClick={e => e.stopPropagation()}><Link className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}`} onClick={() => setOpenMenu(null)}><Building2 className="h-4 w-4" />Voir l'établissement</Link><Link className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}?action=edit`} onClick={() => setOpenMenu(null)}><Edit3 className="h-4 w-4" />Modifier</Link><Link className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted" href={`/admin/etablissements/${s.id}?action=admin`} onClick={() => setOpenMenu(null)}><UserPlus className="h-4 w-4" />Créer le super administrateur</Link><button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted" onClick={() => void toggleStatus(s)}><Power className="h-4 w-4" />{s.status === "active" ? "Suspendre" : "Réactiver"}</button><button className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/5" onClick={() => openDelete(s)}><Trash2 className="h-4 w-4" />Supprimer</button></div>}</div></div></div>)}</div>}</CardContent></Card>

    {deleteSchool && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="delete-establishment-title" onMouseDown={e => { if (e.target === e.currentTarget) closeDelete() }}><div className="w-full max-w-lg overflow-hidden rounded-xl border border-red-200 bg-background shadow-2xl"><div className="flex items-start gap-3 border-b bg-red-50 px-6 py-5"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertTriangle className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 id="delete-establishment-title" className="text-lg font-semibold text-red-900">Supprimer « {deleteSchool.name} »</h2><p className="mt-1 text-sm text-red-800">Cette action est définitive. Vérifiez les conséquences avant de continuer.</p></div><Button size="icon" variant="ghost" onClick={closeDelete} disabled={deleting} aria-label="Fermer"><Trash2 className="h-4 w-4" /></Button></div><div className="space-y-4 px-6 py-5"><div className="rounded-lg border border-red-200 bg-red-50/60 p-4"><p className="font-medium text-red-900">Les éléments liés seront supprimés</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800"><li>les comptes et rattachements utilisateurs de l’établissement ;</li><li>les données administratives et scolaires rattachées ;</li><li>les informations d’abonnement et de suivi associées.</li></ul></div><div className="space-y-2"><label htmlFor="delete-establishment-name" className="text-sm font-medium">Pour confirmer, réécrivez exactement le nom de l’établissement :</label><Input id="delete-establishment-name" autoFocus value={deleteName} onChange={e => setDeleteName(e.target.value)} placeholder={deleteSchool.name} disabled={deleting} /><p className="text-xs text-muted-foreground">Saisissez : <span className="font-semibold text-foreground">{deleteSchool.name}</span></p></div>{deleteError && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{deleteError}</div>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={closeDelete} disabled={deleting}>Annuler</Button><Button variant="destructive" onClick={() => void confirmDelete()} disabled={!canDelete}>{deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression…</> : "Supprimer définitivement"}</Button></div></div></div></div>}
  </div>
}
