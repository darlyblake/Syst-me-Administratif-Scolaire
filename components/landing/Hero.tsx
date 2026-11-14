"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, ShieldCheck, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./Reveal"
import { DashboardPreview } from "./DashboardPreview"

export function Hero() {
  const router = useRouter()

  return (
    <section id="presentation" className="landing-hero relative isolate overflow-hidden">
      <div className="landing-hero-orb landing-hero-orb-one" aria-hidden="true" />
      <div className="landing-hero-orb landing-hero-orb-two" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10 lg:pb-24 lg:pt-24">
        <Reveal className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Une plateforme pour toute la communauté scolaire
          </div>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.65rem]">
            La gestion scolaire,
            <span className="block text-blue-800">plus simple au quotidien.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Établissements, enseignants et parents disposent chacun d’un espace clair pour organiser et suivre la vie scolaire.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="rounded-full bg-blue-800 px-6 text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-900 hover:shadow-lg"
              onClick={() => router.push("/login")}
            >
              Accéder à mon espace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-slate-300 bg-white/90 px-6 text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
              onClick={() => document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" })}
            >
              Découvrir les espaces
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500">
            {["Élèves", "Notes", "Présences", "Paiements"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-blue-700" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140}>
          <DashboardPreview />
        </Reveal>
      </div>
    </section>
  )
}
