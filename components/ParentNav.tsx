"use client"

import type React from "react"
import { AppBrandMark } from "@/components/brand/AppBrandMark"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home, ShieldCheck, BookOpen, MessageSquare,
  CreditCard, LogOut, X, ChevronRight,
  GraduationCap, CalendarDays, FileText,
  Users, ClipboardList, UserRound, Menu,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ParentNotificationBell } from "@/components/notifications/ParentNotificationBell"

/* ------------------------------------------------------------------ */
/*  Configuration de la navigation                                      */
/* ------------------------------------------------------------------ */

/** 5 onglets permanents dans la bottom tab bar */
const MOBILE_TABS = [
  {
    href: "/parents/tableau-bord",
    label: "Accueil",
    icon: Home,
    matches: ["/parents/tableau-bord", "/parents/tableau-de-bord"],
    badge: null as "msgs" | "notifs" | null,
  },
  {
    href: "/parents/absences",
    label: "Présences",
    icon: ShieldCheck,
    matches: ["/parents/absences", "/parents/emploi-du-temps", "/parents/evenements", "/parents/cahier-de-textes", "/parents/exclusions"],
    badge: null as "msgs" | "notifs" | null,
  },
  {
    href: "/parents/notes",
    label: "Résultats",
    icon: GraduationCap,
    matches: ["/parents/notes"],
    badge: null as "msgs" | "notifs" | null,
  },
  {
    href: "/parents/messages",
    label: "Messages",
    icon: MessageSquare,
    matches: ["/parents/messages"],
    badge: "msgs" as "msgs" | "notifs" | null,
  },
  {
    href: "/parents/paiements",
    label: "Finances",
    icon: CreditCard,
    matches: ["/parents/paiements"],
    badge: null as "msgs" | "notifs" | null,
  },
]

/** Sections du menu complet (drawer / sidebar desktop) */
const SECTIONS = [
  {
    title: "Vue générale",
    items: [
      { href: "/parents/tableau-bord", label: "Tableau de bord", icon: Home },
    ],
  },
  {
    title: "Vie scolaire",
    items: [
      { href: "/parents/enfants",         label: "Mes enfants",          icon: Users },
      { href: "/parents/absences",         label: "Présences & absences", icon: ShieldCheck },
      { href: "/parents/exclusions",       label: "Décisions disciplinaires", icon: ClipboardList },
      { href: "/parents/emploi-du-temps",  label: "Emploi du temps",      icon: CalendarDays },
      { href: "/parents/cahier-de-textes", label: "Cahier de textes",     icon: BookOpen },
      { href: "/parents/evenements",       label: "Événements",           icon: CalendarDays },
    ],
  },
  {
    title: "Échanges & compte",
    items: [
      { href: "/parents/notes",         label: "Résultats scolaires",  icon: GraduationCap,  badge: null as "msgs" | "notifs" | null },
      { href: "/parents/messages",      label: "Messagerie",           icon: MessageSquare,   badge: "msgs"   as "msgs" | "notifs" | null },
      { href: "/parents/paiements",     label: "Paiements",            icon: ClipboardList,   badge: null     as "msgs" | "notifs" | null },
      { href: "/parents/documents",     label: "Documents",            icon: FileText,        badge: null     as "msgs" | "notifs" | null },
      { href: "/parents/profil",        label: "Mon compte",           icon: UserRound,       badge: null     as "msgs" | "notifs" | null },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function ParentNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [queryString, setQueryString] = useState("")
  const { utilisateur, deconnecter } = useAuthentification()
  const { notifications } = useParentPortal()
  const unreadNotifications = notifications.filter((n) => !n.read_at).length
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  /* Sync query string */
  useEffect(() => {
    setQueryString(typeof window !== "undefined" ? window.location.search : "")
  }, [pathname])

  /* Fermer le drawer à chaque changement de page */
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  /* Comptage messages non lus */
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!utilisateur?.id) { setUnreadMessages(0); return }
      const { data: participants, error } = await supabaseBrowser
        .from("conversation_participants")
        .select("conversation_id,last_read_at")
        .eq("user_id", utilisateur.id)
      if (!mounted) return
      if (error || !participants?.length) { setUnreadMessages(0); return }
      const ids = participants.map((p) => p.conversation_id).filter(Boolean)
      if (!ids.length) { setUnreadMessages(0); return }
      const { data: msgs } = await supabaseBrowser
        .from("messages")
        .select("conversation_id,sender_id,created_at")
        .in("conversation_id", ids)
        .neq("sender_id", utilisateur.id)
      const reads = new Map(participants.map((p) => [
        p.conversation_id,
        p.last_read_at ? Date.parse(p.last_read_at) : 0,
      ]))
      if (mounted) {
        setUnreadMessages(
          (msgs ?? []).filter((m) => Date.parse(m.created_at) > (reads.get(m.conversation_id) ?? 0)).length
        )
      }
    }
    void load()
    return () => { mounted = false }
  }, [utilisateur?.id, pathname])

  /* Helpers */
  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (pathname !== path && !pathname?.startsWith(path + "/")) return false
    if (!query) return true
    const expected = new URLSearchParams(query)
    for (const [k, v] of expected.entries()) {
      if (new URLSearchParams(queryString).get(k) !== v) return false
    }
    return true
  }

  const isTabActive = (matches: string[]) =>
    matches.some((p) => pathname === p || pathname?.startsWith(p + "/"))

  const badgeCount = (key?: "msgs" | "notifs" | null) =>
    key === "msgs" ? unreadMessages : key === "notifs" ? unreadNotifications : 0

  const initials = (utilisateur?.nomUtilisateur ?? "P").trim().slice(0, 2).toUpperCase()

  const logout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setDrawerOpen(false)
    try { await deconnecter() } finally {
      router.replace("/connexion")
      router.refresh()
      setLoggingOut(false)
    }
  }

  /* ---- Sous-composant : lien de navigation sidebar / drawer ---- */
  const NavLink = ({ item }: { item: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: "msgs" | "notifs" | null } }) => {
    const Icon = item.icon
    const count = badgeCount(item.badge)
    const active = isActive(item.href)
    return (
      <Link
        href={item.href}
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
          active
            ? "bg-sky-50 font-semibold text-sky-800"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-sky-700" : "text-slate-400")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {count > 0 && (
          <span className="min-w-5 rounded-full bg-sky-700 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </Link>
    )
  }

  /* ---- Sous-composant : navigation complète (sections) ---- */
  const FullNav = () => (
    <nav className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* ============================================================
          MOBILE — Top Bar (< lg)
          Hauteur 60px + safe area, blurry, logo + cloche + menu
          ============================================================ */}
      <header className="sp-topbar lg:hidden" role="banner">
        {/* Gauche : logo + nom app */}
        <div className="flex min-w-0 items-center gap-2.5">
          <AppBrandMark size={30} className="rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight text-slate-900">ScolarParent</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 leading-tight">Portail parent</p>
          </div>
        </div>

        {/* Droite : notifications + menu */}
        <div className="flex shrink-0 items-center gap-1">
          <ParentNotificationBell />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ============================================================
          MOBILE — Bottom Tab Bar (5 onglets)
          ============================================================ */}
      <nav aria-label="Navigation principale" className="sp-tabbar lg:hidden">
        {MOBILE_TABS.map(({ href, label, icon: Icon, matches, badge }) => {
          const active = isTabActive(matches)
          const count = badgeCount(badge)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={count > 0 ? `${label}, ${count} non lu${count > 1 ? "s" : ""}` : label}
            >
              {/* Icône + badge superposé */}
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon className="h-[22px] w-[22px]" />
                {count > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-7px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#0284c7",
                    color: "#fff",
                    fontSize: "9px",
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: "0 3px",
                  }}>
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              {/* Label */}
              <span style={{ fontSize: "10px", fontWeight: 500, lineHeight: 1 }}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ============================================================
          MOBILE — Drawer (bottom sheet)
          Contient la navigation complète + déconnexion
          ============================================================ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="sp-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête du drawer */}
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-800">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {utilisateur?.nomUtilisateur ?? "Parent"}
                  </p>
                  <p className="text-xs text-slate-500">Portail des familles</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation complète */}
            <div className="pb-4">
              <FullNav />
            </div>

            {/* Déconnexion */}
            <Button
              variant="outline"
              className="mt-4 min-h-11 w-full shrink-0 rounded-xl"
              onClick={() => void logout()}
              disabled={loggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {loggingOut ? "Déconnexion…" : "Déconnexion"}
            </Button>
          </aside>
        </div>
      )}

    </>
  )
}
