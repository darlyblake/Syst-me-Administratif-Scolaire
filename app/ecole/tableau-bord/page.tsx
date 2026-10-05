"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck,
  Clock3, CreditCard, FileWarning, GraduationCap, History, Plus,
  ReceiptText, School, UserPlus, Users
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
  const [evenements, setEvenements] = useState<any[]>([])

  useEffect(() => {
    setStatistiques(serviceStatistiques.calculerStatistiquesTableauBord())
    const events = serviceEvenements
      .obtenirTousLesEvenements()
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
    setEvenements(events.slice(0, 6))
  }, [])

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  )

  const actions = [
    { href: "/ecole/inscriptions", label: "Nouvelle inscription", icon: UserPlus, primary: true },
    { href: "/ecole/finance/paiements", label: "Enregistrer un paiement", icon: CreditCard },
    { href: "/ecole/students", label: "Ajouter un élève", icon: Plus },
    { href: "/ecole/registre-appel", label: "Registre d'appel du jour", icon: ClipboardCheck },
    { href: "/ecole/evenements", label: "Ajouter un événement", icon: CalendarDays },
  ]

  const situations = [
    {
      label: "Finance",
      tone: "finance",
      text: statistiques.elevesImpayes > 0
        ? `${statistiques.elevesImpayes} dossier(s) présentent un impayé à contrôler`
        : "Aucun dossier impayé signalé.",
      href: "/ecole/finance/paiements",
      action: "Consulter la liste",
    },
    {
      label: "Vie scolaire",
      tone: "school",
      text: absencesDuJourList.length
        ? `${absencesDuJourList.length} absence(s) enregistrée(s) aujourd'hui à traiter ou justifier`
        : "Aucune absence enregistrée aujourd'hui.",
      href: "/ecole/absences",
      action: "Traiter les absences",
    },
    {
      label: "Inscriptions",
      tone: "registration",
      text: "Vérifier les dossiers d'inscription et les pièces administratives.",
      href: "/ecole/inscriptions",
      action: "Examiner",
    },
    {
      label: "Personnel",
      tone: "staff",
      text: "Contrôler les affectations et les besoins de remplacement.",
      href: "/ecole/personnel",
      action: "Gérer l'affectation",
    },
  ]

  const metrics = [
    { label: "Élèves actifs", value: statistiques.totalEleves.toLocaleString("fr-FR"), note: "Effectif actuel", icon: School },
    { label: "Classes ouvertes", value: statistiques.classesActives.toLocaleString("fr-FR"), note: "Divisions pédagogiques", icon: GraduationCap },
    { label: "Enseignants", value: statistiques.totalEnseignants.toLocaleString("fr-FR"), note: `${statistiques.enseignantsPresents} présents`, icon: Users },
    { label: "Présence personnel", value: `${statistiques.tauxPresenceEnseignants.toFixed(1)}%`, note: "Service administratif & technique", icon: CheckCircle2 },
    { label: "Recettes du mois", value: money(statistiques.totalRecettes), note: "Encaissements scolarité", icon: CreditCard },
    { label: "Impayés cumulés", value: statistiques.elevesImpayes.toLocaleString("fr-FR"), note: "Dossiers débiteurs", icon: AlertTriangle, danger: true },
    { label: "Absences du jour", value: absencesDuJourList.length.toLocaleString("fr-FR"), note: "Présences à contrôler", icon: CalendarDays },
    { label: "Inscriptions en attente", value: "—", note: "Dossiers à instruire", icon: ClipboardCheck },
  ]

  return (
    <div className="w-full">
      <section className="flex flex-col gap-3 border-b border-[#c5c5d3]/45 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-[#00236f]">Tableau de bord</h1>
          <p className="mt-0.5 text-[13px] text-[#515f74]">
            Vue générale de l'établissement — Année scolaire en cours
          </p>
        </div>

        <div className="flex max-w-3xl flex-wrap gap-1.5">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded border px-3 text-[12px] font-medium transition-colors",
                action.primary
                  ? "border-[#00236f] bg-[#1e3a8a] text-white hover:bg-[#00236f]"
                  : "border-[#c5c5d3]/70 bg-white text-[#131b2e] hover:bg-[#f2f3ff]",
              ].join(" ")}
            >
              <action.icon className="h-4 w-4" strokeWidth={1.7} />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-h-[88px] rounded border border-[#c5c5d3]/55 bg-white p-2.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#515f74]">{metric.label}</span>
              <metric.icon className={`h-[17px] w-[17px] ${metric.danger ? "text-[#ba1a1a]" : "text-[#515f74]"}`} strokeWidth={1.7} />
            </div>
            <p className={`mt-1.5 text-[21px] font-semibold leading-6 tabular-nums ${metric.danger ? "text-[#ba1a1a]" : "text-[#131b2e]"}`}>{metric.value}</p>
            <p className={`mt-0.5 text-[11px] ${metric.danger ? "text-[#ba1a1a]" : "text-[#515f74]"}`}>{metric.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
        <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
            <AlertTriangle className="h-[17px] w-[17px] text-[#ba1a1a]" strokeWidth={1.8} />
            Situations nécessitant une action immédiate
          </h2>
          <span className="rounded bg-[#ffdad6] px-2 py-1 text-[10px] font-semibold text-[#93000a]">{situations.length} urgences opérationnelles</span>
        </div>

        <div className="divide-y divide-[#c5c5d3]/45">
          {situations.map((item) => (
            <div key={item.label} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
              <span className={[
                "w-fit rounded px-2 py-1 text-[10px] font-semibold",
                item.tone === "finance" ? "bg-[#ffdad6] text-[#93000a]" :
                item.tone === "school" ? "bg-[#d5e3fc] text-[#264191]" :
                item.tone === "registration" ? "bg-[#dce1ff] text-[#264191]" :
                "bg-[#89f5e7] text-[#00312c]"
              ].join(" ")}>{item.label}</span>
              <p className="min-w-0 flex-1 text-[12px] text-[#131b2e]">{item.text}</p>
              <Link href={item.href} className="inline-flex shrink-0 items-center gap-1 rounded border border-[#c5c5d3]/65 px-2.5 py-1.5 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
                {item.action}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
              <History className="h-[17px] w-[17px] text-[#515f74]" strokeWidth={1.8} />
              Activité récente du système
            </h2>
            <span className="text-[11px] text-[#515f74]">{dateLabel}</span>
          </div>

          <div className="divide-y divide-[#c5c5d3]/45">
            {evenements.length ? evenements.map((event, index) => (
              <div key={event.id ?? index} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] text-[#515f74]">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#131b2e]">{event.titre}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#515f74]">{event.description ?? "Opération enregistrée dans l'établissement."}</p>
                </div>
              </div>
            )) : (
              <div className="px-3 py-5 text-[12px] text-[#515f74]">Aucune activité récente.</div>
            )}
          </div>

          <Link href="/ecole/evenements" className="flex items-center justify-center gap-1 border-t border-[#c5c5d3]/55 px-3 py-2 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
            Consulter le journal d'activité complet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-3 py-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#131b2e]">
              <CalendarDays className="h-[17px] w-[17px] text-[#515f74]" strokeWidth={1.8} />
              Calendrier institutionnel
            </h2>
            <span className="text-[11px] text-[#515f74]">{evenements.length ? `${evenements.length} événement(s)` : "Aucun événement"}</span>
          </div>

          <div className="divide-y divide-[#c5c5d3]/45">
            {evenements.slice(0, 3).map((event, index) => {
              const date = event.date ? new Date(event.date) : null
              return (
                <div key={event.id ?? index} className="flex gap-3 px-3 py-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded border border-[#c5c5d3]/60 bg-[#f2f3ff]">
                    <span className="text-[9px] font-semibold uppercase text-[#515f74]">{date ? date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : "—"}</span>
                    <span className="text-[16px] font-semibold text-[#00236f]">{date ? date.getDate() : "—"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#131b2e]">{event.titre}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-[#515f74]">{event.description ?? "Événement institutionnel"}</p>
                  </div>
                </div>
              )
            })}
            {!evenements.length && <div className="px-3 py-5 text-[12px] text-[#515f74]">Aucun événement institutionnel planifié.</div>}
          </div>

          <Link href="/ecole/evenements" className="flex items-center justify-center gap-1 border-t border-[#c5c5d3]/55 px-3 py-2 text-[11px] font-medium text-[#00236f] hover:bg-[#f2f3ff]">
            Ouvrir l'agenda académique complet <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
