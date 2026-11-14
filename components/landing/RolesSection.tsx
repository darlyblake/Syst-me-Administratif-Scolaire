"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, Check, GraduationCap, LayoutDashboard, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./Reveal"
import { useRouter } from "next/navigation"

const roles = [
  {
    key: "ecole",
    title: "Administration",
    eyebrow: "Piloter l’établissement",
    description: "Une vue d’ensemble pour organiser l’établissement, suivre les élèves et garder les informations administratives et financières au même endroit.",
    points: ["Inscriptions et dossiers des élèves", "Classes, niveaux et équipe pédagogique", "Scolarité, paiements et reçus", "Activités et suivi de l’établissement"],
    image: "/captures/dashboard-admin.png",
    imageAlt: "Tableau de bord de l’administration",
    href: "/login?espace=ecole",
    icon: LayoutDashboard,
  },
  {
    key: "enseignant",
    title: "Enseignants",
    eyebrow: "Organiser le suivi pédagogique",
    description: "Les outils du quotidien sont réunis dans un espace dédié pour préparer les cours et suivre les élèves de chaque classe.",
    points: ["Registre d’appel et suivi des présences", "Notes et évaluations", "Cahier de textes", "Emploi du temps et classes"],
    image: "/captures/espace-enseignant.png",
    imageAlt: "Espace de travail des enseignants",
    href: "/login?espace=enseignant",
    icon: GraduationCap,
  },
  {
    key: "parent",
    title: "Parents",
    eyebrow: "Suivre la scolarité de son enfant",
    description: "Les familles disposent d’un point d’accès simple pour consulter les informations scolaires et rester au courant de la vie de l’établissement.",
    points: ["Résultats et informations scolaires", "Présences et absences", "Documents à consulter", "Paiements et notifications"],
    image: "/captures/espace-parent.png",
    imageAlt: "Espace de suivi des parents",
    href: "/login?espace=parent",
    icon: Users,
  },
]

export function RolesSection() {
  const [active, setActive] = useState("ecole")
  const router = useRouter()
  const selectedRole = roles.find((role) => role.key === active) ?? roles[0]
  const ActiveIcon = selectedRole.icon

  return (
    <section id="roles" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-800">Une plateforme, trois espaces</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Découvrez votre espace de travail.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Sélectionnez un profil pour découvrir les outils et l’interface qui lui sont dédiés.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-10 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm sm:flex-row" role="tablist" aria-label="Choisir un espace">
          {roles.map((role) => {
            const Icon = role.icon
            const isActive = active === role.key
            return (
              <button
                key={role.key}
                id={`role-tab-${role.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="role-panel"
                onClick={() => setActive(role.key)}
                className={`flex min-h-14 flex-1 items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                  isActive ? "bg-blue-800 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {role.title}
              </button>
            )
          })}
        </div>
      </Reveal>

      <div
        id="role-panel"
        role="tabpanel"
        aria-labelledby={`role-tab-${selectedRole.key}`}
        className="mt-5 grid overflow-hidden rounded-2xl border border-blue-100 bg-white lg:grid-cols-[0.82fr_1.18fr]"
      >
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-11">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <ActiveIcon className="h-5 w-5" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">{selectedRole.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{selectedRole.title}</h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">{selectedRole.description}</p>

          <ul className="mt-6 space-y-3">
            {selectedRole.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800">
                  <Check className="h-3 w-3" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button
              size="lg"
              className="w-full rounded-full bg-blue-800 text-white hover:bg-blue-900 sm:w-auto"
              onClick={() => router.push(selectedRole.href)}
            >
              Accéder à cet espace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 items-center border-t border-blue-100 bg-slate-50 p-3 sm:p-5 lg:border-l lg:border-t-0 lg:p-7">
          <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_45px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex h-10 items-center justify-between border-b border-slate-100 px-3 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-700" />
                <span className="text-xs font-medium text-slate-600">{selectedRole.title}</span>
              </div>
              <span className="text-[10px] text-slate-400">Aperçu de l’application</span>
            </div>
            <Image
              key={selectedRole.image}
              src={selectedRole.image}
              alt={selectedRole.imageAlt}
              width={1600}
              height={1000}
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">Les aperçus présentés sont des captures de l’application.</p>
    </section>
  )
}
