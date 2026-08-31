"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarDays, GraduationCap, Save, Search, ShieldCheck, School, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseBrowser } from "@/lib/supabase/client"

type School = { id: string; name: string; code: string; status: "active" | "inactive" }
type Sub = { establishment_id: string; plan_name: string; starts_at: string; ends_at: string; status: "active" | "expired" | "suspended"; notes: string | null; max_students: number | null; max_staff: number | null; max_classes: number | null; max_admins: number | null }
type Overview = { students_count: number; staff_count: number; classes_count: number; admins_count: number; establishment_name: string; establishment_code: string; establishment_status: string; plan_name: string | null; subscription_status: string | null; starts_at: string | null; ends_at: string | null; max_students: number | null; max_staff: number | null; max_classes: number | null; max_admins: number | null }

type FormState = { plan_name: string; starts_at: string; ends_at: string; status: Sub["status"]; max_students: string; max_staff: string; max_classes: string; max_admins: string; notes: string }

const makeEmptyForm = (): FormState => ({ plan_name: "Manuel", starts_at: new Date().toISOString().slice(0, 10), ends_at: "", status: "active", max_students: "", max_staff: "", max_classes: "", max_admins: "", notes: "" })

export default function Page() {
  const [schools, setSchools] = useState<School[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [selected, setSelected] = useState("")
  const [overview, setOverview] = useState<Overview | null>(null)
  const [form, setForm] = useState<FormState>(makeEmptyForm())
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const load = async () => {
    const [{ data: establishments }, { data: subscriptions }] = await Promise.all([
      supabaseBrowser.from("establishments").select("id,name,code,status").order("name"),
      supabaseBrowser.from("establishment_subscriptions").select("*")
    ])
    setSchools(establishments || [])
    setSubs(subscriptions || [])
  }

  useEffect(() => { void load() }, [])

  const filteredSchools = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR")
    if (!term) return schools
    return schools.filter((school) => `${school.name} ${school.code}`.toLocaleLowerCase("fr-FR").includes(term))
  }, [schools, search])

  const choose = async (id: string) => {
    setSelected(id)
    setMessage("")
    const { data, error } = await supabaseBrowser.rpc("platform_admin_establishment_overview", { p_establishment_id: id })
    if (error) { setMessage(error.message); return }
    const result = Array.isArray(data) ? data[0] : data
    setOverview(result || null)
    const subscription = subs.find((item) => item.establishment_id === id)
    setForm(subscription ? {
      plan_name: subscription.plan_name,
      starts_at: subscription.starts_at,
      ends_at: subscription.ends_at,
      status: subscription.status,
      max_students: subscription.max_students?.toString() || "",
      max_staff: subscription.max_staff?.toString() || "",
      max_classes: subscription.max_classes?.toString() || "",
      max_admins: subscription.max_admins?.toString() || "",
      notes: subscription.notes || ""
    } : makeEmptyForm())
    setOpen(true)
  }

  const save = async () => {
    if (!selected || !form.ends_at) { setMessage("Sélectionnez une date de fin avant d'enregistrer."); return }
    setSaving(true); setMessage("")
    const toInt = (value: string) => value.trim() ? Number(value) : null
    const { error } = await supabaseBrowser.rpc("platform_admin_set_subscription", {
      p_establishment_id: selected,
      p_plan_name: form.plan_name,
      p_starts_at: form.starts_at,
      p_ends_at: form.ends_at,
      p_status: form.status,
      p_max_students: toInt(form.max_students),
      p_max_staff: toInt(form.max_staff),
      p_max_classes: toInt(form.max_classes),
      p_max_admins: toInt(form.max_admins),
      p_notes: form.notes || null
    })
    setSaving(false)
    if (error) { setMessage(error.message); return }
    setMessage("Abonnement et limites enregistrés.")
    await load()
    await choose(selected)
  }

  const daysLeft = overview?.ends_at ? Math.ceil((new Date(overview.ends_at).getTime() - Date.now()) / 86400000) : null
  const selectedSchool = schools.find((school) => school.id === selected)

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-primary">Gestion commerciale</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Abonnements</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Sélectionnez un établissement pour consulter son abonnement, ses limites et modifier sa configuration.</p>
      </header>

      <Card className="overflow-hidden">
        <div className="border-b bg-muted/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Établissements</h2>
              <p className="text-sm text-muted-foreground">{filteredSchools.length} établissement{filteredSchools.length > 1 ? "s" : ""} affiché{filteredSchools.length > 1 ? "s" : ""}</p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un établissement…" className="pl-9 pr-9" />
              {search && <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche"><X className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6">
          {filteredSchools.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <School className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">Aucun établissement trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">Essayez avec un autre nom ou code.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredSchools.map((school) => {
                const subscription = subs.find((item) => item.establishment_id === school.id)
                return (
                  <button key={school.id} type="button" onClick={() => void choose(school.id)} className="group rounded-2xl border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><School className="h-5 w-5" /></div>
                        <div className="min-w-0"><p className="truncate font-semibold">{school.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{school.code}</p></div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${school.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{school.status === "active" ? "Actif" : "Inactif"}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
                      <span className="text-muted-foreground">Abonnement</span>
                      <span className="font-medium">{subscription?.plan_name || "Non configuré"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>Statut</span><span>{subscription?.status === "active" ? "Actif" : subscription?.status === "suspended" ? "Suspendu" : subscription?.status === "expired" ? "Expiré" : "À configurer"}</span></div>
                    <p className="mt-4 text-xs font-medium text-primary opacity-80 group-hover:opacity-100">Gérer l'abonnement →</p>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
          <div className="border-b bg-muted/20 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 pr-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><School className="h-5 w-5" /></span>{selectedSchool?.name || overview?.establishment_name || "Établissement"}</DialogTitle>
              <DialogDescription className="pl-[52px]">{selectedSchool?.code || overview?.establishment_code || ""} · Gestion de l'abonnement et des limites</DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 p-6">
            {overview && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={GraduationCap} label="Élèves" value={quota(overview.students_count, overview.max_students)} /><Stat icon={Users} label="Personnel" value={quota(overview.staff_count, overview.max_staff)} /><Stat icon={School} label="Classes / salles" value={quota(overview.classes_count, overview.max_classes)} /><Stat icon={ShieldCheck} label="Administrateurs" value={quota(overview.admins_count, overview.max_admins)} /></div>}

            {overview && daysLeft !== null && <div className={`flex items-start gap-3 rounded-xl border p-4 ${daysLeft <= 30 ? "border-amber-200 bg-amber-50" : "border-primary/10 bg-primary/[0.04]"}`}><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-semibold">{daysLeft < 0 ? "Abonnement expiré" : daysLeft === 0 ? "Expiration aujourd'hui" : `Expiration dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}</p><p className="text-xs text-muted-foreground">Fin prévue le {new Date(overview.ends_at!).toLocaleDateString("fr-FR")}.</p></div></div>}

            <section className="rounded-2xl border p-5">
              <div className="mb-5 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-4 w-4" /></div><div><h3 className="font-semibold">Options d'abonnement</h3><p className="text-xs text-muted-foreground">Configurez la période, le statut et les limites de cet établissement.</p></div></div>
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" value={form.plan_name} onChange={(value) => setForm({ ...form, plan_name: value })} type="text" /><div className="space-y-2"><Label>Statut</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Sub["status"] })}><option value="active">Actif</option><option value="suspended">Suspendu</option><option value="expired">Expiré</option></select></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Date de début" type="date" value={form.starts_at} onChange={(value) => setForm({ ...form, starts_at: value })} /><Field label="Date de fin" type="date" value={form.ends_at} onChange={(value) => setForm({ ...form, ends_at: value })} /></div>
                <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-4"><div className="mb-4"><p className="font-semibold">Limites du plan</p><p className="text-xs text-muted-foreground">Laissez vide pour ne pas imposer de limite.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre max. d'élèves" value={form.max_students} onChange={(value) => setForm({ ...form, max_students: value })} /><Field label="Nombre max. de personnel" value={form.max_staff} onChange={(value) => setForm({ ...form, max_staff: value })} /><Field label="Nombre max. de classes / salles" value={form.max_classes} onChange={(value) => setForm({ ...form, max_classes: value })} /><Field label="Nombre max. d'administrateurs" value={form.max_admins} onChange={(value) => setForm({ ...form, max_admins: value })} /></div></div>
                <div className="space-y-2"><Label>Note interne</Label><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optionnel" /></div>
                {message && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button disabled={saving || !selected} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer l'abonnement"}</Button></div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value, onChange, type = "number" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} min={type === "number" ? 1 : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function quota(current: number, limit: number | null) { return limit ? `${current} / ${limit}` : `${current} / ∞` }

function Stat({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></CardContent></Card>
}
