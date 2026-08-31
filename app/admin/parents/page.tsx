"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Baby,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRound,
  Users,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getAdminParents,
  setAdminParentActive,
  type AdminParent,
} from "@/lib/supabase/services/admin.service"

function parentName(parent: AdminParent) {
  const name = `${parent.first_name ?? ""} ${parent.last_name ?? ""}`.trim()
  return name || "Parent sans nom"
}

export default function Page() {
  const [parents, setParents] = useState<AdminParent[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadParents = async () => {
    setLoading(true)
    setError("")
    try {
      setParents(await getAdminParents())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les parents.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadParents()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return parents

    return parents.filter((parent) => {
      const children = parent.children.map((child) => `${child.first_name} ${child.last_name} ${child.student_number ?? ""}`).join(" ")
      const haystack = [
        parentName(parent),
        parent.email ?? "",
        parent.phone ?? "",
        parent.establishment_name,
        parent.establishment_code ?? "",
        children,
      ].join(" ").toLowerCase()
      return haystack.includes(term)
    })
  }, [parents, q])

  const stats = useMemo(() => ({
    total: parents.length,
    active: parents.filter((parent) => parent.active).length,
    inactive: parents.filter((parent) => !parent.active).length,
    children: parents.reduce((sum, parent) => sum + parent.children_count, 0),
  }), [parents])

  const toggleParent = async (parent: AdminParent) => {
    const key = `${parent.establishment_id}:${parent.guardian_user_id}`
    setUpdating(key)
    setError("")
    try {
      await setAdminParentActive(parent.guardian_user_id, parent.establishment_id, !parent.active)
      setParents((current) => current.map((item) =>
        item.guardian_user_id === parent.guardian_user_id && item.establishment_id === parent.establishment_id
          ? { ...item, active: !item.active }
          : item,
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de modifier le statut du parent.")
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Gestion des familles</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Parents</h1>
        <p className="mt-1 text-muted-foreground">
          Gérez les comptes parents, leurs enfants et leurs accès par établissement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Parents</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div><p className="text-sm text-muted-foreground">Actifs</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><XCircle className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm text-muted-foreground">Désactivés</p><p className="text-2xl font-bold">{stats.inactive}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Baby className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Enfants rattachés</p><p className="text-2xl font-bold">{stats.children}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Comptes parents</CardTitle>
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Parent, e-mail, téléphone, école ou élève…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="border-b bg-destructive/10 px-5 py-3 text-sm text-destructive">{error}</div>}

          {loading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Chargement des comptes parents…</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Aucun parent trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">Les parents apparaîtront ici dès qu’ils seront rattachés à un élève.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((parent) => {
                const key = `${parent.establishment_id}:${parent.guardian_user_id}`
                const isOpen = expanded === key
                const isUpdating = updating === key

                return (
                  <div key={key} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{parentName(parent)}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${parent.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {parent.active ? <CheckCircle2 className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                              {parent.active ? "Actif" : "Désactivé"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{parent.establishment_name}</span>
                            <span className="inline-flex items-center gap-1"><Baby className="h-3.5 w-3.5" />{parent.children_count} enfant{parent.children_count > 1 ? "s" : ""}</span>
                            {parent.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{parent.email}</span>}
                            {parent.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{parent.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" onClick={() => setExpanded(isOpen ? null : key)}>
                          {isOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                          {isOpen ? "Masquer" : "Voir les enfants"}
                        </Button>
                        <Button
                          variant={parent.active ? "outline" : "default"}
                          disabled={isUpdating}
                          onClick={() => void toggleParent(parent)}
                        >
                          {parent.active ? <ShieldOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          {isUpdating ? "Mise à jour…" : parent.active ? "Désactiver" : "Activer"}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-5 rounded-xl border bg-muted/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">Enfants rattachés</p>
                            <p className="text-xs text-muted-foreground">Les droits d’accès sont gérés enfant par enfant.</p>
                          </div>
                          {parent.establishment_code && <span className="font-mono text-xs text-muted-foreground">{parent.establishment_code}</span>}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {parent.children.map((child) => (
                            <div key={child.id} className="rounded-lg border bg-background p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{child.first_name} {child.last_name}</p>
                                  <p className="text-xs text-muted-foreground">Matricule : {child.student_number || "—"}</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${child.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                                  {child.active ? "Élève actif" : "Élève inactif"}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-md bg-muted px-2 py-1">Relation : {child.relationship || "—"}</span>
                                {child.is_primary && <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">Responsable principal</span>}
                                {child.can_view_academic && <span className="rounded-md bg-muted px-2 py-1">Scolarité</span>}
                                {child.can_view_finance && <span className="rounded-md bg-muted px-2 py-1">Finances</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
