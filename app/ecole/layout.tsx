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
          <header className="sticky top-0 z-20 h-14 border-b border-[#c5c5d3]/35 bg-white/95 backdrop-blur">
            <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((value) => !value)}
                  aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
                  className="rounded-lg p-2 text-[#444651] hover:bg-[#eaedff] lg:hidden"
                >
                  <span className="text-lg leading-none">{isSidebarOpen ? "×" : "☰"}</span>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#131b2e]">Espace Établissement</p>
                  <p className="truncate text-[11px] text-[#515f74]">Gestion scolaire globale · Année académique en cours</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Notifications"
                  className="relative rounded-lg p-2 text-[#444651] hover:bg-[#eaedff]"
                >
                  <span className="text-[17px]">●</span>
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                </button>
                <div className="hidden items-center gap-2 border-l border-[#c5c5d3]/45 pl-3 sm:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d5e3fc] text-[10px] font-semibold text-[#00236f]">AD</div>
                  <div className="leading-tight">
                    <p className="text-[12px] font-medium text-[#131b2e]">Administration</p>
                    <p className="text-[10px] text-[#515f74]">Direction Générale</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 px-3 py-5 sm:px-4 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </PermissionRoute>
  )
}
