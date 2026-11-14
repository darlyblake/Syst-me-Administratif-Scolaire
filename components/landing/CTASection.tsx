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
        <div className="landing-cta relative overflow-hidden rounded-2xl bg-blue-950 px-6 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
          <div className="landing-cta-orb" aria-hidden="true" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-200">Accès à la plateforme</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Retrouvez votre espace scolaire en quelques instants.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-blue-100/80">
                Connectez-vous avec votre compte pour accéder aux outils correspondant à votre profil.
              </p>
            </div>
            <Button
              size="lg"
              className="rounded-full bg-white px-7 text-blue-950 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
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
