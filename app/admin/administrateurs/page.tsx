"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Crown, KeyRound, Loader2, Mail, MoreVertical, Plus, Shield, ShieldOff, Trash2, UserPlus, Users, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createPlatformAdmin,
  deletePlatformAdmin,
  getPlatformAdmins,
  PLATFORM_ADMIN_PERMISSIONS,
  setPlatformAdminActive,
  updatePlatformAdminPermissions,
  type PlatformAdmin,
  type PlatformAdminPermission,
} from "@/lib/supabase/services/admin.service"

const emptyForm = { first_name: "", last_name: "", email: "", password: "" }

export default function Page() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [openCreate, setOpenCreate] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [permissions, setPermissions] = useState<PlatformAdminPermission[]>(["dashboard.view", "users.view"])
  const [temporaryPassword, setTemporaryPassword] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setAdmins(await getPlatformAdmins()) } catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les administrateurs.") } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const root = useMemo(() => admins.find(a => a.is_root), [admins])
  const activeCount = admins.filter(a => a.active).length

  const togglePermission = (permission: PlatformAdminPermission) => {
    setPermissions(current => current.includes(permission) ? current.filter(p => p !== permission) : [...current, permission])
  }

  const create = async () => {
    setSaving(true); setError(""); setNotice("")
    try {
      const result = await createPlatformAdmin({ ...form, permissions })
      setTemporaryPassword(result.temporary_password)
      setNotice("Administrateur créé avec succès. Conservez le mot de passe temporaire affiché ci-dessous.")
      setForm(emptyForm); setPermissions(["dashboard.view", "users.view"]); setOpenCreate(false)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Création impossible.") } finally { setSaving(false) }
  }

  const toggleActive = async (admin: PlatformAdmin) => {
    if (admin.is_root) return
    setSaving(true); setError("")
    try { await setPlatformAdminActive(admin.user_id, !admin.active); setAdmins(current => current.map(a => a.user_id === admin.user_id ? { ...a, active: !a.active } : a)); setMenu(null) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de modifier le statut.") }
    finally { setSaving(false) }
  }

  const savePermissions = async (admin: PlatformAdmin) => {
    if (admin.is_root || editing !== admin.user_id) return
    setSaving(true); setError("")
    try { await updatePlatformAdminPermissions(admin.user_id, permissions); setAdmins(current => current.map(a => a.user_id === admin.user_id ? { ...a, permissions } : a)); setEditing(null); setMenu(null) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de modifier les permissions.") }
    finally { setSaving(false) }
  }

  const remove = async (admin: PlatformAdmin) => {
    if (admin.is_root) return
    if (!window.confirm(`Supprimer définitivement le compte de ${[admin.first_name, admin.last_name].filter(Boolean).join(" ") || admin.email || "cet administrateur"} ?`)) return
    setSaving(true); setError("")
    try { await deletePlatformAdmin(admin.user_id); setAdmins(current => current.filter(a => a.user_id !== admin.user_id)); setMenu(null) }
    catch (e) { setError(e instanceof Error ? e.message : "Suppression impossible.") }
    finally { setSaving(false) }
  }

  const startEdit = (admin: PlatformAdmin) => { setEditing(admin.user_id); setPermissions(admin.permissions); setMenu(null) }

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-medium text-primary">Administration NOVA</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Administrateurs</h1><p className="mt-2 max-w-2xl text-muted-foreground">Gérez les comptes des administrateurs de la plateforme. Les comptes créés héritent uniquement des droits que leur créateur possède.</p></div>
      <Button onClick={() => { setOpenCreate(true); setError(""); setNotice("") }}><UserPlus className="mr-2 h-4 w-4"/>Nouvel administrateur</Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Crown className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Administrateur général</p><p className="font-semibold">{root ? [root.first_name, root.last_name].filter(Boolean).join(" ") || root.email : "—"}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary"/><div><p className="text-sm text-muted-foreground">Comptes administrateurs</p><p className="text-2xl font-bold">{admins.length}</p></div></div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600"/><div><p className="text-sm text-muted-foreground">Comptes actifs</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
    </div>

    {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    {temporaryPassword && <Card className="border-primary/20"><CardContent className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Mot de passe temporaire</p><p className="text-sm text-muted-foreground">Il est affiché une seule fois dans cette interface. Transmettez-le de manière sécurisée à l’administrateur.</p></div><div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm"><KeyRound className="h-4 w-4"/>{temporaryPassword}<Button variant="ghost" size="sm" onClick={() => setTemporaryPassword("")} aria-label="Masquer">×</Button></div></div></CardContent></Card>}

    <Card><CardHeader><CardTitle>Comptes de la plateforme</CardTitle></CardHeader><CardContent className="p-0">
      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Chargement…</div> : admins.length === 0 ? <div className="p-12 text-center text-muted-foreground">Aucun compte administrateur trouvé.</div> : <div className="divide-y">{admins.map(admin => {
        const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ") || "Administrateur"
        const editingThis = editing === admin.user_id
        return <div key={admin.user_id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${admin.is_root ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{admin.is_root ? <Crown className="h-5 w-5"/> : <Shield className="h-5 w-5"/>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{name}</p>{admin.is_root && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Administrateur général</span>}<span className={`rounded-full px-2 py-0.5 text-xs ${admin.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{admin.active ? "Actif" : "Suspendu"}</span></div><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5"/>{admin.email || "E-mail non renseigné"}</p><p className="mt-1 text-xs text-muted-foreground">{admin.is_root ? "Compte initial de la plateforme — protégé contre la suppression et la suspension." : `Créé par ${admin.created_by_name || "un administrateur"}`}</p></div></div>
            <div className="relative flex items-center gap-2"><span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{admin.permissions.length} droit{admin.permissions.length > 1 ? "s" : ""}</span>{!admin.is_root && <><Button variant="outline" size="sm" onClick={() => startEdit(admin)}>{editingThis ? "Modifier…" : "Permissions"}</Button><Button variant="ghost" size="icon" onClick={() => setMenu(menu === admin.user_id ? null : admin.user_id)} aria-label="Actions"><MoreVertical className="h-4 w-4"/></Button>{menu === admin.user_id && <div className="absolute right-0 top-10 z-10 w-48 rounded-xl border bg-background p-1 shadow-lg"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => void toggleActive(admin)} disabled={saving}>{admin.active ? <><ShieldOff className="h-4 w-4"/>Suspendre</> : <><CheckCircle2 className="h-4 w-4"/>Réactiver</>}</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5" onClick={() => void remove(admin)} disabled={saving}><Trash2 className="h-4 w-4"/>Supprimer</button></div>}</>}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{admin.permissions.map(p => <span key={p} className="rounded-md bg-muted px-2 py-1 text-xs">{PLATFORM_ADMIN_PERMISSIONS.find(x => x.value === p)?.label ?? p}</span>)}</div>
          {editingThis && <div className="mt-4 rounded-xl border bg-muted/20 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Droits de {name}</p><p className="text-xs text-muted-foreground">Vous ne pouvez attribuer que les droits que votre propre compte possède.</p></div><Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="h-4 w-4"/></Button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PLATFORM_ADMIN_PERMISSIONS.map(permission => <label key={permission.value} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-3 text-sm"><input type="checkbox" checked={permissions.includes(permission.value)} onChange={() => togglePermission(permission.value)} />{permission.label}</label>)}</div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button><Button disabled={saving} onClick={() => void savePermissions(admin)}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div></div>}
        </div>
      })}</div>}
    </CardContent></Card>

    {openCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true"><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto shadow-2xl"><CardHeader><div className="flex items-start justify-between"><div><CardTitle>Créer un administrateur</CardTitle><p className="mt-1 text-sm text-muted-foreground">Ce compte sera un administrateur général de NOVA, pas un administrateur d’établissement.</p></div><Button variant="ghost" size="icon" onClick={() => setOpenCreate(false)}><X className="h-4 w-4"/></Button></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Prénom</label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="Prénom"/></div><div><label className="mb-1.5 block text-sm font-medium">Nom</label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="Nom"/></div></div><div><label className="mb-1.5 block text-sm font-medium">E-mail</label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@nova.ga"/></div><div><label className="mb-1.5 block text-sm font-medium">Mot de passe <span className="font-normal text-muted-foreground">(optionnel)</span></label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="10 caractères minimum — sinon génération automatique"/></div><div><div className="mb-2"><p className="font-semibold">Permissions</p><p className="text-xs text-muted-foreground">Le serveur vérifiera automatiquement que ces droits ne dépassent pas ceux du créateur.</p></div><div className="grid gap-2 sm:grid-cols-2">{PLATFORM_ADMIN_PERMISSIONS.map(permission => <label key={permission.value} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-3 text-sm"><input type="checkbox" checked={permissions.includes(permission.value)} onChange={() => togglePermission(permission.value)} />{permission.label}</label>)}</div></div><div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button><Button disabled={saving || !form.first_name.trim() || !form.last_name.trim() || !form.email.trim()} onClick={() => void create()}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Création…</> : <><Plus className="mr-2 h-4 w-4"/>Créer le compte</>}</Button></div></CardContent></Card></div>}
  </div>
}
