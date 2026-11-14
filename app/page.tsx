"use client"

import { useState } from "react"
import { LoginPage } from "@/components/auth/login/LoginPage"
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
import "./landing.css"

export default function PageAccueil() {
  const [authOpen, setAuthOpen] = useState(false)
  const openAuth = () => setAuthOpen(true)

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#f7faff] text-slate-950">
      <LandingHeader onOpenAuth={openAuth} />
      <Hero onOpenAuth={openAuth} />
      <StatsSection />
      <RolesSection />
      <FeaturesSection />
      <TeacherShowcase />
      <PaymentWorkflow />
      <ScreenshotShowcase
        index={0}
        title="Une vue claire sur votre établissement"
        description="Depuis le tableau de bord, l’administration retrouve rapidement les informations essentielles : effectifs, classes, activités et suivi de l’établissement."
        imagePath="/captures/dashboard-admin.png"
      />
      <ScreenshotShowcase
        index={1}
        title="Un espace parent simple à consulter"
        description="Les familles suivent la scolarité de leurs enfants au même endroit : informations scolaires, résultats, présences, documents et paiements."
        imagePath="/captures/espace-parent.png"
      />
      <ScreenshotShowcase
        index={2}
        title="Les enseignants ont leurs propres outils"
        description="L’espace enseignant facilite le suivi des classes, la saisie des notes, le registre d’appel et le cahier de textes."
        imagePath="/captures/espace-enseignant.png"
      />
      <CTASection onOpenAuth={openAuth} />
      <LandingFooter />
      {authOpen && <LoginPage isOverlay onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
