"use client"

import type { ReactNode } from "react"
import { Bell, BookOpenText, CalendarDays, ClipboardCheck, FileText, LogOut, Settings, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

type Props = {
  establishmentId: string
  establishmentName: string
  teacherName?: string
  active: "today" | "attendance" | "cahier" | "notes" | "planning"
  children: ReactNode
}

export function TeacherShell({ establishmentId, establishmentName, teacherName, active, children }: Props) {
  const router = useRouter()
  const { contexte, selectionnerEtablissement, deconnecter } = useAuthentification()

  const go = (path: string) => router.push(`/enseignant/etablissement/${establishmentId}${path}`)
  const items = [
    { key: "today" as const, label: "Aujourd’hui", icon: CalendarDays, path: "" },
    { key: "attendance" as const, label: "Appel", icon: ClipboardCheck, path: "/presences" },
    { key: "cahier" as const, label: "Cahier", icon: BookOpenText, path: "/cahier" },
    { key: "notes" as const, label: "Notes", icon: FileText, path: "/notes" },
    { key: "planning" as const, label: "Planning", icon: CalendarDays, path: "/planning" },
  ]

  const changeSchool = (id: string) => {
    if (id && selectionnerEtablissement(id)) router.push(`/enseignant/etablissement/${id}`)
  }

  return (
    <main className="min-h-screen w-full bg-[#f8f8fc] pb-24 text-[#172033]">
      <div className="mx-auto min-h-screen w-full max-w-screen-2xl bg-[#f8f8fc]">
        <header className="sticky top-0 z-30 border-b border-[#e4e6ef] bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <select
                aria-label="Établissement actif"
                value={establishmentId}
                onChange={(e) => changeSchool(e.target.value)}
                className="max-w-[220px] truncate rounded-md border border-[#dfe2ec] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#172033] outline-none"
              >
                {(contexte?.establishments ?? []).map((school) => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
              <p className="mt-1 truncate text-xs text-[#6d7280]">{teacherName || "Espace enseignant"} · {establishmentName}</p>
            </div>
            <button type="button" aria-label="Paramètres" onClick={() => router.push("/enseignant/profil")} className="rounded-md p-2 hover:bg-[#f3f4f8]"><Settings className="h-5 w-5 text-[#172033]" /></button>
            <button type="button" aria-label="Notifications" onClick={() => router.push("/enseignant/notifications")} className="relative rounded-md p-2 hover:bg-[#f3f4f8]">
              <Bell className="h-5 w-5 text-[#172033]" />
            </button>
            <button type="button" aria-label="Profil" onClick={() => router.push("/enseignant/profil")} className="rounded-md bg-[#0b2677] p-2 text-white hover:bg-[#09236d]">
              <UserRound className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Se déconnecter" onClick={() => void deconnecter()} className="hidden items-center gap-1.5 rounded-md border border-[#dfe2ec] bg-white px-2.5 py-2 text-sm font-medium text-[#4c5568] hover:bg-[#f3f4f8] sm:inline-flex"><LogOut className="h-4 w-4" />Déconnexion</button>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6">{children}</div>

        <nav aria-label="Navigation principale enseignant" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dedfea] bg-white/95 shadow-[0_-4px_16px_rgba(23,32,51,0.06)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-around px-2 py-2 sm:px-6 sm:py-2.5">
            {items.map(({ key, label, icon: Icon, path }) => {
              const selected = active === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => go(path)}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:py-2 sm:text-sm ${selected ? "bg-[#eef2ff] text-[#1737a6]" : "text-[#737887] hover:bg-[#f3f4f8] hover:text-[#172033]"}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${selected ? "stroke-[2.5]" : ""}`} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </main>
  )
}
