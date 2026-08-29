"use client"

import React, { useState } from "react"
import { GraduationCap, LayoutDashboard, Users } from "lucide-react"
import { Reveal } from "./Reveal"
import { RoleCard } from "./RoleCard"

const roles = [
  {
    key: "ecole",
    title: "Mon établissement",
    description: "Gérez vos élèves, vos classes, vos enseignants, la scolarité et l'administration depuis un seul espace.",
    points: ["Élèves", "Classes", "Enseignants", "Paiements", "Notes", "Présences"],
    href: "/login?espace=ecole",
    icon: LayoutDashboard,
  },
  {
    key: "enseignant",
    title: "Mon espace Enseignant",
    description: "Retrouvez vos établissements, vos classes, vos élèves et votre emploi du temps depuis un seul espace.",
    points: ["Plusieurs établissements", "Classes", "Élèves", "Notes", "Devoirs", "Présences", "Emploi du temps"],
    href: "/login?espace=enseignant",
    icon: GraduationCap,
  },
  {
    key: "parent",
    title: "Mon espace Parent",
    description: "Suivez simplement la scolarité de vos enfants.",
    points: ["Résultats", "Présences", "Emploi du temps", "Informations", "Scolarité"],
    href: "/login?espace=parent",
    icon: Users,
  },
]

export function RolesSection() {
  const [active, setActive] = useState("ecole")

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-slate-500">Un espace pour chacun</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Une expérience adaptée à votre rôle.
          </h2>
          <p className="mt-4 text-slate-600">
            Pas de menus inutiles. Chaque utilisateur retrouve directement les informations et actions dont il a besoin.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {roles.map((role, i) => (
          <Reveal key={role.key} delay={i * 100}>
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
