"use client"

import Link from "next/link"
import { useMemo } from "react"
import {
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  UserX,
  Users,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"

function formatMontant(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()
}

export default function ParentsTableauBord() {
  const { utilisateur } = useAuthentification()
  const {
    loading,
    error,
    refresh,
    children,
    grades,
    payments,
    attendance,
    notifications,
    events,
  } = useParentPortal()

  const authorizedAcademicChildren = useMemo(
    () => children.filter((child) => child.can_view_academic),
    [children],
  )
  const authorizedFinanceChildren = useMemo(
    () => children.filter((child) => child.can_view_finance),
    [children],
  )
  const academicStudentIds = useMemo(
    () => new Set(authorizedAcademicChildren.map((child) => child.id)),
    [authorizedAcademicChildren],
  )
  const financeStudentIds = useMemo(
    () => new Set(authorizedFinanceChildren.map((child) => child.id)),
    [authorizedFinanceChildren],
  )

  const visibleGrades = useMemo(
    () => grades.filter((grade) => academicStudentIds.has(grade.student_id)),
    [grades, academicStudentIds],
  )
  const visiblePayments = useMemo(
    () => payments.filter((payment) => {
      const child = children.find((item) => item.enrollment_id === payment.enrollment_id)
      return child ? financeStudentIds.has(child.id) : false
    }),
    [payments, children, financeStudentIds],
  )
  const visibleAttendance = useMemo(
    () => attendance.filter((item) => academicStudentIds.has(item.student_id)),
    [attendance, academicStudentIds],
  )

  const unreadNotifications = notifications.filter((item) => !item.read_at).length
  const totalPaid = visiblePayments.reduce((sum, item) => sum + item.amount, 0)
  const attendanceIssues = visibleAttendance.filter((item) => item.status !== "present").length
  const upcomingEvents = events
    .filter((event) => new Date(event.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 4)

  const studentStats = useMemo(() => {
    return children.map((child) => {
      const childGrades = academicStudentIds.has(child.id)
        ? grades.filter((grade) => grade.student_id === child.id)
        : []
      const childAttendance = academicStudentIds.has(child.id)
        ? attendance.filter((item) => item.student_id === child.id && item.status !== "present")
        : []
      const average = childGrades.length
        ? childGrades.reduce((sum, grade) => sum + grade.score, 0) / childGrades.length
        : null
      return { child, childGrades, childAttendance, average }
    })
  }, [children, grades, attendance, academicStudentIds])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-pierre">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Chargement de votre espace parent…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-terre">Espace parents</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-terre sm:text-3xl">
            Bonjour{utilisateur?.nomUtilisateur ? `, ${utilisateur.nomUtilisateur}` : ""}
          </h1>
          <p className="mt-1 text-sm text-pierre">
            Retrouvez ici les informations importantes concernant vos enfants.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </header>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-red-800">Impossible d’actualiser vos informations</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && children.length === 0 && (
        <Card className="border-terre/10 bg-papier">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-terre">Aucun enfant associé à votre compte</p>
              <p className="mt-1 max-w-2xl text-sm text-pierre">
                Ajoutez votre enfant avec son identifiant et sa date de naissance, ou utilisez le scanner depuis la page Mes enfants.
              </p>
            </div>
            <Button asChild>
              <Link href="/parents/enfants">Ajouter un enfant</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-label="Résumé" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/parents/enfants">
          <Card className="h-full border-terre/10 bg-papier transition hover:border-terre/25">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-terre text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-pierre">Enfants</p>
                <p className="mt-1 text-xl font-bold text-terre">{children.length}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parents/notes">
          <Card className="h-full border-terre/10 bg-papier transition hover:border-terre/25">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-terre text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-pierre">Notes disponibles</p>
                <p className="mt-1 text-xl font-bold text-terre">{visibleGrades.length}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parents/absences">
          <Card className="h-full border-terre/10 bg-papier transition hover:border-terre/25">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rouge-terre text-white">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-pierre">Absences / retards</p>
                <p className="mt-1 text-xl font-bold text-terre">{attendanceIssues}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/parents/notifications">
          <Card className="h-full border-terre/10 bg-papier transition hover:border-terre/25">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-soleil text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-pierre">À lire</p>
                <p className="mt-1 text-xl font-bold text-terre">{unreadNotifications}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {authorizedFinanceChildren.length > 0 && (
        <section className="rounded-lg border border-terre/10 bg-papier px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-terre">Suivi des paiements</p>
              <p className="text-xs text-pierre">Montant total des paiements visibles pour votre compte.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-terre">{formatMontant(totalPaid)}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/parents/paiements">Voir les paiements</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-terre">Mes enfants</h2>
            <p className="mt-1 text-sm text-pierre">Un résumé rapide de leur situation scolaire.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/parents/enfants">Tout voir <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>

        {studentStats.length > 0 ? (
          <div className="divide-y overflow-hidden rounded-lg border border-terre/10 bg-papier">
            {studentStats.map(({ child, childGrades, childAttendance, average }) => (
              <div key={child.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terre-soft font-semibold text-terre">
                    {initials(child.first_name, child.last_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-terre">{child.first_name} {child.last_name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-pierre">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {child.class_name ?? "Classe non attribuée"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">{child.active ? "Actif" : "Inactif"}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:items-center sm:gap-6 sm:text-left">
                  {child.can_view_academic && (
                    <>
                      <div>
                        <p className="text-xs text-pierre">Moyenne</p>
                        <p className="font-semibold text-terre">{average !== null ? `${average.toFixed(1)}/20` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-pierre">Absences / retards</p>
                        <p className="font-semibold text-terre">{childAttendance.length}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-pierre">Notes</p>
                    <p className="font-semibold text-terre">{child.can_view_academic ? childGrades.length : "—"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {child.can_view_academic && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/parents/notes?eleve=${child.id}`}>Notes</Link>
                    </Button>
                  )}
                  {child.can_view_academic && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/parents/absences?eleve=${child.id}`}>Absences</Link>
                    </Button>
                  )}
                  {child.can_view_finance && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/parents/paiements?eleve=${child.id}`}>Paiements</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-6 text-sm text-pierre">Aucun enfant associé.</CardContent></Card>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-terre/10 bg-papier">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-terre"><Bell className="h-4 w-4" />Notifications</CardTitle>
              <CardDescription>Les dernières informations envoyées à votre compte.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/parents/notifications">Voir tout</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 4).map((notification) => (
              <Link key={notification.id} href="/parents/notifications" className="block rounded-md border border-terre/10 p-3 transition hover:bg-creme">
                <div className="flex items-start gap-2">
                  {!notification.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terre" aria-label="Non lue" />}
                  <div className={!notification.read_at ? "min-w-0" : "min-w-0 pl-4"}>
                    <p className="truncate text-sm font-medium text-terre">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-pierre">{notification.body}</p>
                    <p className="mt-1 text-[11px] text-pierre">{formatDate(notification.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
            {notifications.length === 0 && <p className="py-4 text-sm text-pierre">Aucune notification pour le moment.</p>}
          </CardContent>
        </Card>

        <Card className="border-terre/10 bg-papier">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-terre"><Calendar className="h-4 w-4" />Prochains événements</CardTitle>
              <CardDescription>Les prochains rendez-vous de vos établissements.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/parents/evenements">Voir tout</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.map((event) => (
              <Link key={event.id} href="/parents/evenements" className="flex items-center gap-3 rounded-md border border-terre/10 p-3 transition hover:bg-creme">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-terre-soft text-terre">
                  <span className="text-sm font-bold">{new Date(event.starts_at).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(event.starts_at))}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-terre">{event.title}</p>
                  <p className="mt-0.5 truncate text-xs text-pierre">{event.location ?? "Établissement"}</p>
                </div>
              </Link>
            ))}
            {upcomingEvents.length === 0 && <p className="py-4 text-sm text-pierre">Aucun événement à venir.</p>}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-terre">Accès rapides</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start gap-3 py-4" asChild><Link href="/parents/notes"><FileText className="h-5 w-5 text-terre" />Notes & bulletins</Link></Button>
          <Button variant="outline" className="h-auto justify-start gap-3 py-4" asChild><Link href="/parents/absences"><UserX className="h-5 w-5 text-terre" />Absences & retards</Link></Button>
          <Button variant="outline" className="h-auto justify-start gap-3 py-4" asChild><Link href="/parents/paiements"><CreditCard className="h-5 w-5 text-terre" />Paiements</Link></Button>
          <Button variant="outline" className="h-auto justify-start gap-3 py-4" asChild><Link href="/parents/messages"><MessageSquare className="h-5 w-5 text-terre" />Messagerie école</Link></Button>
        </div>
      </section>
    </div>
  )
}
