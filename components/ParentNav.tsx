"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, GraduationCap, CalendarDays, BookOpen, FileText, Bell, MessageSquare, UserRound, Menu, X, LogOut, LifeBuoy, ClipboardList } from "lucide-react"
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
  const { utilisateur, deconnecter } = useAuthentification()
  const [open, setOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

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

  const all = [...principal, ...secondaire]
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/")
  const badge = (key?: "notifs" | "msgs") => key === "notifs" ? unreadNotifications : key === "msgs" ? unreadMessages : 0

  const Nav = ({ close = false }: { close?: boolean }) => (
    <nav className="space-y-5">
      <div>
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pierre">Suivi scolaire</p>
        <div className="space-y-0.5">
          {principal.map(({ href, label, icon: Icon }) => <NavItem key={href} href={href} label={label} Icon={Icon} close={close} />)}
        </div>
      </div>
      <div>
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-pierre">Communication</p>
        <div className="space-y-0.5">
          {secondaire.map(({ href, label, icon: Icon, badge: b }) => <NavItem key={href} href={href} label={label} Icon={Icon} count={badge(b)} close={close} />)}
        </div>
      </div>
    </nav>
  )

  const NavItem = ({ href, label, Icon, count = 0, close = false }: { href: string; label: string; Icon: typeof LayoutDashboard; count?: number; close?: boolean }) => (
    <Link href={href} onClick={() => close && setOpen(false)} className={cn(
      "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium transition-colors",
      isActive(href) ? "border-terre bg-terre-soft/50 text-terre" : "border-transparent text-pierre hover:bg-creme hover:text-terre",
    )}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {count > 0 && <span className="text-xs font-semibold text-terre">{count > 99 ? "99+" : count}</span>}
    </Link>
  )

  const User = () => (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terre text-xs font-bold text-white">
        {(utilisateur?.nomUtilisateur ?? "P").slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-terre">{utilisateur?.nomUtilisateur ?? "Parent"}</p>
        <p className="text-xs text-pierre">Espace parent</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-terre/10 bg-papier px-4 py-3 lg:hidden">
        <User />
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button>
      </div>
      {open && <div className="fixed inset-0 z-50 bg-encre/30 lg:hidden" onClick={() => setOpen(false)}>
        <aside className="flex h-full w-80 max-w-[88vw] flex-col bg-papier p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
          <div className="mb-6 flex items-center justify-between"><User /><Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button></div>
          <div className="min-h-0 flex-1 overflow-y-auto"><Nav close /></div>
          <Button variant="outline" className="mt-5 w-full" onClick={() => void deconnecter()}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
        </aside>
      </div>}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-terre/10 bg-papier lg:flex lg:flex-col">
        <div className="border-b border-terre/10 px-5 py-5">
          <div className="mb-5 flex items-center gap-3">
            <Image src="/nova-logo.webp" alt="NOVA" width={38} height={38} className="rounded-lg object-contain" />
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-terre">NOVA</p><p className="text-base font-bold text-terre">Portail familles</p></div>
          </div>
          <User />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5"><Nav /></div>
        <div className="border-t border-terre/10 p-4"><Button variant="ghost" className="w-full justify-start text-pierre" onClick={() => void deconnecter()}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button></div>
      </aside>
    </>
  )
}
