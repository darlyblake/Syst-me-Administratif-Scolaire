"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { serviceStatistiques } from "@/services/statistiques.service"
import { serviceAbsences } from "@/services/absences.service"
import { serviceEvenements } from "@/services/evenements.service"
import type { StatistiquesTableauBord } from "@/types/models"
import { NumberTicker } from "@/components/magicui/NumberTicker"
import { BlurFade } from "@/components/magicui/BlurFade"
import { AnimatedList } from "@/components/magicui/AnimatedList"

export default function PageTableauBord() {
  const [statistiques, setStatistiques] = useState<StatistiquesTableauBord>({
    totalEleves: 0,
    totalEnseignants: 0,
    totalRecettes: 0,
    classesActives: 0,
    elevesImpayes: 0,
    enseignantsPresents: 0,
    tauxPresenceEnseignants: 0,
  })
  const [absencesDuJour, setAbsencesDuJour] = useState(0)
  const [evenementsPlanifies, setEvenementsPlanifies] = useState(0)
  const [activitesRecentes, setActivitesRecentes] = useState<string[]>([])

  useEffect(() => {
    const nouvellesStatistiques = serviceStatistiques.calculerStatistiquesTableauBord()
    setStatistiques(nouvellesStatistiques)

    const aujourdhui = new Date().toISOString().split("T")[0]
    const absencesAujourdhui = serviceAbsences.obtenirAbsencesParDate(aujourdhui)
    setAbsencesDuJour(absencesAujourdhui.length)

    const evtPlanifies = serviceEvenements.obtenirEvenementsParStatut("planifie")
    setEvenementsPlanifies(evtPlanifies.length)
    setActivitesRecentes(
      serviceEvenements
        .obtenirTousLesEvenements()
        .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
        .slice(0, 4)
        .map((evenement) => evenement.titre)
    )
  }, [])

  const formatDate = () => {
    return new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-8">
      {/* Salut */}
      <BlurFade>
      <section>
        <h2 className="text-2xl font-bold text-terre tracking-tight">Bonjour, Admin</h2>
        <p className="text-pierre mt-1">Voici ce qui se passe aujourd'hui dans votre établissement</p>
      </section>
      </BlurFade>

      {/* Alertes */}
      <BlurFade delay={0.06}>
      <section className="grid border-y border-[#D8E0DC] sm:grid-cols-3 sm:divide-x divide-[#D8E0DC]">
        <Link href="/ecole/absences/liste" className="flex items-center gap-3 py-4 sm:px-4 hover:bg-papier transition">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-rouge-terre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <NumberTicker value={absencesDuJour} className="text-lg font-bold tabular" />
            <p className="text-xs text-pierre">Absences du jour</p>
          </div>
        </Link>
        <Link href="/ecole/payments" className="flex items-center gap-3 py-4 sm:px-4 hover:bg-papier transition">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-ambre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          </div>
          <div>
            <NumberTicker value={statistiques.elevesImpayes} className="text-lg font-bold tabular" />
            <p className="text-xs text-pierre">Élèves en impayé</p>
          </div>
        </Link>
        <Link href="/ecole/evenements" className="flex items-center gap-3 py-4 sm:px-4 hover:bg-papier transition">
          <div className="w-10 h-10 rounded-xl bg-terre-soft text-terre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <NumberTicker value={evenementsPlanifies} className="text-lg font-bold tabular" />
            <p className="text-xs text-pierre">Événements à venir</p>
          </div>
        </Link>
      </section>
      </BlurFade>

      {/* KPI */}
      <BlurFade delay={0.12}>
      <section>
        <h3 className="text-sm font-semibold text-pierre uppercase tracking-wide mb-3">Vue d'ensemble</h3>
        <div className="grid grid-cols-2 border-y border-[#D8E0DC] lg:grid-cols-4 lg:divide-x divide-[#D8E0DC]">
          <div className="py-4 pr-4">
            <p className="text-sm text-pierre">Élèves actifs</p>
            <NumberTicker value={statistiques.totalEleves} className="text-3xl font-bold mt-1 tabular" />
            <p className="text-xs text-jardin mt-2">Actifs</p>
          </div>
          <div className="py-4 pr-4 lg:pl-4">
            <p className="text-sm text-pierre">Enseignants</p>
            <NumberTicker value={statistiques.totalEnseignants} className="text-3xl font-bold mt-1 tabular" />
            <p className="text-xs text-pierre mt-2">{statistiques.enseignantsPresents} présents</p>
          </div>
          <div className="py-4 pr-4 lg:pl-4">
            <p className="text-sm text-pierre">Classes</p>
            <NumberTicker value={statistiques.classesActives} className="text-3xl font-bold mt-1 tabular" />
            <p className="text-xs text-pierre mt-2">Actives</p>
          </div>
          <div className="py-4 pr-4 lg:pl-4">
            <p className="text-sm text-pierre">Recettes (mois)</p>
            <p className="text-3xl font-bold mt-1 tabular"><NumberTicker value={Math.round(statistiques.totalRecettes / 100000)} /> <span className="text-base font-medium">centaines de milliers</span></p>
            <p className="text-xs text-pierre mt-2">FCFA</p>
          </div>
        </div>
      </section>
      </BlurFade>

      {/* Actions rapides */}
      <BlurFade delay={0.18}>
      <section>
        <h3 className="text-sm font-semibold text-pierre uppercase tracking-wide mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 border-y border-[#D8E0DC] sm:grid-cols-3 lg:grid-cols-6 lg:divide-x divide-[#D8E0DC]">
          <Link href="/ecole/inscriptions" className="flex items-center gap-2 py-3 pr-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-terre-soft text-terre flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <p className="text-sm font-medium">Inscriptions</p>
          </Link>
          <Link href="/ecole/students" className="flex items-center gap-2 py-3 pr-3 lg:pl-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-soleil-soft text-soleil flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <p className="text-sm font-medium">Élèves</p>
          </Link>
          <Link href="/ecole/enseignants" className="flex items-center gap-2 py-3 pr-3 lg:pl-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-green-50 text-jardin flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
            </div>
            <p className="text-sm font-medium">Enseignants</p>
          </Link>
          <Link href="/ecole/payments" className="flex items-center gap-2 py-3 pr-3 lg:pl-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-amber-50 text-ambre flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <p className="text-sm font-medium">Paiements</p>
          </Link>
          <Link href="/ecole/registre-appel" className="flex items-center gap-2 py-3 pr-3 lg:pl-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-terre-soft text-terre flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <p className="text-sm font-medium">Présences</p>
          </Link>
          <Link href="/ecole/dossiers-papier" className="flex items-center gap-2 py-3 pr-3 lg:pl-3 hover:bg-papier transition">
            <div className="w-8 h-8 rounded-md bg-soleil-soft text-soleil flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </div>
            <p className="text-sm font-medium">Dossiers</p>
          </Link>
        </div>
      </section>
      </BlurFade>

      <BlurFade delay={0.24}>
      <section>
        <h3 className="text-sm font-semibold text-pierre uppercase tracking-wide mb-3">Activité récente</h3>
        <AnimatedList className="border-y border-[#D8E0DC]">
          {activitesRecentes.length > 0 ? activitesRecentes.map((activite) => (
            <div key={activite} className="flex items-center justify-between gap-4 border-b border-[#D8E0DC] py-3 last:border-b-0">
              <span className="text-sm text-encre">{activite}</span>
              <span className="text-xs text-pierre">Enregistré</span>
            </div>
          )) : (
            <p className="py-4 text-sm text-pierre">Aucune activité récente.</p>
          )}
        </AnimatedList>
      </section>
      </BlurFade>
    </div>
  )
}
