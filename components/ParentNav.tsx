"use client"

import { AppBrandMark } from "@/components/brand/AppBrandMark"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, GraduationCap, CalendarDays, BookOpen, FileText, Bell,
  MessageSquare, UserRound, Menu, X, LogOut, ClipboardList, Users,
  ChevronRight, MoreHorizontal,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const sections = [
  {
    title: "Vue générale",
    items: [{ href: "/parents/tableau-bord", label: "Aujourd’hui", icon: LayoutDashboard }],
  },
  {
    title: "Vie scolaire",
    items: [
      { href: "/parents/enfants", label: "Mes enfants", icon: Users },
      { href: "/parents/absences", label: "Présences et absences", icon: CalendarDays },
      { href: "/parents/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
      { href: "/parents/cahier-de-textes", label: "Cahier de textes", icon: BookOpen },
      { href: "/parents/evenements", label: "Événements", icon: CalendarDays },
    ],
  },
  {
    title: "Échanges et compte",
    items: [
      { href: "/parents/notes", label: "Résultats", icon: GraduationCap },
      { href: "/parents/messages", label: "Messagerie", icon: MessageSquare, badge: "msgs" as const },
      { href: "/parents/paiements", label: "Paiements", icon: ClipboardList },
      { href: "/parents/documents", label: "Documents", icon: FileText },
      { href: "/parents/notifications", label: "Notifications", icon: Bell, badge: "notifs" as const },
      { href: "/parents/profil", label: "Mon compte", icon: UserRound },
    ],
  },
]

const mobileTabs = [
  { href: "/parents/tableau-bord", label: "Accueil", icon: LayoutDashboard, matches: ["/parents/tableau-bord"] },
  { href: "/parents/enfants", label: "Enfants", icon: Users, matches: ["/parents/enfants"] },
  { href: "/parents/absences", label: "Suivi", icon: CalendarDays, matches: ["/parents/absences", "/parents/emploi-du-temps", "/parents/cahier-de-textes", "/parents/evenements", "/parents/notes"] },
  { href: "/parents/messages", label: "Messages", icon: MessageSquare, matches: ["/parents/messages"] },
]

export function ParentNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [queryString, setQueryString] = useState("")
  const { utilisateur, deconnecter } = useAuthentification()
  const { notifications } = useParentPortal()
  const unreadNotifications = notifications.filter((notification) => !notification.read_at).length
  const [open, setOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => { setQueryString(typeof window !== "undefined" ? window.location.search : "") }, [pathname])

  useEffect(() => {
    let mounted = true
    const loadUnreadMessages = async () => {
      if (!utilisateur?.id) {
        setUnreadMessages(0)
        return
      }
      const { data: participants, error } = await supabaseBrowser
        .from("conversation_participants")
        .select("conversation_id,last_read_at")
        .eq("user_id", utilisateur.id)
      if (!mounted) return
      if (error || !participants?.length) {
        setUnreadMessages(0)
        return
      }
      const ids = participants.map((item) => item.conversation_id).filter(Boolean)
      if (!ids.length) {
        setUnreadMessages(0)
        return
      }
      const { data: messages } = await supabaseBrowser
        .from("messages")
        .select("conversation_id,sender_id,created_at")
        .in("conversation_id", ids)
        .neq("sender_id", utilisateur.id)
      const reads = new Map(participants.map((item) => [
        item.conversation_id,
        item.last_read_at ? Date.parse(item.last_read_at) : 0,
      ]))
      if (mounted) {
        setUnreadMessages((messages ?? []).filter(
          (message) => Date.parse(message.created_at) > (reads.get(message.conversation_id) ?? 0),
        ).length)
      }
    }
    void loadUnreadMessages()
    return () => { mounted = false }
  }, [utilisateur?.id, pathname])

  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (pathname !== path && !pathname?.startsWith(path + "/")) return false
    if (query) {
      const expected = new URLSearchParams(query)
      for (const [key, value] of expected.entries()) if (new URLSearchParams(queryString).get(key) !== value) return false
      return true
    }
    if (path === "/parents/cahier-de-textes" && new URLSearchParams(queryString).get("tab") === "homework") return true
    return true
  }

  const isTabActive = (matches: string[]) =>
    matches.some((path) => pathname === path || pathname?.startsWith(path + "/"))

  const badge = (key?: "notifs" | "msgs") => key === "notifs" ? unreadNotifications : key === "msgs" ? unreadMessages : 0

  const logout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setOpen(false)
    try {
      await deconnecter()
    } finally {
      router.replace("/connexion")
      router.refresh()
      setLoggingOut(false)
    }
  }

  const NavLink = ({ item }: { item: (typeof sections)[number]["items"][number] }) => {
    const Icon = item.icon
    const count = "badge" in item ? badge(item.badge) : 0
    const active = isActive(item.href)
    return (
      <Link href={item.href} onClick={() => setOpen(false)} className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
        active ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
      )}>
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-blue-700" : "text-slate-400")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {count > 0 && <span className="min-w-5 rounded-full bg-blue-700 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">{count > 99 ? "99+" : count}</span>}
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </Link>
    )
  }

  const Navigation = () => (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{section.title}</p>
          <div className="space-y-1">{section.items.map((item) => <NavLink key={item.href} item={item} />)}</div>
        </div>
      ))}
    </nav>
  )

  const initials = (utilisateur?.nomUtilisateur ?? "P").trim().slice(0, 2).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-8 lg:ml-[248px] lg:flex">
        <p className="text-sm text-slate-500">NOVA <span className="px-1 text-slate-300">/</span><span className="font-semibold text-slate-800">Portail parent</span></p>
        <Link href="/parents/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} non lues` : "Notifications"} className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-50">
          <Bell className="h-[18px] w-[18px]" />
          {unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
        </Link>
      </header>

      <header className="parent-mobile-topbar sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppBrandMark size={30} className="rounded-md" />
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">NOVA Portail parent</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/parents/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
          </Link>
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav aria-label="Navigation principale" className="parent-mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileTabs.map(({ href, label, icon: Icon, matches }) => {
            const active = isTabActive(matches)
            const count = href === "/parents/messages" ? unreadMessages : 0
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(
                "relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-0.5 text-[10px] font-medium",
                active ? "text-blue-800" : "text-slate-500 hover:text-slate-800",
              )}>
                <span className="relative"><Icon className="h-5 w-5 shrink-0" />{count > 0 && <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-blue-700 px-1 text-center text-[9px] leading-4 text-white">{count > 9 ? "9+" : count}</span>}</span>
                <span className="max-w-full truncate">{label}</span>
                {active && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-700" />}
              </Link>
            )
          })}
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir toutes les rubriques" aria-expanded={open} className="relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-0.5 text-[10px] font-medium text-slate-500">
            <MoreHorizontal className="h-5 w-5" />
            <span>Plus</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}>
          <aside role="dialog" aria-modal="true" aria-label="Menu de l’espace parent" className="parent-mobile-menu-sheet flex h-full w-[min(340px,88vw)] max-w-full flex-col overflow-hidden bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-800">{initials}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{utilisateur?.nomUtilisateur ?? "Parent"}</p><p className="text-xs text-slate-500">NOVA Portail parent</p></div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4"><Navigation /></div>
            <Button variant="outline" className="mt-3 min-h-11 w-full shrink-0" onClick={() => void logout()} disabled={loggingOut}>
              <LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}
            </Button>
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="mb-5 flex items-center gap-3">
            <AppBrandMark size={36} className="rounded-md" />
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">GESTION SCOLAIRE</p><p className="text-[15px] font-semibold text-slate-900">Portail parent</p></div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-800">{initials}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{utilisateur?.nomUtilisateur ?? "Parent"}</p><p className="text-xs text-slate-500">Portail des familles</p></div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><Navigation /></div>
        <div className="border-t border-slate-200 p-3">
          <Button variant="ghost" className="min-h-11 w-full justify-start text-slate-600 hover:bg-slate-50" onClick={() => void logout()} disabled={loggingOut}>
            <LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}
          </Button>
        </div>
      </aside>
    </>
  )
}
