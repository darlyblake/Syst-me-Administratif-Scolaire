"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, GraduationCap, CalendarDays, BookOpen, FileText, Bell, MessageSquare, UserRound, Menu, X, LogOut, ClipboardList } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
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
  { href: "/parents/profil", label: "Profil", icon: UserRound },
]

export function ParentNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [queryString, setQueryString] = useState("")
  const { utilisateur, deconnecter } = useAuthentification()
  const [open, setOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => { setQueryString(typeof window !== "undefined" ? window.location.search : "") }, [pathname])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!utilisateur?.id) return
      const [n, p] = await Promise.all([
        supabaseBrowser.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", utilisateur.id).is("read_at", null),
        supabaseBrowser.from("conversation_participants").select("conversation_id,last_read_at").eq("user_id", utilisateur.id),
      ])
      if (!mounted) return
      setUnreadNotifications(n.error ? 0 : n.count ?? 0)
      if (p.error || !p.data?.length) { setUnreadMessages(0); return }
      const ids = p.data.map((x) => x.conversation_id).filter(Boolean)
      if (!ids.length) { setUnreadMessages(0); return }
      const { data: messages } = await supabaseBrowser.from("messages").select("conversation_id,sender_id,created_at").in("conversation_id", ids).neq("sender_id", utilisateur.id)
      const reads = new Map(p.data.map((x) => [x.conversation_id, x.last_read_at ? Date.parse(x.last_read_at) : 0]))
      setUnreadMessages((messages ?? []).filter((m) => Date.parse(m.created_at) > (reads.get(m.conversation_id) ?? 0)).length)
    }
    void load()
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
      "group flex min-h-10 min-w-0 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
      isActive(href) ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
    )}>
      <Icon className={cn("h-[17px] w-[17px] shrink-0", isActive(href) ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && <span className="min-w-5 shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </Link>
  )

  const Nav = ({ close = false }: { close?: boolean }) => (
    <nav className="space-y-6">
      <div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Suivi scolaire</p><div className="space-y-1">{principal.map((item) => <NavItem key={item.href} {...item} close={close} />)}</div></div>
      <div><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Communication</p><div className="space-y-1">{secondaire.map((item) => <NavItem key={item.href} {...item} count={badge(item.badge)} close={close} />)}</div></div>
    </nav>
  )

  const User = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex min-w-0 items-center gap-3", compact && "max-w-[calc(100%-48px)]")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{(utilisateur?.nomUtilisateur ?? "P").slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-[13px] font-semibold text-slate-900">{utilisateur?.nomUtilisateur ?? "Parent"}</p>
        <p className="truncate text-[11px] text-slate-500">Espace parent</p>
      </div>
    </div>
  )

  const mobilePrimary = principal.slice(0, 4)

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src="/nova-logo.webp" alt="NOVA" width={30} height={30} className="shrink-0 rounded-md object-contain" />
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">NOVA</p><p className="truncate text-sm font-bold text-slate-900">Portail familles</p></div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-lg" onClick={() => setOpen(true)} aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 w-full overflow-hidden border-t border-slate-200 bg-white/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobilePrimary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium", isActive(href) ? "bg-blue-50 text-blue-700" : "text-slate-500")}><Icon className="h-4 w-4 shrink-0" /><span className="max-w-full truncate">{label === "Accueil" ? "Accueil" : label === "Mes enfants" ? "Enfants" : label}</span></Link>)}
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)}>
        <aside className="flex h-full w-[min(320px,88vw)] max-w-full flex-col overflow-hidden bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3"><User compact /><Button variant="ghost" size="icon" className="shrink-0 rounded-lg" onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></Button></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><Nav close /></div>
          <Button variant="outline" className="mt-4 w-full shrink-0 rounded-lg" onClick={() => void logout()} disabled={loggingOut}><LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}</Button>
        </aside>
      </div>}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-5 py-5"><div className="mb-5 flex items-center gap-3"><Image src="/nova-logo.webp" alt="NOVA" width={36} height={36} className="rounded-lg object-contain" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">NOVA</p><p className="text-[15px] font-bold text-slate-900">Portail familles</p></div></div><User /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><Nav /></div>
        <div className="border-t border-slate-200 p-3"><Button variant="ghost" className="w-full justify-start rounded-lg text-slate-500 hover:text-slate-900" onClick={() => void logout()} disabled={loggingOut}><LogOut className="mr-2 h-4 w-4" />{loggingOut ? "Déconnexion…" : "Déconnexion"}</Button></div>
      </aside>
    </>
  )
}
