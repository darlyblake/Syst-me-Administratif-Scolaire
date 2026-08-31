"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, UserX, CreditCard, Bell, MessageSquare, Calendar, LogOut, Menu, X, LifeBuoy } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const liens = [
  { href: "/parents/tableau-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/parents/enfants", label: "Mes enfants", icon: Users },
  { href: "/parents/notes", label: "Notes & bulletins", icon: FileText },
  { href: "/parents/absences", label: "Absences", icon: UserX },
  { href: "/parents/paiements", label: "Paiements", icon: CreditCard },
  { href: "/parents/notifications", label: "Notifications", icon: Bell, badge: "notifs" },
  { href: "/parents/messages", label: "Messages", icon: MessageSquare, badge: "msgs" },
  { href: "/parents/evenements", label: "Événements", icon: Calendar },
  { href: "/parents/service-technique", label: "Service technique", icon: LifeBuoy },
] as const

export function ParentNav() {
  const pathname = usePathname()
  const { utilisateur, deconnecter } = useAuthentification()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    let mounted = true
    const loadBadges = async () => {
      if (!utilisateur?.id) return

      const [notificationsResult, participantsResult] = await Promise.all([
        supabaseBrowser
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_user_id", utilisateur.id)
          .is("read_at", null),
        supabaseBrowser
          .from("conversation_participants")
          .select("conversation_id,last_read_at")
          .eq("user_id", utilisateur.id),
      ])

      if (!mounted) return
      if (!notificationsResult.error) setUnreadNotifications(notificationsResult.count ?? 0)

      if (participantsResult.error || !participantsResult.data?.length) {
        setUnreadMessages(0)
        return
      }

      const conversationIds = participantsResult.data.map((row) => row.conversation_id).filter(Boolean)
      const { data: messages } = await supabaseBrowser
        .from("messages")
        .select("conversation_id,sender_id,created_at")
        .in("conversation_id", conversationIds)
        .neq("sender_id", utilisateur.id)

      const lastReadByConversation = new Map(
        participantsResult.data.map((row) => [row.conversation_id, row.last_read_at ? new Date(row.last_read_at).getTime() : 0]),
      )
      const count = (messages ?? []).filter((message) => {
        const lastRead = lastReadByConversation.get(message.conversation_id) ?? 0
        return new Date(message.created_at).getTime() > lastRead
      }).length
      setUnreadMessages(count)
    }

    void loadBadges()
    return () => { mounted = false }
  }, [utilisateur?.id, pathname])

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {liens.map(({ href, label, icon: Icon, badge }) => {
        const actif = pathname === href || pathname?.startsWith(href + "/")
        const count = badge === "notifs" ? unreadNotifications : badge === "msgs" ? unreadMessages : 0
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              actif ? "bg-terre text-white shadow-soft" : "text-pierre hover:bg-terre-soft hover:text-terre",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className={cn(
                "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold",
                actif ? "bg-white/20 text-white" : "bg-soleil text-white",
              )}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  const UserBlock = () => (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-terre-soft">
        <Image src="/nova-icon-192.svg" alt="NOVA" width={28} height={28} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-terre">{utilisateur?.nomUtilisateur ?? "Parent"}</p>
        <p className="text-xs text-pierre">{utilisateur?.role === "parent" ? "Parent" : utilisateur?.role ?? "Compte connecté"}</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-terre/10 bg-papier/95 px-4 py-3 backdrop-blur lg:hidden">
        <UserBlock />
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen((open) => !open)} aria-label="Ouvrir le menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-encre/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-papier p-4 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <UserBlock />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavLinks onNavigate={() => setMobileOpen(false)} /></div>
            <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => void deconnecter()}>
              <LogOut className="mr-2 h-4 w-4" />Déconnexion
            </Button>
          </div>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-terre/10 bg-papier px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <div className="mb-4 flex items-center gap-3">
            <Image src="/nova-logo.webp" alt="NOVA — Système Administratif Scolaire" width={44} height={44} className="rounded-xl object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-terre">NOVA</p>
              <h1 className="text-lg font-bold text-terre">Espace Parents</h1>
            </div>
          </div>
          <UserBlock />
        </div>
        <div className="flex-1 overflow-y-auto"><NavLinks /></div>
        <Button variant="outline" className="mt-4 w-full rounded-xl" onClick={() => void deconnecter()}>
          <LogOut className="mr-2 h-4 w-4" />Déconnexion
        </Button>
      </aside>
    </>
  )
}
