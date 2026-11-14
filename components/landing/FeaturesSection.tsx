"use client"

import { BarChart3, Bell, CalendarDays, ClipboardCheck, Users, WalletCards } from "lucide-react"
import { Reveal } from "./Reveal"

const features = [
  [Users, "Élèves & classes", "Dossiers, inscriptions et organisation des classes."],
  [ClipboardCheck, "Notes & présences", "Saisie des évaluations et suivi des présences."],
  [WalletCards, "Scolarité & paiements", "Échéanciers, règlements et reçus de paiement."],
  [CalendarDays, "Emploi du temps", "Organisation des cours, horaires et enseignants."],
  [Bell, "Notifications", "Les informations importantes transmises aux familles."],
  [BarChart3, "Tableaux de bord", "Une vue synthétique pour suivre l’activité scolaire."],
] as const

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-28 border-y border-blue-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <Reveal>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-800">Les fonctionnalités</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Les outils essentiels, réunis.
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-slate-600">
                Les informations restent organisées entre l’administration, les enseignants et les familles pour faciliter le suivi de la scolarité.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, text], i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="group h-full rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-[0_12px_30px_-22px_rgba(30,64,175,0.45)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-800 transition-colors group-hover:bg-blue-800 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
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
