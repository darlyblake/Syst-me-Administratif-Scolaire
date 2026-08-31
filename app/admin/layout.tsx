"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Building2, CreditCard, LayoutDashboard, Menu, Settings, ShieldCheck, Users, X, LogOut, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthentification } from "@/providers/authentification.provider"

const items = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/etablissements", label: "Établissements", icon: Building2 },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/administrateurs", label: "Administrateurs", icon: ShieldCheck },
  { href: "/admin/abonnements", label: "Abonnements", icon: CreditCard },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
]

const roleLabels: Record<string, string> = {
  admin: "Administrateur général",
  ecole: "Administrateur établissement",
  parent: "Parent",
  enseignant: "Enseignant",
  eleve: "Élève",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { utilisateur, contexte, deconnecter } = useAuthentification()
  const [open, setOpen] = useState(false)

  const nomAffiche = [contexte?.first_name, contexte?.last_name].filter(Boolean).join(" ") || utilisateur?.nomUtilisateur || "Administrateur"
  const roleAffiche = roleLabels[utilisateur?.role ?? "admin"] ?? "Administrateur"
  const initiales = nomAffiche
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A"

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-primary/10 bg-white">
      <div className="border-b border-primary/10 bg-gradient-to-b from-primary/[0.06] to-white p-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-primary">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-primary/10">
            <Image src="/nova-logo.webp" alt="NOVA" width={44} height={44} className="h-full w-full object-contain" priority />
          </div>
          <div className="min-w-0">
            <p className="font-bold tracking-tight text-foreground">NOVA</p>
            <p className="truncate text-xs text-muted-foreground">Système de Gestion Scolaire</p>
          </div>
        </Link>
        <div className="mt-4 rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2 text-xs font-medium text-primary">
          Centre d'administration
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plateforme</p>
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-colors", pathname === href ? "border-primary/10 bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:border-primary/10 hover:bg-primary/[0.06] hover:text-foreground")}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-primary/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">
            {initiales}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" title={nomAffiche}>{nomAffiche}</p>
            <p className="truncate text-xs font-medium text-primary">{roleAffiche}</p>
            {contexte?.email && <p className="truncate text-[11px] text-muted-foreground" title={contexte.email}>{contexte.email}</p>}
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground" onClick={async () => { await deconnecter(); router.replace("/connexion") }}>
          <LogOut className="h-4 w-4" />Déconnexion
        </Button>
      </div>
    </aside>
  )

  return <div className="min-h-screen bg-muted/30 text-foreground">
    <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
    <div className="md:pl-72">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-primary/10 bg-white/95 px-4 shadow-sm backdrop-blur md:px-8">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></Button>
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-8 w-8 overflow-hidden rounded-lg bg-primary/[0.06] ring-1 ring-primary/10">
            <Image src="/nova-logo.webp" alt="" width={32} height={32} className="h-full w-full object-contain" />
          </div>
          <div><p className="text-sm font-semibold">Centre de contrôle</p><p className="text-xs text-muted-foreground">Gérez toute la plateforme NOVA</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="max-w-[220px] truncate text-sm font-semibold">{nomAffiche}</p>
            <p className="text-xs text-primary">{roleAffiche}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground sm:hidden" aria-hidden="true">{initiales}</div>
          <Button variant="outline" size="icon" aria-label="Notifications" className="border-primary/15 hover:bg-primary/[0.06]"><Bell className="h-4 w-4" /></Button>
        </div>
      </header>
      <main className="p-4 md:p-8">{children}</main>
    </div>
    {open && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} /><div className="relative h-full w-72 bg-white shadow-xl">{sidebar}<Button variant="ghost" size="icon" className="absolute right-3 top-4" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X className="h-5 w-5" /></Button></div></div>}
  </div>
}
