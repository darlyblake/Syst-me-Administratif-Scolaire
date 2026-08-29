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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f8f7f3]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-70"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{APP_NAME}</span>
            <span className="hidden text-[11px] text-slate-500 sm:block">{APP_TAGLINE}</span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#presentation" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Présentation
          </a>
          <a href="#features" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Fonctionnalités
          </a>
          <a href="#roles" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Pour les établissements
          </a>
          <a href="#roles" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Pour les enseignants
          </a>
          <a href="#roles" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
            Pour les parents
          </a>
        </nav>

        {!estEnCoursDeChargement && estConnecte ? (
          <UserProfileDropdown />
        ) : (
          <Button
            variant="outline"
            className="rounded-full bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => router.push("/login")}
          >
            Se connecter
          </Button>
        )}
      </div>
    </header>
  )
}
