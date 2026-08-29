"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, ShieldCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./Reveal"
import { DashboardPreview } from "./DashboardPreview"

export function Hero() {
  const router = useRouter()

  return (
    <section>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr] lg:pb-24">
        <Reveal className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm animate-float">
            <ShieldCheck className="h-3.5 w-3.5" />
            Une plateforme pensée pour la communauté scolaire
          </div>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Toute votre gestion scolaire,{" "}
            <span className="text-slate-500">au même endroit.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Une plateforme claire pour les établissements, les enseignants et les parents. Chacun retrouve uniquement les
            outils dont il a besoin.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="rounded-full px-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              onClick={() => router.push("/login?espace=ecole")}
            >
              Mon établissement
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6 bg-white transition-all hover:-translate-y-1 hover:shadow-md"
              onClick={() => router.push("/login?espace=enseignant")}
            >
              Mon espace enseignant
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6 bg-white transition-all hover:-translate-y-1 hover:shadow-md"
              onClick={() => router.push("/login?espace=parent")}
            >
              Mon espace parent
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {["Élèves", "Notes", "Présences", "Paiements", "Emploi du temps"].map((x) => (
              <span key={x} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900">
                <Check className="h-3.5 w-3.5" />
                {x}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <DashboardPreview />
        </Reveal>
      </div>
    </section>
  )
}
