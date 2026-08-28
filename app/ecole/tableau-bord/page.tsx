"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { serviceStatistiques } from "@/services/statistiques.service"
import { serviceAbsences } from "@/services/absences.service"
import { serviceEvenements } from "@/services/evenements.service"
import { serviceParametres } from "@/services/parametres-fixed.service"
import type { StatistiquesTableauBord } from "@/types/models"

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

  useEffect(() => {
    const nouvellesStatistiques = serviceStatistiques.calculerStatistiquesTableauBord()
    setStatistiques(nouvellesStatistiques)

    const aujourdhui = new Date().toISOString().split("T")[0]
    const absencesAujourdhui = serviceAbsences.obtenirAbsencesParDate(aujourdhui)
    setAbsencesDuJour(absencesAujourdhui.length)

    const evtPlanifies = serviceEvenements.obtenirEvenementsParStatut("planifie")
    setEvenementsPlanifies(evtPlanifies.length)
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
      <section>
        <h2 className="text-2xl font-bold text-terre tracking-tight">Bonjour, Admin 👋</h2>
        <p className="text-pierre mt-1">Voici ce qui se passe aujourd'hui dans votre établissement</p>
      </section>

      {/* Alertes */}
      <section className="grid sm:grid-cols-3 gap-3">
        <Link href="/ecole/absences/liste" className="flex items-center gap-3 bg-papier rounded-2xl p-4 shadow-soft hover:border-rouge-terre/20 border border-transparent transition">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-rouge-terre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-lg font-bold tabular">{absencesDuJour}</p>
            <p className="text-xs text-pierre">Absences du jour</p>
          </div>
        </Link>
        <Link href="/ecole/payments" className="flex items-center gap-3 bg-papier rounded-2xl p-4 shadow-soft border border-transparent hover:border-ambre/30 transition">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-ambre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          </div>
          <div>
            <p className="text-lg font-bold tabular">{statistiques.elevesImpayes}</p>
            <p className="text-xs text-pierre">Élèves en impayé</p>
          </div>
        </Link>
        <Link href="/ecole/evenements" className="flex items-center gap-3 bg-papier rounded-2xl p-4 shadow-soft border border-transparent hover:border-terre/20 transition">
          <div className="w-10 h-10 rounded-xl bg-terre-soft text-terre flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <div>
            <p className="text-lg font-bold tabular">{evenementsPlanifies}</p>
            <p className="text-xs text-pierre">Événements à venir</p>
          </div>
        </Link>
      </section>

      {/* KPI */}
      <section>
        <h3 className="text-sm font-semibold text-pierre uppercase tracking-wide mb-3">Vue d'ensemble</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-papier rounded-3xl p-5 shadow-soft">
            <p className="text-sm text-pierre">Élèves actifs</p>
            <p className="text-3xl font-bold mt-1 tabular">{statistiques.totalEleves}</p>
            <p className="text-xs text-jardin mt-2">Actifs</p>
          </div>
          <div className="bg-papier rounded-3xl p-5 shadow-soft">
            <p className="text-sm text-pierre">Enseignants</p>
            <p className="text-3xl font-bold mt-1 tabular">{statistiques.totalEnseignants}</p>
            <p className="text-xs text-pierre mt-2">{statistiques.enseignantsPresents} présents</p>
          </div>
          <div className="bg-papier rounded-3xl p-5 shadow-soft">
            <p className="text-sm text-pierre">Classes</p>
            <p className="text-3xl font-bold mt-1 tabular">{statistiques.classesActives}</p>
            <p className="text-xs text-pierre mt-2">Actives</p>
          </div>
          <div className="bg-papier rounded-3xl p-5 shadow-soft">
            <p className="text-sm text-pierre">Recettes (mois)</p>
            <p className="text-3xl font-bold mt-1 tabular">{(statistiques.totalRecettes / 1000000).toFixed(1)} M</p>
            <p className="text-xs text-pierre mt-2">FCFA</p>
          </div>
        </div>
      </section>

      {/* Actions rapides */}
      <section>
        <h3 className="text-sm font-semibold text-pierre uppercase tracking-wide mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/ecole/inscriptions" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-terre-soft text-terre flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <p className="text-sm font-medium">Inscriptions</p>
          </Link>
          <Link href="/ecole/students" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-soleil-soft text-soleil flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <p className="text-sm font-medium">Élèves</p>
          </Link>
          <Link href="/ecole/enseignants" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-green-50 text-jardin flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
            </div>
            <p className="text-sm font-medium">Enseignants</p>
          </Link>
          <Link href="/ecole/payments" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-50 text-ambre flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <p className="text-sm font-medium">Paiements</p>
          </Link>
          <Link href="/ecole/registre-appel" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-terre-soft text-terre flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <p className="text-sm font-medium">Présences</p>
          </Link>
          <Link href="/ecole/dossiers-papier" className="bg-papier rounded-2xl p-4 shadow-soft text-center hover:shadow-soft-lg hover:-translate-y-0.5 transition">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-soleil-soft text-soleil flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </div>
            <p className="text-sm font-medium">Dossiers</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
