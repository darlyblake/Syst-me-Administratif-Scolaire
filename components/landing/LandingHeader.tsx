"use client"

import { useRouter } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"
import { useAuthentification } from "@/providers/authentification.provider"
import { UserProfileDropdown } from "@/components/UserProfileDropdown"

export function LandingHeader() {
  const router = useRouter()
  const { estConnecte, estEnCoursDeChargement } = useAuthentification()

  return (
    <header className="landing-header sticky top-0 z-50 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
          aria-label="Retour en haut de page"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-slate-900">{APP_NAME}</span>
            <span className="hidden text-[11px] text-slate-500 sm:block">{APP_TAGLINE}</span>
          </span>
        </button>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          <a href="#presentation" className="landing-nav-link">Présentation</a>
          <a href="#roles" className="landing-nav-link">Les espaces</a>
          <a href="#features" className="landing-nav-link">Fonctionnalités</a>
          <a href="#captures" className="landing-nav-link">Aperçu</a>
        </nav>

        {!estEnCoursDeChargement && estConnecte ? (
          <UserProfileDropdown />
        ) : (
          <Button
            variant="outline"
            className="rounded-full border-blue-200 bg-white px-5 text-blue-800 transition-all hover:border-blue-800 hover:bg-blue-50"
            onClick={() => router.push("/login")}
          >
            Se connecter
          </Button>
        )}
      </div>
      <nav aria-label="Navigation mobile" className="flex gap-5 overflow-x-auto border-t border-blue-50 px-5 py-2.5 text-xs font-medium text-slate-600 lg:hidden">
        <a href="#presentation" className="shrink-0">Présentation</a>
        <a href="#roles" className="shrink-0">Les espaces</a>
        <a href="#features" className="shrink-0">Fonctionnalités</a>
        <a href="#captures" className="shrink-0">Aperçu</a>
      </nav>
    </header>
  )
}
