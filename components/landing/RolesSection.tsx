"use client"

import React, { useState } from "react"
import { GraduationCap, LayoutDashboard, Users } from "lucide-react"
import { Reveal } from "./Reveal"
import { RoleCard } from "./RoleCard"

const roles = [
  {
    key: "ecole",
    title: "Administration",
    description: "Gérez les élèves, les classes, les inscriptions, les équipes et le suivi financier de l’établissement.",
    points: ["Inscriptions et dossiers", "Classes et enseignants", "Scolarité et paiements", "Suivi des activités"],
    href: "/login?espace=ecole",
    icon: LayoutDashboard,
  },
  {
    key: "enseignant",
    title: "Enseignants",
    description: "Retrouvez vos classes et vos outils pédagogiques dans un espace dédié à votre travail quotidien.",
    points: ["Registre d’appel", "Notes et évaluations", "Cahier de textes", "Emploi du temps"],
    href: "/login?espace=enseignant",
    icon: GraduationCap,
  },
  {
    key: "parent",
    title: "Parents",
    description: "Consultez les informations scolaires de vos enfants et restez informés de leur suivi.",
    points: ["Résultats scolaires", "Présences et absences", "Documents scolaires", "Paiements et notifications"],
    href: "/login?espace=parent",
    icon: Users,
  },
]

export function RolesSection() {
  const [active, setActive] = useState("ecole")

  return (
    <section id="roles" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-800">Des accès adaptés</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Chaque utilisateur a son espace.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Une navigation adaptée à votre rôle, avec les informations et les outils utiles sans menus superflus.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {roles.map((role, i) => (
          <Reveal key={role.key} delay={i * 90}>
            <RoleCard
              icon={role.icon}
              title={role.title}
              description={role.description}
              points={role.points}
              href={role.href}
              isActive={active === role.key}
              onSelect={() => setActive(role.key)}
            />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
