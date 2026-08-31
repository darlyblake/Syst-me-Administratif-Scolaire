"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Building2, CalendarClock, CheckCircle2, Clock3, CreditCard, Plus, RefreshCw, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getAdminDashboardSummary, getAdminEstablishments, getAdminExpiringSubscriptions, refreshSubscriptionMonitoring, type AdminDashboardSummary, type AdminEstablishment, type AdminExpiringSubscription } from "@/lib/supabase/services/admin.service"

type School = AdminEstablishment
const initialSummary: AdminDashboardSummary = { establishments_count: 0, active_establishments_count: 0, inactive_establishments_count: 0, students_count: 0, staff_count: 0, classes_count: 0, admins_count: 0, active_subscriptions_count: 0, expiring_subscriptions_count: 0, expired_subscriptions_count: 0, suspended_subscriptions_count: 0 }
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) }
function subscriptionLabel(item: AdminExpiringSubscription) { if (item.subscription_status === "suspended") return "Suspendu"; if (item.days_remaining < 0) return "Expiré"; if (item.days_remaining === 0) return "Expire aujourd'hui"; return `${item.days_remaining} jour${item.days_remaining > 1 ? "s" : ""}` }

export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([])
  const [summary, setSummary] = useState<AdminDashboardSummary>(initialSummary)
  const [expiring, setExpiring] = useState<AdminExpiringSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true)
    setError("")
    try {
      try { await refreshSubscriptionMonitoring() } catch (monitorError) { console.warn("Subscription monitoring unavailable", monitorError) }
      const [schoolData, dashboardSummary, alerts] = await Promise.all([
        getAdminEstablishments(),
        getAdminDashboardSummary(),
        getAdminExpiringSubscriptions(),
      ])
      setSchools(schoolData); setSummary(dashboardSummary); setExpiring(alerts)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le tableau de bord.")
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const stats = [
    { label: "Établissements", value: summary.establishments_count, icon: Building2 },
    { label: "Établissements actifs", value: summary.active_establishments_count, icon: CheckCircle2 },
  ]
  const subscriptionStats = [
    { label: "Abonnements actifs", value: summary.active_subscriptions_count, icon: CreditCard },
    { label: "Expirent sous 30 jours", value: summary.expiring_subscriptions_count, icon: CalendarClock },
    { label: "Expirés", value: summary.expired_subscriptions_count, icon: AlertTriangle },
    { label: "Suspendus", value: summary.suspended_subscriptions_count, icon: ShieldCheck },
  ]

  return <div className="mx-auto max-w-7xl space-y-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary">Vue d'ensemble</p><h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1><p className="mt-1 text-muted-foreground">Pilotez les établissements, les utilisateurs et les abonnements de NOVA.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void loadDashboard(true)} disabled={refreshing || loading}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Actualiser</Button><Button asChild><Link href="/admin/etablissements/nouveau"><Plus className="mr-2 h-4 w-4" />Nouvel établissement</Link></Button></div></div>
    {error && <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Le tableau de bord n'a pas pu être actualisé.</p><p className="text-sm text-muted-foreground">{error}</p></div><Button variant="outline" onClick={() => void loadDashboard(true)}>Réessayer</Button></div>}
    <section><div className="mb-3"><h2 className="text-base font-semibold">Activité de la plateforme</h2></div><div className="grid gap-4 sm:grid-cols-2">{stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{loading ? "…" : value.toLocaleString("fr-FR")}</p></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div></CardContent></Card>)}</div></section>
    <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-base font-semibold">Suivi des abonnements</h2><p className="text-sm text-muted-foreground">Données calculées à partir des abonnements enregistrés.</p></div><Button variant="ghost" size="sm" asChild><Link href="/admin/abonnements">Gérer les abonnements<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{subscriptionStats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{loading ? "…" : value.toLocaleString("fr-FR")}</p></div></CardContent></Card>)}</div></section>
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Établissements récents</CardTitle><p className="mt-1 text-sm text-muted-foreground">Derniers établissements enregistrés.</p></div><Button variant="ghost" size="sm" asChild><Link href="/admin/etablissements">Tout voir<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p> : schools.length === 0 ? <div className="py-10 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Aucun établissement</p><Button className="mt-4" asChild><Link href="/admin/etablissements/nouveau">Créer le premier</Link></Button></div> : <div className="divide-y">{schools.slice(0, 5).map(school => <Link href={`/admin/etablissements/${school.id}`} key={school.id} className="flex items-center justify-between gap-4 py-4 hover:bg-muted/40"><div className="min-w-0"><p className="truncate font-medium">{school.name}</p><p className="text-sm text-muted-foreground">{school.code || "Code en attente"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${school.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{school.status === "active" ? "Actif" : "Inactif"}</span></Link>)}</div>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Alertes d'abonnement</CardTitle></CardHeader><CardContent>{loading ? <p className="py-8 text-center text-sm text-muted-foreground">Vérification des abonnements…</p> : expiring.length === 0 ? <div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" /><p className="font-medium">Aucune alerte</p><p className="mt-1 text-sm text-muted-foreground">Aucun abonnement n'expire dans les 30 prochains jours.</p></div> : <div className="space-y-1">{expiring.map(item => <Link key={item.establishment_id} href={`/admin/etablissements/${item.establishment_id}`} className="block rounded-lg border border-transparent p-3 hover:border-primary/10 hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.establishment_name}</p><p className="text-xs text-muted-foreground">{item.establishment_code || "Sans code"} · {item.plan_name}</p></div><span className="shrink-0 text-xs font-semibold text-amber-700">{subscriptionLabel(item)}</span></div><div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Fin : {formatDate(item.ends_at)}</div></Link>)}</div>}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>Actions rapides</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Button variant="outline" className="justify-between" asChild><Link href="/admin/etablissements/nouveau">Créer un établissement<Plus className="h-4 w-4" /></Link></Button><Button variant="outline" className="justify-between" asChild><Link href="/admin/administrateurs">Gérer les administrateurs<ArrowRight className="h-4 w-4" /></Link></Button><Button variant="outline" className="justify-between" asChild><Link href="/admin/abonnements">Gérer les abonnements<ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>
  </div>
}
