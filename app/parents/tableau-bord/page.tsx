"use client"

import Link from "next/link"
import { Users, Bell, MessageSquare, CreditCard, UserX, Calendar, FileText, ChevronRight, GraduationCap, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"

function formatMontant(n: number) { return new Intl.NumberFormat("fr-FR").format(n) + " FCFA" }

export default function ParentsTableauBord() {
  const { utilisateur } = useAuthentification()
  const { loading, error, refresh, children, grades, payments, attendance, notifications, events } = useParentPortal()

  const totalPaid = payments.reduce((sum, item) => sum + item.amount, 0)
  const unread = notifications.filter((item) => !item.read_at).length
  const recentAttendance = attendance.filter((item) => item.status !== "present").length
  const kpis = [
    { label: "Enfants", value: children.length, icon: Users, href: "/parents/enfants", color: "bg-terre text-white" },
    { label: "Paiements enregistrés", value: formatMontant(totalPaid), icon: CreditCard, href: "/parents/paiements", color: "bg-soleil text-white" },
    { label: "Notifications", value: unread, icon: Bell, href: "/parents/notifications", color: "bg-rouge-terre text-white" },
    { label: "Absences / retards", value: recentAttendance, icon: UserX, href: "/parents/absences", color: "bg-jardin text-white" },
  ]

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-pierre">Chargement de votre espace parent...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-terre sm:text-3xl">Bonjour 👋</h1>
          <p className="mt-1 text-pierre">Bienvenue dans votre espace parents{utilisateur?.nomUtilisateur ? <>, <span className="font-medium text-terre">{utilisateur.nomUtilisateur}</span></> : null}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-700">{error}</CardContent></Card>}
      {!error && children.length === 0 && <Card><CardContent className="p-6 text-pierre">Aucun enfant n'est encore associé à votre compte. Contactez l'administration de votre établissement.</CardContent></Card>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <Link key={k.label} href={k.href}><Card className="h-full bg-papier shadow-soft border-0 transition hover:shadow-soft-lg"><CardContent className="flex items-center gap-4 p-5"><div className={"rounded-xl p-3 " + k.color}><k.icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-pierre">{k.label}</p><p className="truncate text-lg font-bold text-terre">{k.value}</p></div></CardContent></Card></Link>)}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-terre">Mes enfants</h2><Button variant="ghost" size="sm" asChild><Link href="/parents/enfants">Tout voir <ChevronRight className="ml-1 h-4 w-4" /></Link></Button></div>
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => {
            const childGrades = grades.filter((g) => g.student_id === child.id)
            const average = childGrades.length ? childGrades.reduce((sum, g) => sum + g.score, 0) / childGrades.length : null
            const childAttendance = attendance.filter((a) => a.student_id === child.id && a.status !== "present").length
            return <Card key={child.id} className="bg-papier shadow-soft border-0"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-terre-soft text-lg font-bold text-terre">{child.first_name[0]}{child.last_name[0]}</div><div><CardTitle className="text-base text-terre">{child.first_name} {child.last_name}</CardTitle><CardDescription className="flex items-center gap-1 text-pierre"><GraduationCap className="h-3.5 w-3.5" />{child.class_name ?? "Classe non attribuée"}</CardDescription></div></div><Badge variant="secondary" className="bg-jardin text-white rounded-full">{child.active ? "Actif" : "Inactif"}</Badge></div></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-creme p-2"><p className="text-xs text-pierre">Moyenne</p><p className="font-semibold text-terre">{average !== null ? average.toFixed(1) : "—"}/20</p></div><div className="rounded-lg bg-creme p-2"><p className="text-xs text-pierre">Absences</p><p className="font-semibold text-terre">{childAttendance}</p></div><div className="rounded-lg bg-creme p-2"><p className="text-xs text-pierre">Notes</p><p className="font-semibold text-terre">{childGrades.length}</p></div></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link href={"/parents/notes?eleve=" + child.id}>Notes</Link></Button><Button size="sm" variant="outline" asChild><Link href={"/parents/absences?eleve=" + child.id}>Absences</Link></Button><Button size="sm" variant="outline" asChild><Link href={"/parents/paiements?eleve=" + child.id}>Paiements</Link></Button></div></CardContent></Card>
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-papier shadow-soft border-0"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="flex items-center gap-2 text-base text-terre"><Bell className="h-4 w-4" />Dernières notifications</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/parents/notifications">Voir tout</Link></Button></CardHeader><CardContent className="space-y-3">{notifications.slice(0,3).map((n)=><div key={n.id} className="flex items-start gap-3 rounded-lg border border-terre/10 bg-creme p-3">{!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terre" />}<div><p className="text-sm font-medium text-terre">{n.title}</p><p className="line-clamp-2 text-xs text-pierre">{n.body}</p></div></div>)}{notifications.length===0 && <p className="text-sm text-pierre">Aucune notification.</p>}</CardContent></Card>
        <Card className="bg-papier shadow-soft border-0"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="flex items-center gap-2 text-base text-terre"><Calendar className="h-4 w-4 text-terre" />Prochains événements</CardTitle><Button variant="ghost" size="sm" asChild><Link href="/parents/evenements">Voir tout</Link></Button></CardHeader><CardContent className="space-y-3">{events.slice(0,3).map((e)=><div key={e.id} className="flex gap-3 rounded-lg border border-terre/10 bg-creme p-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-terre-soft text-xs font-bold text-terre">{new Date(e.starts_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div><div><p className="text-sm font-medium text-terre">{e.title}</p><p className="text-xs text-pierre">{e.location ?? "Établissement"}</p></div></div>)}{events.length===0 && <p className="text-sm text-pierre">Aucun événement à venir.</p>}</CardContent></Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{href:"/parents/notes",icon:FileText,label:"Notes & bulletins"},{href:"/parents/absences",icon:UserX,label:"Absences & retards"},{href:"/parents/paiements",icon:CreditCard,label:"Historique paiements"},{href:"/parents/messages",icon:MessageSquare,label:"Messagerie école"}].map((a)=><Button key={a.href} variant="outline" className="h-auto justify-start gap-3 py-4 rounded-xl" asChild><Link href={a.href}><a.icon className="h-5 w-5 text-terre" />{a.label}</Link></Button>)}</div>
    </div>
  )
}