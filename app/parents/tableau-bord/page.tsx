"use client"

import Link from "next/link"
import { ChevronRight, RefreshCw } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const dateTime = (value: string | null | undefined) => {
  if (!value) return "Date indisponible"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date indisponible"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}

export default function ParentsDashboard() {
  const { utilisateur } = useAuthentification()
  const { loading, error, refresh, children, grades, attendance, notifications, events } = useParentPortal()
  const academicIds = useMemo(() => new Set(children.filter((child) => child.can_view_academic).map((child) => child.id)), [children])
  const visibleGrades = grades.filter((grade) => academicIds.has(grade.student_id))
  const visibleAttendance = attendance.filter((item) => academicIds.has(item.student_id) && item.status !== "present")
  const unread = notifications.filter((item) => !item.read_at).length
  const upcoming = events.filter((event) => Date.parse(event.starts_at) >= Date.now()).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).slice(0, 3)

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600" />Chargement de votre espace parent…</div>

  return (
    <div className="space-y-7">
      <ParentPageHeader
        eyebrow="Portail familles"
        title={utilisateur?.nomUtilisateur ? `Bonjour, ${utilisateur.nomUtilisateur}` : "Bonjour"}
        description="Retrouvez en un coup d’œil les informations importantes concernant vos enfants."
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="rounded-lg bg-white" onClick={() => void refresh()}>Réessayer</Button>
        </div>
      )}

      {children.length === 0 && !error ? (
        <ParentEmptyState title="Aucun enfant associé à votre compte" description="Associez votre enfant depuis « Mes enfants » avec le code ou le QR remis par l’établissement." action={<Button className="rounded-lg" asChild><Link href="/parents/enfants">Mes enfants</Link></Button>} />
      ) : (
        <>
          <section className="overflow-hidden border-y border-slate-200">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-base font-bold text-slate-950">Mes enfants</h2><p className="text-sm text-slate-500">Accédez directement à leur suivi scolaire.</p></div>
              <Link href="/parents/enfants" className="inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-800">Gérer les enfants<ChevronRight className="ml-1 h-4 w-4" /></Link>
            </div>
            <div className="divide-y divide-slate-100">
              {children.map((child) => {
                const childGrades = child.can_view_academic ? grades.filter((grade) => grade.student_id === child.id) : []
                const average = childGrades.length ? childGrades.reduce((sum, grade) => sum + grade.score, 0) / childGrades.length : null
                const issues = child.can_view_academic ? attendance.filter((item) => item.student_id === child.id && item.status !== "present").length : null
                return (
                  <div key={child.id} className="px-5 py-5 transition-colors hover:bg-slate-50/70">
                    <div className="grid gap-5 lg:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(120px,.6fr))_auto] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{child.first_name?.[0] ?? ""}{child.last_name?.[0] ?? ""}</div>
                        <div className="min-w-0"><p className="truncate font-semibold text-slate-950">{child.first_name} {child.last_name}</p><p className="mt-0.5 text-sm text-slate-500">{child.class_name ?? "Classe non attribuée"}</p></div>
                      </div>
                      {child.can_view_academic ? <><DataValue label="Moyenne" value={average === null ? "—" : `${average.toFixed(1)}/20`} /><DataValue label="Absences / retards" value={String(issues ?? 0)} /></> : <><DataValue label="Suivi scolaire" value="Limité" /><DataValue label="Accès" value="Restreint" /></>}
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {child.can_view_academic && <Button variant="outline" size="sm" className="rounded-lg border-slate-200" asChild><Link href={`/parents/notes?eleve=${child.id}`}>Résultats</Link></Button>}
                        <Button variant="ghost" size="sm" className="rounded-lg" asChild><Link href={`/parents/enfants?eleve=${child.id}`}>Voir</Link></Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="border-y border-slate-200">
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Accès rapides</h2>
                <p className="text-xs text-slate-500">Ouvrez directement les informations qui nécessitent votre attention.</p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/parents/notes" className="font-medium text-blue-700 hover:text-blue-800">Résultats <span className="ml-1 text-slate-500">({visibleGrades.length})</span></Link>
                <Link href="/parents/absences" className="font-medium text-blue-700 hover:text-blue-800">Présences <span className="ml-1 text-slate-500">({visibleAttendance.length})</span></Link>
                <Link href="/parents/notifications" className="font-medium text-blue-700 hover:text-blue-800">Notifications <span className="ml-1 text-slate-500">({unread})</span></Link>
              </div>
            </div>
          </section>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
            <InfoSection title="Notifications" description="Les dernières informations de l’établissement." href="/parents/notifications" items={notifications.slice(0, 4).map((item) => ({ id: item.id, title: item.title, detail: item.body, date: item.created_at }))} empty="Aucune notification pour le moment." />
            <InfoSection title="À venir" description="Prochains événements scolaires." href="/parents/evenements" items={upcoming.map((item) => ({ id: item.id, title: item.title, detail: item.location ?? "Établissement", date: item.starts_at }))} empty="Aucun événement à venir." />
          </div>
        </>
      )}
    </div>
  )
}

function DataValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>
}

function InfoSection({ title, description, href, items, empty }: { title: string; description: string; href: string; items: { id: string; title: string; detail: string; date: string }[]; empty: string }) {
  return <section className="overflow-hidden border-y border-slate-200"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-base font-bold text-slate-950">{title}</h2><p className="text-sm text-slate-500">{description}</p></div><Link href={href} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Voir tout</Link></div>{items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <Link key={item.id} href={href} className="block px-5 py-4 transition-colors hover:bg-slate-50"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.detail}</p><p className="mt-1 text-xs text-slate-400">{dateTime(item.date)}</p></Link>)}</div> : <p className="px-5 py-8 text-sm text-slate-500">{empty}</p>}</section>
}
