"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"

export default function AdminPage() {
  const router = useRouter()
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()

  useEffect(() => {
    if (estEnCoursDeChargement) return

    if (!utilisateur) {
      router.replace("/connexion?redirectTo=%2Fadmin")
      return
    }

    if (utilisateur.role !== "admin") {
      router.replace("/connexion")
      return
    }

    router.replace("/admin/dashboard")
  }, [utilisateur, estEnCoursDeChargement, router])

  return (
    <div className="min-h-screen flex flex-col gap-3 items-center justify-center bg-creme">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Redirection vers votre espace...
      </p>
    </div>
  )
}
