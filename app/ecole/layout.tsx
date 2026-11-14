"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, Menu, Settings, UserCircle } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import type React from "react"
import Sidebar from "@/components/Sidebar"
import { PermissionRoute } from "@/components/auth/PermissionRoute"
import { useAuthentification } from "@/providers/authentification.provider"
import { getSchoolRoleLabel, getUserInitials } from "@/lib/organization/role-labels"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function EcoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, deconnecter } = useAuthentification()
  const userName = utilisateur?.nomUtilisateur?.trim() || contexte?.email || "Utilisateur"
  const userEmail = contexte?.email || ""
  const userRole = getSchoolRoleLabel(etablissementActif?.role ?? contexte?.establishments?.find((item) => item.id === utilisateur?.etablissementId)?.role)

  const handleAccountLogout = async () => {
    try {
      await deconnecter()
    } finally {
      router.replace("/connexion")
      router.refresh()
    }
  }

  return (
    <PermissionRoute>
      <div className="ecole-shell min-h-screen bg-[#faf8ff] text-[#131b2e]">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <div className="min-h-screen lg:pl-64">
          <header className="fixed left-0 right-0 top-0 z-30 h-14 border-b border-[#c5c5d3]/40 bg-white lg:left-64">
            <div className="flex h-full items-center justify-between px-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((value) => !value)}
                  aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
                  className="flex h-8 w-8 items-center justify-center rounded text-[#444651] hover:bg-[#f2f3ff] lg:hidden"
                >
                  <Menu className="h-4 w-4" strokeWidth={1.8} />
                </button>
                <div className="flex min-w-0 items-center gap-2 text-[12px]">
                  <span className="font-semibold text-[#00236f]">Espace Établissement</span>
                  <span className="text-[#c5c5d3]">/</span>
                  <span className="truncate text-[#515f74]">Gestion Scolaire Globale</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                <div className="hidden items-center gap-2 rounded border border-[#c5c5d3]/50 bg-[#f2f3ff] px-2.5 py-1 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#005049]" />
                  <span className="text-[12px] font-medium text-[#131b2e]">Année en cours</span>
                  <span className="text-[11px] text-[#515f74]">(En cours)</span>
                </div>

                <NotificationBell />

                <div className="border-l border-[#c5c5d3]/50 pl-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Ouvrir les options du compte"
                        className="flex min-h-9 items-center gap-2 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-[#f2f3ff] focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-2"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00236f] text-[11px] font-semibold text-white">
                          {getUserInitials(userName)}
                        </span>
                        <span className="hidden max-w-[150px] leading-tight sm:block">
                          <span className="block truncate text-[12px] font-semibold text-[#131b2e]">{userName}</span>
                          <span className="block truncate text-[11px] text-[#515f74]">{userRole}</span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-[#444651]" strokeWidth={1.8} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 border-[#d7dae3] bg-white p-1.5">
                      <DropdownMenuLabel className="px-2 py-2 font-normal">
                        <span className="block truncate text-sm font-semibold text-[#172033]">{userName}</span>
                        {userEmail && <span className="mt-0.5 block truncate text-xs text-[#64748b]">{userEmail}</span>}
                        <span className="mt-1 block text-xs text-[#1e3a8a]">{userRole}</span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => router.push("/ecole/settings")} className="cursor-pointer py-2 text-sm">
                        <Settings className="h-4 w-4" />
                        Paramètres de l’établissement
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => void handleAccountLogout()} className="cursor-pointer py-2 text-sm text-[#b42318] focus:bg-[#fff1f0] focus:text-[#b42318]">
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 bg-[#faf8ff] px-3 pb-8 pt-[70px] sm:px-5 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </PermissionRoute>
  )
}
