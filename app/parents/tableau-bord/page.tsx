"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Users,
  Bell,
  MessageSquare,
  CreditCard,
  UserX,
  Calendar,
  FileText,
  ChevronRight,
  GraduationCap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuthentification } from "@/providers/authentification.provider"
import { serviceParents } from "@/services/parents.service"

function formatMontant(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA"
}

export default function ParentsTableauBord() {
  const { utilisateur } = useAuthentification()
  const resume = useMemo(() => serviceParents.obtenirResumeTableauBord(), [])
  const evenements = useMemo(() => serviceParents.obtenirEvenements().slice(0, 3), [])
  const notifs = useMemo(() => serviceParents.obtenirNotifications().slice(0, 3), [])

  const kpis = [
    {
      label: "Enfants",
      value: resume.nombreEnfants,
      icon: Users,
      href: "/parents/enfants",
      color: "bg-terre text-white",
    },
    {
      label: "Reste à payer",
      value: formatMontant(resume.totalResteAPayer),
      icon: CreditCard,
      href: "/parents/paiements",
      color: "bg-soleil text-white",
    },
    {
      label: "Notifications",
      value: resume.notificationsNonLues,
      icon: Bell,
      href: "/parents/notifications",
      color: "bg-rouge-terre text-white",
    },
    {
      label: "Messages non lus",
      value: resume.messagesNonLus,
      icon: MessageSquare,
      href: "/parents/messages",
      color: "bg-jardin text-white",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-terre sm:text-3xl">Bonjour 👋</h1>
        <p className="mt-1 text-pierre">
          Bienvenue dans l&apos;espace parents
          {utilisateur?.nomUtilisateur ? (
            <>
              , <span className="font-medium text-terre">{utilisateur.nomUtilisateur}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="h-full bg-papier shadow-soft border-0 transition hover:shadow-soft-lg">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl p-3 ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-pierre">{k.label}</p>
                  <p className="truncate text-lg font-bold text-terre">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-terre">Mes enfants</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/parents/enfants">
              Tout voir <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {resume.enfants.map((enfant) => (
            <Card key={enfant.id} className="bg-papier shadow-soft border-0">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terre-soft text-lg font-bold text-terre">
                      {enfant.prenom[0]}
                      {enfant.nom[0]}
                    </div>
                    <div>
                      <CardTitle className="text-base text-terre">
                        {enfant.prenom} {enfant.nom}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-pierre">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Classe {enfant.classe}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-jardin text-white rounded-full">
                    {enfant.statut}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-creme p-2">
                    <p className="text-xs text-pierre">Moyenne</p>
                    <p className="font-semibold text-terre">
                      {enfant.moyenneGenerale?.toFixed(1) ?? "—"}/20
                    </p>
                  </div>
                  <div className="rounded-lg bg-creme p-2">
                    <p className="text-xs text-pierre">Absences</p>
                    <p className="font-semibold text-terre">{enfant.absencesMois ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-creme p-2">
                    <p className="text-xs text-pierre">Reste dû</p>
                    <p className="font-semibold text-soleil">
                      {formatMontant(serviceParents.resteAPayer(enfant.id))}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl" asChild>
                    <Link href={`/parents/notes?eleve=${enfant.id}`}>Notes</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" asChild>
                    <Link href={`/parents/absences?eleve=${enfant.id}`}>Absences</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" asChild>
                    <Link href={`/parents/paiements?eleve=${enfant.id}`}>Paiements</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-terre">
              <Bell className="h-4 w-4 text-terre" />
              Dernières notifications
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parents/notifications">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifs.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-lg border border-terre/10 bg-creme p-3"
              >
                {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-terre" />}
                <div className={n.lu ? "pl-4" : ""}>
                  <p className="text-sm font-medium text-terre">{n.titre}</p>
                  <p className="line-clamp-2 text-xs text-pierre">{n.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-papier shadow-soft border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-terre">
              <Calendar className="h-4 w-4 text-terre" />
              Prochains événements
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parents/evenements">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {evenements.map((e) => (
              <div key={e.id} className="flex gap-3 rounded-lg border border-terre/10 bg-creme p-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-terre-soft text-terre">
                  <span className="text-xs font-medium">
                    {new Date(e.date).toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {new Date(e.date).getDate()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-terre">{e.titre}</p>
                  <p className="text-xs text-pierre">
                    {e.heureDebut ? `${e.heureDebut}` : ""}
                    {e.lieu ? ` · ${e.lieu}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/parents/notes", icon: FileText, label: "Notes & bulletins" },
          { href: "/parents/absences", icon: UserX, label: "Absences & retards" },
          { href: "/parents/paiements", icon: CreditCard, label: "Historique paiements" },
          { href: "/parents/messages", icon: MessageSquare, label: "Messagerie école" },
        ].map((a) => (
          <Button key={a.href} variant="outline" className="h-auto justify-start gap-3 py-4 rounded-xl" asChild>
            <Link href={a.href}>
              <a.icon className="h-5 w-5 text-terre" />
              {a.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
