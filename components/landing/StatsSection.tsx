"use client"

import { Reveal } from "./Reveal"
import { AnimatedCounter } from "./AnimatedCounter"

export function StatsSection() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <Reveal>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4 sm:px-8">
          <AnimatedCounter value={1200} label="Élèves gérés" />
          <AnimatedCounter value={70} label="Enseignants" />
          <AnimatedCounter value={40} label="Classes" />
          <AnimatedCounter value={99} label="Simplicité" suffix="%" />
        </div>
      </Reveal>
    </section>
  )
}
