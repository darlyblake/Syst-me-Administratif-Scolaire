"use client"

import { LandingHeader } from "@/components/landing/LandingHeader"
import { Hero } from "@/components/landing/Hero"
import { StatsSection } from "@/components/landing/StatsSection"
import { RolesSection } from "@/components/landing/RolesSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"
import { TeacherShowcase } from "@/components/landing/TeacherShowcase"
import { PaymentWorkflow } from "@/components/landing/PaymentWorkflow"
import { ScreenshotShowcase } from "@/components/landing/ScreenshotShowcase"
import { CTASection } from "@/components/landing/CTASection"
import { LandingFooter } from "@/components/landing/LandingFooter"

export default function PageAccueil() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7f3] text-slate-950">
      <LandingHeader />
      <Hero />
      <StatsSection />
      <RolesSection />
      <FeaturesSection />
      <TeacherShowcase />
      <PaymentWorkflow />
      <ScreenshotShowcase
        index={0}
        title="Pilotez votre établissement"
        description="Un tableau de bord intuitif pour gérer l'ensemble de votre établissement. Visualisez vos élèves, vos classes, vos enseignants et vos financements en un coup d'œil."
      />
      <ScreenshotShowcase
        index={1}
        title="Suivez les résultats en temps réel"
        description="Les enseignants et les parents peuvent voir les notes, les présences et les devoirs instantanément. Plus de confusion, uniquement les informations pertinentes."
      />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
