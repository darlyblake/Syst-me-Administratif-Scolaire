"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Building2, CheckCircle2, Edit3, Loader2, Power,
  RefreshCcw, Shield, Trash2, Users, UserCog, XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabaseBrowser } from "@/lib/supabase/client"

type Overview = {
  establishment_id: string
  establishment_name: string
  establishment_code: string
  establishment_status: "active" | "inactive"
  students_count: number
  staff_count: number
  classes_count: number
  admins_count: number
  plan_name: string | null
  subscription_status: "active" | "expired" | "suspended" | null
  starts_at: string | null
  ends_at: string | null
  max_students: number | null
  max_staff: number | null
  max_classes: number | null
  max_admins: number | null
}

type Member = {
  member_id: string
  user_id: string
  role: string
  active: boolean
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
}

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  administrator: "Administrateur",
  direction: "Direction",
  teacher: "Enseignant",
  accountant: "Comptable",
  staff: "Personnel",
}

export default function Page() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [overviewResult, membersResult] = await Promise.all([
      supabaseBrowser.rpc("platform_admin_establishment_overview", { p_establishment_id: id }),
      supabaseBrowser.rpc("get_establishment_members", { p_establishment_id: id }),
    ])
    if (overviewResult.error) setError(overviewResult.error.message)
    const row = (overviewResult.data?.[0] ?? null) as Overview | null
    setOverview(row)
    setName(row?.establishment_name ?? "")
    setMembers((membersResult.data ?? []) as Member[])
    if (membersResult.error && !overviewResult.error) setError(membersResult.error.message)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const updateName = async () => {
    if (!name.trim() || name.trim() === overview?.establishment_name) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabaseBrowser.rpc("platform_admin_update_establishment", {
      p_establishment_id: id,
      p_name: name.trim(),
    })
    if (updateError) setError(updateError.message)
    else setEditing(false)
    setSaving(false)
    await load()
  }

  const toggleStatus = async () => {
    if (!overview) return
    setSaving(true)
    setError(null)
    const { error: actionError } = await supabaseBrowser.rpc("set_establishment_status", {
      p_establishment_id: id,
      p_status: overview.establishment_status === "active" ? "inactive" : "active",
    })
    if (actionError) setError(actionError.message)
    setSaving(false)
    await load()
  }

  const changeMemberRole = async (memberId: string, role: string) => {
    setError(null)
    const { error: actionError } = await supabaseBrowser.rpc("update_establishment_member_role", {
      p_member_id: memberId,
      p_role: role,
      p_active: true,
    })
    if (actionError) setError(actionError.message)
    await load()
  }

  const removeMember = async (member: Member) => {
    if (member.role === "owner") return
    if (!window.confirm(`Retirer ${member.first_name ?? "cet utilisateur"} de l'établissement ?`)) return
    setError(null)
    const { error: actionError } = await supabaseBrowser.rpc("remove_establishment_member", {
      p_member_id: member.member_id,
    })
    if (actionError) setError(actionError.message)
    await load()
  }

  const deleteEstablishment = async () => {
    setDeleting(true)
    setError(null)
    const { error: actionError } = await supabaseBrowser.rpc("platform_admin_delete_establishment", {
      p_establishment_id: id,
    })
    if (actionError) {
      setError(actionError.message)
      setDeleting(false)
      setDeleteConfirm(false)
      return
    }
    router.replace("/admin/etablissements")
  }

  if (loading) {
    return <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  if (!overview) {
    return <div className="mx-auto max-w-3xl space-y-4"><Button variant="ghost" onClick={() => router.push("/admin/etablissements")}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button><Card><CardContent className="p-8 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="font-semibold">Établissement introuvable</p><p className="mt-1 text-sm text-muted-foreground">Vous n'avez peut-être pas les droits nécessaires.</p></CardContent></Card></div>
  }

  const initials = overview.establishment_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push("/admin/etablissements")}><ArrowLeft className="mr-2 h-4 w-4" />Établissements</Button>
        <Button variant="outline" onClick={load}><RefreshCcw className="mr-2 h-4 w-4" />Actualiser</Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Card className="overflow-hidden">
        <div className="border-b bg-primary/[0.04] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">{initials || <Building2 className="h-6 w-6" />}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {editing ? <div className="flex items-center gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" autoFocus /><Button size="sm" onClick={updateName} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</Button><Button size="sm" variant="ghost" onClick={() => { setName(overview.establishment_name); setEditing(false) }}>Annuler</Button></div> : <><h1 className="text-2xl font-bold tracking-tight">{overview.establishment_name}</h1><Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Modifier le nom"><Edit3 className="h-4 w-4" /></Button></>}
                </div>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{overview.establishment_code}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${overview.establishment_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {overview.establishment_status === "active" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {overview.establishment_status === "active" ? "Actif" : "Suspendu"}
                  </span>
                  {overview.plan_name && <span className="rounded-full bg-background px-2.5 py-1 text-muted-foreground">Plan : {overview.plan_name}</span>}
                </div>
              </div>
            </div>
            <Button variant={overview.establishment_status === "active" ? "destructive" : "default"} onClick={toggleStatus} disabled={saving}>
              {overview.establishment_status === "active" ? <Power className="mr-2 h-4 w-4" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              {overview.establishment_status === "active" ? "Suspendre" : "Réactiver"}
            </Button>
          </div>
        </div>

        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Élèves" value={overview.students_count} limit={overview.max_students} />
          <Stat icon={<UserCog className="h-4 w-4" />} label="Personnel" value={overview.staff_count} limit={overview.max_staff} />
          <Stat icon={<Building2 className="h-4 w-4" />} label="Classes" value={overview.classes_count} limit={overview.max_classes} />
          <Stat icon={<Shield className="h-4 w-4" />} label="Administrateurs" value={overview.admins_count} limit={overview.max_admins} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Utilisateurs de l'établissement</CardTitle><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{members.length} comptes</span></div></CardHeader>
          <CardContent className="p-0">
            {members.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur rattaché.</div> : <div className="divide-y">{members.map((member) => <div key={member.member_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{`${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase() || "U"}</div><div className="min-w-0"><p className="truncate font-medium">{[member.first_name, member.last_name].filter(Boolean).join(" ") || "Utilisateur"}</p><p className="text-xs text-muted-foreground">{member.phone || "Aucun téléphone"}</p></div></div>
              <div className="flex items-center gap-2"><select value={member.role} disabled={member.role === "owner"} onChange={(e) => changeMemberRole(member.member_id, e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="owner">{roleLabels.owner}</option><option value="admin">{roleLabels.admin}</option><option value="direction">{roleLabels.direction}</option><option value="teacher">{roleLabels.teacher}</option><option value="accountant">{roleLabels.accountant}</option><option value="staff">{roleLabels.staff}</option></select>{member.role !== "owner" && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeMember(member)} aria-label="Retirer"><Trash2 className="h-4 w-4" /></Button>}</div>
            </div>)}</div>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Abonnement</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <Row label="Statut" value={overview.subscription_status ? ({ active: "Actif", expired: "Expiré", suspended: "Suspendu" } as Record<string, string>)[overview.subscription_status] : "Non configuré"} />
            <Row label="Plan" value={overview.plan_name || "—"} />
            <Row label="Début" value={overview.starts_at ? new Date(overview.starts_at).toLocaleDateString("fr-FR") : "—"} />
            <Row label="Fin" value={overview.ends_at ? new Date(overview.ends_at).toLocaleDateString("fr-FR") : "—"} />
            <Button className="mt-2 w-full" variant="outline" onClick={() => router.push(`/admin/abonnements?establishment=${id}`)}>Gérer l'abonnement</Button>
          </CardContent></Card>

          <Card className="border-destructive/30"><CardHeader><CardTitle className="text-destructive">Zone dangereuse</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">La suppression efface définitivement l'établissement et les données qui lui sont rattachées.</p><Button variant="destructive" className="w-full" onClick={() => setDeleteConfirm(true)}><Trash2 className="mr-2 h-4 w-4" />Supprimer l'établissement</Button></CardContent></Card>
        </div>
      </div>

      {deleteConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Supprimer cet établissement ?</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm text-muted-foreground">Cette action est irréversible. Toutes les données rattachées à <strong>{overview.establishment_name}</strong> seront supprimées. Le code <strong>{overview.establishment_code}</strong> ne sera plus utilisable.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Annuler</Button><Button variant="destructive" onClick={deleteEstablishment} disabled={deleting}>{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Supprimer définitivement</Button></div></CardContent></Card></div>}
    </div>
  )
}

function Stat({ icon, label, value, limit }: { icon: React.ReactNode; label: string; value: number; limit: number | null }) {
  return <div className="rounded-lg border p-4"><div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><div className="text-2xl font-bold">{value}</div><p className="mt-1 text-xs text-muted-foreground">{limit != null ? `Limite : ${limit}` : "Aucune limite définie"}</p></div>
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div> }
