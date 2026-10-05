"use client"

import { useState } from "react"
import type React from "react"
import Sidebar from "@/components/Sidebar"
import { PermissionRoute } from "@/components/auth/PermissionRoute"

export default function EcoleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
                  <span className="text-xl leading-none">{isSidebarOpen ? "×" : "☰"}</span>
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

                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative flex h-8 w-8 items-center justify-center rounded text-[#444651] hover:bg-[#f2f3ff]"
                >
                  <span className="text-[18px]">♧</span>
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ba1a1a]" />
                </button>

                <div className="hidden items-center gap-2 border-l border-[#c5c5d3]/50 pl-3 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00236f] text-white">
                    <span className="text-[15px]">♙</span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[12px] font-semibold text-[#131b2e]">Administration</p>
                    <p className="text-[11px] text-[#515f74]">Direction Générale</p>
                  </div>
                  <span className="ml-1 text-[13px] text-[#444651]">⌄</span>
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
