"use client"

import { Building2, Clock } from "lucide-react"
import { Reveal } from "./Reveal"

export function TeacherShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-slate-500">Pour les enseignants</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Gérez plusieurs établissements sans confusion.
          </h2>
          <p className="mt-4 text-slate-600">
            Les enseignants intervenant dans plusieurs établissements retrouvent immédiatement leurs classes, leurs élèves et leur emploi du temps général.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        {/* Multiple Establishments */}
        <Reveal delay={100}>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fafaf8] to-white p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Plusieurs établissements</h3>
            <p className="mt-2 text-sm text-slate-600">
              Retrouvez tous vos établissements en un coup d'œil.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">Établissement A</p>
                <p className="mt-1 text-xs text-slate-500">6ème A, 5ème B</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">Établissement B</p>
                <p className="mt-1 text-xs text-slate-500">4ème C, 3ème A</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* General Schedule */}
        <Reveal delay={150}>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fafaf8] to-white p-8">
            <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Emploi du temps général</h3>
            <p className="mt-2 text-sm text-slate-600">
              Un calendrier unifié de tous vos cours, peu importe l'établissement.
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <p className="font-medium">Lundi</p>
                  <p className="mt-1 text-xs text-slate-500">08:00 – Établissement A, 6ème A</p>
                  <p className="text-xs text-slate-500">10:00 – Établissement A, 5ème B</p>
                </div>
              </div>
              <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <p className="font-medium">Mardi</p>
                  <p className="mt-1 text-xs text-slate-500">08:00 – Établissement B, 4ème C</p>
                  <p className="text-xs text-slate-500">14:00 – Établissement A, 3ème A</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
