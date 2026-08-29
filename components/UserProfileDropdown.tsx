"use client"

import { useAuthentification } from "@/providers/authentification.provider"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function UserProfileDropdown() {
  const router = useRouter()
  const { utilisateur, contexte, deconnecter } = useAuthentification()
  const [logging, setLogging] = useState(false)

  if (!utilisateur) return null

  const handleLogout = async () => {
    setLogging(true)
    await deconnecter()
    setLogging(false)
    router.push("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="w-4 h-4" />
          {utilisateur.nomUtilisateur.split("@")[0]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2 text-xs text-muted-foreground">
          <p className="truncate">{utilisateur.nomUtilisateur}</p>
          <p className="text-xs mt-1 opacity-75">{utilisateur.role}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push("/profil")}>
          <User className="w-4 h-4 mr-2" />
          Mon profil
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/parametres")}>
          <Settings className="w-4 h-4 mr-2" />
          Paramètres
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} disabled={logging} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          {logging ? "Déconnexion..." : "Se déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
