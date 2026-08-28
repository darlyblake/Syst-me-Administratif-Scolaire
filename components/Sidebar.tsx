"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Archive,
  BarChart3,
  Banknote,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Timer,
  Users,
  UserRound,
  Wrench,
} from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/")

  const navItems = [
    {
      section: "Principal",
      items: [
        { href: "/ecole/tableau-bord", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/ecole/inscriptions", label: "Inscriptions", icon: ClipboardList },
        { href: "/ecole/students", label: "Élèves", icon: Users },
        { href: "/ecole/dossiers-papier", label: "Dossiers papier", icon: FolderOpen },
      ],
    },
    {
      section: "Pédagogie",
      items: [
        { href: "/ecole/classes", label: "Classes", icon: GraduationCap },
        { href: "/ecole/notes", label: "Notes & bulletins", icon: BarChart3 },
        { href: "/ecole/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
        { href: "/ecole/registre-appel", label: "Présences", icon: CheckSquare },
        { href: "/ecole/absences", label: "Absences", icon: Calendar },
        { href: "/ecole/matieres", label: "Matières", icon: BookOpen },
        { href: "/ecole/evaluation", label: "Évaluation", icon: ClipboardList },
        { href: "/ecole/options", label: "Options", icon: Wrench },
      ],
    },
    {
      section: "Personnel",
      items: [
        { href: "/ecole/enseignants", label: "Enseignants", icon: UserRound },
        { href: "/ecole/personnel", label: "Personnel & paie", icon: Users },
        { href: "/ecole/etat-salaire", label: "État salaire", icon: Banknote },
        { href: "/ecole/heures-vacataires", label: "Heures vacataires", icon: Timer },
      ],
    },
    {
      section: "Finances",
      items: [
        { href: "/ecole/payments", label: "Paiements", icon: CreditCard },
        { href: "/ecole/comptabilite", label: "Comptabilité", icon: ClipboardList },
      ],
    },
    {
      section: "Administration",
      items: [
        { href: "/ecole/archivage", label: "Archivage", icon: Archive },
        { href: "/ecole/documents", label: "Documents", icon: FileText },
      ],
    },
    {
      section: "Autres",
      items: [
        { href: "/ecole/communication", label: "Communication", icon: MessageSquare },
        { href: "/ecole/evenements", label: "Événements", icon: CalendarDays },
        { href: "/ecole/settings", label: "Paramètres", icon: Settings },
      ],
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-encre/30 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-papier border-r border-terre/10 flex flex-col transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-terre/8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-terre text-white flex items-center justify-center font-bold text-sm shrink-0">
            EV
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-terre text-sm leading-tight truncate">
              Collège Les Palmiers
            </p>
            <p className="text-xs text-pierre">2025 – 2026</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((group) => (
            <div key={group.section}>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-pierre mb-2">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                        isActive(item.href)
                          ? "bg-terre text-white font-medium"
                          : "text-encre hover:bg-terre-soft"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User bas sidebar */}
        <div className="p-3 border-t border-terre/8">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-terre-soft text-terre text-xs font-semibold flex items-center justify-center">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">Admin</p>
              <p className="text-xs text-pierre">École</p>
            </div>
            <button
              aria-label="Déconnexion"
              className="p-2 rounded-md hover:bg-terre-soft text-pierre"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
