"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import {
  Archive, BarChart3, Banknote, BookOpen, CalendarDays, CheckSquare,
  ClipboardList, FileText, FolderOpen, GraduationCap, LayoutDashboard,
  LogOut, Settings, Timer, Users, UserRound, Wrench, LifeBuoy,
  Inbox, TrendingUp, Wallet, CreditCard, Layers, School, UserCog,
  Fingerprint, ReceiptText, AlertTriangle, ClipboardCheck, CalendarRange
} from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

function SidebarInner({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { utilisateur } = useAuthentification()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/")
  const can = (permission: string) => hasEffectiveSchoolPermission(utilisateur, permission)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const { error } = await supabaseBrowser.auth.signOut({ scope: "local" })
      if (error) throw error
      Object.keys(localStorage)
        .filter((key) => /^(students|payments|school_|ecole_)/.test(key))
        .forEach((key) => localStorage.removeItem(key))
      router.replace("/connexion")
      router.refresh()
    } catch (error) {
      console.error("Erreur lors de la déconnexion", error)
      router.replace("/connexion")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navGroups = [
    {
      section: null,
      items: [
        { href: "/ecole/tableau-bord", label: "Tableau de bord", icon: LayoutDashboard, permission: "dashboard.view" },
      ],
    },
    {
      section: "Scolarité",
      items: [
        { href: "/ecole/students", label: "Élèves", icon: School, permission: "students.view" },
        { href: "/ecole/inscriptions", label: "Inscriptions", icon: ClipboardCheck, permission: "enrollment.view" },
        { href: "/ecole/classes", label: "Classes", icon: GraduationCap, permission: "classes.view" },
        { href: "/ecole/matieres", label: "Matières", icon: BookOpen, permission: "subjects.view" },
        { href: "/ecole/options", label: "Options", icon: Wrench, permission: "settings.view" },
        { href: "/ecole/structure", label: "Structure académique", icon: Layers, permission: "settings.view" },
        { href: "/ecole/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays, permission: "timetable.view" },
        { href: "/ecole/cahier", label: "Cahier de textes", icon: BookOpen, permission: "academic.manage" },
        { href: "/ecole/evaluation", label: "Évaluations / Notes", icon: ClipboardList, permission: "grades.view" },
      ],
    },
    {
      section: "Personnel",
      items: [
        { href: "/ecole/enseignants", label: "Enseignants", icon: UserRound, permission: "staff.view" },
        { href: "/ecole/personnel", label: "Personnel", icon: UserCog, permission: "staff.view" },
        { href: "/ecole/personnel/pointage", label: "Pointage / Présence", icon: Fingerprint, permission: "staff.view" },
        { href: "/ecole/heures-vacataires", label: "Heures effectuées", icon: Timer, permission: "staff.view" },
        { href: "/ecole/finance/paie", label: "État de salaire", icon: ReceiptText, permission: "finance.view" },
      ],
    },
    {
      section: "Vie scolaire",
      items: [
        { href: "/ecole/registre-appel", label: "Registre d'appel", icon: CheckSquare, permission: "attendance.view" },
        { href: "/ecole/absences", label: "Absences", icon: AlertTriangle, permission: "attendance.view" },
        { href: "/ecole/absences/justifications", label: "Justifications", icon: ClipboardCheck, permission: "attendance.view" },
        { href: "/ecole/evenements", label: "Événements", icon: CalendarRange, permission: "events.view" },
      ],
    },
    {
      section: "Finance",
      items: [
        { href: "/ecole/finance/paiements", label: "Scolarité", icon: CreditCard, permission: "finance.view" },
        { href: "/ecole/finance/caisse", label: "Paiements / Mouvements", icon: Layers, permission: "finance.view" },
        { href: "/ecole/finance/depenses", label: "Dépenses", icon: FileText, permission: "finance.view" },
        { href: "/ecole/finance/paie", label: "Paie", icon: Banknote, permission: "finance.view" },
        { href: "/ecole/finance/paie/configuration", label: "Configuration des salaires", icon: Settings, permission: "finance.view" },
        { href: "/ecole/finance/avances", label: "Avances sur salaire", icon: Wallet, permission: "finance.view" },
        { href: "/ecole/finance/rapports", label: "Rapports", icon: BarChart3, permission: "finance.view" },
      ],
    },
    {
      section: "Documents",
      items: [
        { href: "/ecole/documents", label: "Documents administratifs", icon: FileText, permission: "documents.view" },
        { href: "/ecole/dossiers-papier", label: "Dossiers élèves", icon: FolderOpen, permission: "documents.view" },
        { href: "/ecole/archivage", label: "Archivage", icon: Archive, permission: "documents.view" },
      ],
    },
    {
      section: "Communication",
      items: [
        { href: "/ecole/communication", label: "Communication", icon: Inbox, permission: "documents.view" },
        { href: "/ecole/demandes", label: "Demandes", icon: Inbox, permission: "documents.view" },
      ],
    },
    {
      section: "Paramètres",
      items: [
        { href: "/ecole/settings", label: "Établissement", icon: Settings, permission: "settings.view" },
        { href: "/ecole/settings/annee-academique", label: "Année académique", icon: CalendarDays, permission: "settings.view" },
        { href: "/ecole/settings/scolarite", label: "Scolarité / Frais", icon: CreditCard, permission: "settings.view" },
        { href: "/ecole/settings/roles", label: "Rôles & Permissions", icon: UserCog, permission: "settings.view" },
        { href: "/ecole/settings/finance", label: "Paramètres financiers", icon: Settings, permission: "settings.view" },
      ],
    },
  ]

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => can(item.permission)) }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-30 bg-[#131b2e]/35 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#c5c5d3]/45 bg-white",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#c5c5d3]/35 px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#00236f] text-[11px] font-bold text-white">
            SAS
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-5 text-[#00236f]">SAS École</p>
            <p className="truncate text-[11px] leading-4 text-[#515f74]">Administration Centrale</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-2">
            {visibleGroups.map((group) => (
              <div key={group.section ?? "principal"}>
                {group.section && (
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#515f74]">
                    {group.section}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={[
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-[#00236f] text-white"
                            : "text-[#444651] hover:bg-[#eaedff] hover:text-[#131b2e]",
                        ].join(" ")}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[#c5c5d3]/35 p-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d5e3fc] text-[11px] font-semibold text-[#00236f]">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-[#131b2e]">Administration</p>
              <p className="truncate text-[11px] text-[#515f74]">Espace établissement</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Déconnexion"
              title="Déconnexion"
              className="rounded p-1.5 text-[#515f74] transition-colors hover:bg-[#ffdad6] hover:text-[#ba1a1a] disabled:opacity-50"
            >
              {isLoggingOut ? <span className="text-[11px]">…</span> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={<aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-[#c5c5d3]/45 bg-white lg:block" />}>
      <SidebarInner {...props} />
    </Suspense>
  )
}
