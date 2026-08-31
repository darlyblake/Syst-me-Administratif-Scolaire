"use client"

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { utilisateur, deconnecter } = useAuthentification()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r bg-white">
      <div className="flex items-center gap-3 border-b p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">N</div>
        <div><p className="font-bold tracking-tight">NOVA</p><p className="text-xs text-muted-foreground">Administration</p></div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plateforme</p>
        {items.map(({href,label,icon:Icon}) => (
          <Link key={href} href={href} onClick={()=>setOpen(false)}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", pathname === href ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t p-4">
        <div className="mb-3 rounded-xl bg-muted/60 p-3"><p className="truncate text-sm font-medium">{utilisateur?.email || "Administrateur"}</p><p className="text-xs text-muted-foreground">Super administration</p></div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={async()=>{await deconnecter();router.replace("/connexion")}}><LogOut className="h-4 w-4"/>Déconnexion</Button>
      </div>
    </aside>
  )

  return <div className="min-h-screen bg-muted/30 text-foreground">
    <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
    <div className="md:pl-72">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-8">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={()=>setOpen(true)}><Menu className="h-5 w-5"/></Button>
        <div className="hidden md:block"><p className="text-sm font-medium">Centre de contrôle</p><p className="text-xs text-muted-foreground">Gérez toute la plateforme NOVA</p></div>
        <Button variant="outline" size="icon" aria-label="Notifications"><Bell className="h-4 w-4"/></Button>
      </header>
      <main className="p-4 md:p-8">{children}</main>
    </div>
    {open && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)}/><div className="relative h-full w-72 bg-white shadow-xl">{sidebar}<Button variant="ghost" size="icon" className="absolute right-3 top-4" onClick={()=>setOpen(false)}><X className="h-5 w-5"/></Button></div></div>}
  </div>
}