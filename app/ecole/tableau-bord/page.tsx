"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck,
  Clock3, CreditCard, FileWarning, GraduationCap, History, Plus,
  ReceiptText, School, UserPlus, Users, WalletCards
} from "lucide-react"
import { serviceStatistiques } from "@/services/statistiques.service"
import { serviceEvenements } from "@/services/evenements.service"
import type { StatistiquesTableauBord } from "@/types/models"
import { useUserContext } from "@/hooks/useUserContext"
import { useDailyAbsences } from "@/hooks/useAbsences"

const money = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value))) + " FCFA"

export default function PageTableauBord() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const aujourdhui = new Date().toISOString().split("T")[0]
  const { absences: absencesDuJourList } = useDailyAbsences(establishmentId, aujourdhui)

  const [statistiques, setStatistiques] = useState<StatistiquesTableauBord>({
    totalEleves: 0,
    totalEnseignants: 0,
    totalRecettes: 0,
    classesActives: 0,
    elevesImpayes: 0,
    enseignantsPresents: 0,
    tauxPresenceEnseignants: 0,
  })
  const [evenementsPlanifies, setEvenementsPlanifies] = useState(0)
  const [activitesRecentes, setActivitesRecentes] = useState<string[]>([])

  useEffect(() => {
    setStatistiques(serviceStatistiques.calculerStatistiquesTableauBord())
    const events = serviceEvenements.obtenirTousLesEvenements()
    setEvenementsPlanifies(serviceEvenements.obtenirEvenementsParStatut("planifie").length)
    setActivitesRecentes(
      events
        .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
        .slice(0, 5)
        .map((event) => event.titre)
    )
  }, [])

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  )

  const actions = [
    { href: "/ecole/inscriptions", label: "Nouvelle inscription", icon: UserPlus },
    { href: "/ecole/finance/paiements", label: "Enregistrer un paiement", icon: CreditCard },
    { href: "/ecole/students", label: "Ajouter un élève", icon: Plus },
    { href: "/ecole/registre-appel", label: "Registre d'appel du jour", icon: ClipboardCheck },
    { href: "/ecole/evenements", label: "Ajouter un événement", icon: CalendarDays },
  ]

  const alerts = [
    {
      label: "Finance",
      text: statistiques.elevesImpayes > 0
        ? `${statistiques.elevesImpayes} élève(s) présentent une situation de paiement à vérifier.`
        : "Aucun impayé critique signalé.",
      href: "/ecole/finance/paiements",
      icon: WalletCards,
    },
    {
      label: "Vie scolaire",
      text: absencesDuJourList.length > 0
        ? `${absencesDuJourList.length} absence(s) enregistrée(s) aujourd'hui à traiter ou justifier.`
        : "Aucune absence enregistrée aujourd'hui.",
      href: "/ecole/absences",
      icon: AlertTriangle,
    },
    {
      label: "Inscriptions",
      text: "Vérifiez les dossiers récents et les pièces administratives manquantes.",
      href: "/ecole/inscriptions",
      icon: FileWarning,
    },
    {
      label: "Personnel",
      text: "Consultez les affectations et la présence du personnel.",
      href: "/ecole/personnel/pointage",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-7">
      <section className="border-b border-[#c5c5d3]/45 pb-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#515f74]">Espace établissement</p>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#131b2e]">Tableau de bord</h1>
            <p className="mt-1 text-[13px] text-[#515f74]">Vue générale de l'établissement — année scolaire en cours</p>
          </div>
          <p className="text-[12px] text-[#515f74]">{dateLabel}</p>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#c5c5d3]/55 bg-white px-3 text-[12px] font-medium text-[#131b2e] transition-colors hover:border-[#00236f]/35 hover:bg-[#f2f3ff]"
            >
              <action.icon className="h-4 w-4 text-[#00236f]" strokeWidth={1.8} />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="grid border-y border-[#c5c5d3]/45 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Élèves actifs", value: statistiques.totalEleves, note: "Effectif actuel", icon: School },
            { label: "Classes ouvertes", value: statistiques.classesActives, note: "Divisions pédagogiques", icon: GraduationCap },
            { label: "Enseignants", value: statistiques.totalEnseignants, note: `${statistiques.enseignantsPresents} présents`, icon: Users },
            { label: "Présence personnel", value: `${statistiques.tauxPresenceEnseignants.toFixed(1)}%`, note: "Service administratif & technique", icon: CheckCircle2 },
          ].map((item, index) => (
            <div key={item.label} className={`flex items-start gap-3 px-3 py-4 sm:px-4 ${index > 0 ? "border-t border-[#c5c5d3]/45 sm:border-l sm:border-t-0" : ""}`}>
              <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#00236f]" strokeWidth={1.7} />
              <div>
                <p className="text-[11px] font-medium text-[#515f74]">{item.label}</p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#131b2e]">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-[#515f74]">{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="grid border-y border-[#c5c5d3]/45 sm:grid-cols-2 lg:grid-cols-3">
          <div className="px-3 py-4 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#515f74]">Recettes du mois</p>
            <p className="mt-2 text-[20px] font-semibold tabular-nums text-[#131b2e]">{money(statistiques.totalRecettes)}</p>
            <p className="mt-1 text-[11px] text-[#515f74]">Encaissements de scolarité</p>
          </div>
          <div className="border-t border-[#c5c5d3]/45 px-3 py-4 sm:border-l sm:border-t-0 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#515f74]">Impayés cumulés</p>
            <p className="mt-2 text-[20px] font-semibold tabular-nums text-[#ba1a1a]">{money(statistiques.elevesImpayes)}</p>
            <Link href="/ecole/finance/paiements" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#00236f]">Consulter <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="border-t border-[#c5c5d3]/45 px-3 py-4 sm:col-span-2 lg:col-span-1 sm:px-4 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#515f74]">Absences du jour</p>
            <p className="mt-2 text-[20px] font-semibold tabular-nums text-[#131b2e]">{absencesDuJourList.length}</p>
            <p className="mt-1 text-[11px] text-[#515f74]">Dont les justificatifs restent à vérifier si nécessaire</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#131b2e]">Situations nécessitant une action immédiate</h2>
            <p className="mt-0.5 text-[11px] text-[#515f74]">Contrôles opérationnels à traiter par l'administration</p>
          </div>
          <span className="text-[11px] font-medium text-[#515f74]">{alerts.length} points</span>
        </div>
        <div className="divide-y divide-[#c5c5d3]/45 border-y border-[#c5c5d3]/45 bg-white">
          {alerts.map((alert) => (
            <Link key={alert.label} href={alert.href} className="group flex items-center gap-3 px-3 py-3.5 sm:px-4 hover:bg-[#f2f3ff]">
              <alert.icon className="h-[18px] w-[18px] shrink-0 text-[#00236f]" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#131b2e]">{alert.label}</p>
                <p className="mt-0.5 text-[12px] leading-5 text-[#515f74]">{alert.text}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#515f74] transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-7 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#131b2e]">Activité récente du système</h2>
              <p className="mt-0.5 text-[11px] text-[#515f74]">Dernières opérations enregistrées</p>
            </div>
            <History className="h-4 w-4 text-[#515f74]" />
          </div>
          <div className="divide-y divide-[#c5c5d3]/45 border-y border-[#c5c5d3]/45 bg-white">
            {activitesRecentes.length ? activitesRecentes.map((activity, index) => (
              <div key={`${activity}-${index}`} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d5e3fc] text-[9px] font-semibold text-[#00236f]">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#131b2e]">{activity}</p>
                  <p className="mt-0.5 text-[11px] text-[#515f74]">Enregistrement récent</p>
                </div>
              </div>
            )) : (
              <p className="px-4 py-5 text-[12px] text-[#515f74]">Aucune activité récente.</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#131b2e]">Calendrier institutionnel</h2>
              <p className="mt-0.5 text-[11px] text-[#515f74]">{evenementsPlanifies} événement(s) planifié(s)</p>
            </div>
            <Clock3 className="h-4 w-4 text-[#515f74]" />
          </div>
          <div className="divide-y divide-[#c5c5d3]/45 border-y border-[#c5c5d3]/45 bg-white">
            <Link href="/ecole/evenements" className="flex items-center gap-3 px-3 py-4 sm:px-4 hover:bg-[#f2f3ff]">
              <CalendarDays className="h-[18px] w-[18px] text-[#00236f]" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#131b2e]">Événements scolaires</p>
                <p className="mt-0.5 text-[11px] text-[#515f74]">Ouvrir l'agenda institutionnel</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#515f74]" />
            </Link>
            <Link href="/ecole/emploi-du-temps" className="flex items-center gap-3 px-3 py-4 sm:px-4 hover:bg-[#f2f3ff]">
              <CalendarDays className="h-[18px] w-[18px] text-[#00236f]" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#131b2e]">Emploi du temps</p>
                <p className="mt-0.5 text-[11px] text-[#515f74]">Consulter le planning des classes et salles</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#515f74]" />
            </Link>
            <Link href="/ecole/registre-appel" className="flex items-center gap-3 px-3 py-4 sm:px-4 hover:bg-[#f2f3ff]">
              <ReceiptText className="h-[18px] w-[18px] text-[#00236f]" strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#131b2e]">Registre d'appel</p>
                <p className="mt-0.5 text-[11px] text-[#515f74]">Suivre la vie scolaire du jour</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#515f74]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
