"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, GraduationCap, CalendarDays, BookOpen, FileText, Bell, MessageSquare, UserRound, Menu, X, LogOut, ClipboardList } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const principal = [
  { href: "/parents/tableau-bord", label: "Accueil", icon: LayoutDashboard },
  { href: "/parents/enfants", label: "Mes enfants", icon: Users },
  { href: "/parents/notes", label: "Résultats", icon: GraduationCap },
  { href: "/parents/absences", label: "Présences", icon: CalendarDays },
  { href: "/parents/cahier-de-textes", label: "Cahier de textes", icon: BookOpen },
  { href: "/parents/cahier-de-textes?tab=homework", label: "Devoirs", icon: ClipboardList },
  { href: "/parents/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
  { href: "/parents/paiements", label: "Scolarité & paiements", icon: ClipboardList },
]
const secondaire = [
  { href: "/parents/documents", label: "Documents", icon: FileText },
  { href: "/parents/notifications", label: "Notifications", icon: Bell, badge: "notifs" as const },
  { href: "/parents/messages", label: "Messages", icon: MessageSquare, badge: "msgs" as const },
  { href: "/parents/evenements", label: "Événements", icon: CalendarDays },
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

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
    if (path === "/parents/cahier-de-textes" && new URLSearchParams(queryString).get("tab") === "homework") return false
    return true
  }

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

  const NavItem = ({ href, label, icon: Icon, count = 0, close = false }: { href: string; label: string; icon: typeof LayoutDashboard; count?: number; close?: boolean }) => (
    <Link href={href} onClick={() => close && setOpen(false)} className={cn(
      "group flex min-h-10 min-w-0 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
      close
        ? (isActive(href) ? "bg-blue-800 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-900")
        : (isActive(href) ? "bg-blue-800 text-white shadow-[inset_3px_0_0_#60a5fa]" : "text-blue-100/85 hover:bg-white/10 hover:text-white"),
    )}>
      <Icon className={cn("h-[17px] w-[17px] shrink-0", close ? (isActive(href) ? "text-white" : "text-slate-400 group-hover:text-blue-700") : (isActive(href) ? "text-white" : "text-blue-200 group-hover:text-white"))} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && <span className="min-w-5 shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  )

  const Nav = ({ close = false }: { close?: boolean }) => (
    <nav className="space-y-6">
      <div><p className={cn("mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em]", close ? "text-slate-400" : "text-blue-200/65")}>Suivi scolaire</p><div className="space-y-1">{principal.map((item) => <NavItem key={item.href} {...item} close={close} />)}</div></div>
      <div><p className={cn("mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em]", close ? "text-slate-400" : "text-blue-200/65")}>Communication</p><div className="space-y-1">{secondaire.filter((item) => !(close && item.badge === "notifs")).map((item) => <NavItem key={item.href} {...item} count={badge(item.badge)} close={close} />)}</div></div>
    </nav>
  )

  const User = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex min-w-0 items-center gap-3", compact && "max-w-[calc(100%-48px)]")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-900">{(utilisateur?.nomUtilisateur ?? "P").slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[13px] font-semibold text-white">{utilisateur?.nomUtilisateur ?? "Parent"}</p>
        <p className="truncate text-[11px] text-blue-100/65">Espace parent</p>
      </div>
    </div>
  )

  const mobilePrimary = principal.slice(0, 4)

  return (
    <>
      <header className="sticky top-0 z-30 hidden h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-8 lg:ml-[248px] lg:flex"><p className="text-sm text-slate-500">Espace parent <span className="px-1 text-slate-300">/</span><span className="font-semibold text-slate-800">Portail des familles</span></p>
        <Link href="/parents/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} non lues` : "Notifications"} className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><Bell className="h-[18px] w-[18px]" />{unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}</Link>
      </header>

      <div className="sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src="/nova-logo.webp" alt="NOVA" width={30} height={30} className="shrink-0 rounded-md object-contain" />
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">NOVA</p><p className="truncate text-sm font-bold text-slate-900">Portail familles</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/parents/notifications" aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} non lues` : "Notifications"} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><Bell className="h-5 w-5" />{unreadNotifications > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}</Link>
          <Link href="/parents/profil" aria-label="Mon profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-[11px] font-bold text-white">{(utilisateur?.nomUtilisateur ?? "P").slice(0, 2).toUpperCase()}</Link>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-slate-200 bg-white px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobilePrimary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[10px] font-medium transition-colors", isActive(href) ? "text-blue-800" : "text-slate-500")}><Icon className="h-5 w-5 shrink-0" /><span className="max-w-full truncate">{label === "Accueil" ? "Accueil" : label === "Mes enfants" ? "Enfants" : label}</span>{isActive(href) && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-blue-700" />}</Link>)}
          <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir les autres rubriques" aria-expanded={open} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[10px] font-medium", open ? "text-blue-800" : "text-slate-500")}><Menu className="h-5 w-5" /><span>Plus</span></button>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}>
        <aside className="flex h-full w-[min(320px,88vw)] max-w-full flex-col overflow-hidden bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3"><Link href="/parents/profil" onClick={() => setOpen(false)} className="min-w-0 rounded-lg hover:bg-slate-50"><User compact /></Link><Button variant="ghost" size="icon" className="shrink-0 rounded-lg" onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></Button></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><Nav close /></div>
          <Button variant="outline" className="mt-4 w-full shrink-0 rounded-lg" onClick={() => void logout()} disabled={loggingOut}><LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}</Button>
        </aside>
      </div>}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] border-r border-[#0B2143] bg-[#102B55] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5"><div className="mb-5 flex items-center gap-3"><Image src="/nova-logo.webp" alt="NOVA" width={36} height={36} className="rounded-md bg-white p-1 object-contain" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/65">GESTION SCOLAIRE</p><p className="text-[15px] font-bold text-white">Portail familles</p></div></div><User /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><Nav /></div>
        <div className="border-t border-white/10 px-3 py-3"><Link href="/parents/profil" className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors", pathname === "/parents/profil" ? "bg-white/10 text-white" : "text-blue-100/85 hover:bg-white/10 hover:text-white")}><UserRound className="h-[17px] w-[17px] text-blue-200" />Mon profil</Link></div>
        <div className="border-t border-white/10 p-3"><Button variant="ghost" className="w-full justify-start rounded-md text-blue-100/75 hover:bg-white/10 hover:text-white" onClick={() => void logout()} disabled={loggingOut}><LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}</Button></div>
      </aside>
    </>
  )
}
