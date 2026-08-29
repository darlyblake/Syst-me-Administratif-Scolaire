"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Reveal } from "./Reveal"

export function CTASection() {
  const router = useRouter()

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <Reveal>
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white transition-transform duration-500 hover:-translate-y-1 sm:px-12 lg:px-16 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm text-slate-400">Prêt à commencer ?</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Une gestion scolaire claire commence par un espace bien organisé.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-400">
                Choisissez votre espace et connectez-vous. Le système déterminera ensuite automatiquement votre profil et
                vos accès.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full px-7 transition-all hover:-translate-y-1 hover:shadow-lg"
              onClick={() => router.push("/login")}
            >
              Se connecter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
