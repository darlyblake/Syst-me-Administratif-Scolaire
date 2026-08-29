"use client"

import { BarChart3, Bell, CalendarDays, ClipboardCheck, Users, WalletCards } from "lucide-react"
import { Reveal } from "./Reveal"

const features = [
  [Users, "Élèves & classes", "Structure scolaire et inscriptions organisées."],
  [ClipboardCheck, "Notes & présences", "Suivi des résultats et des présences."],
  [WalletCards, "Scolarité & paiements", "Mensualités, tranches, échéanciers et reçus."],
  [CalendarDays, "Emploi du temps", "Horaires, classes, salles et enseignants."],
  [Bell, "Communication", "Les informations importantes au bon endroit."],
  [BarChart3, "Tableaux de bord", "Les indicateurs utiles pour piloter l'activité."],
] as const

export function FeaturesSection() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <Reveal>
            <div>
              <p className="text-sm font-semibold text-slate-500">Tout le nécessaire</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Des outils qui travaillent ensemble.
              </h2>
              <p className="mt-4 max-w-lg text-slate-600">
                De l'inscription au suivi quotidien, les informations restent organisées pour faciliter le travail de toute
                la communauté scolaire.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 70}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-[#fafaf8] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                  <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
