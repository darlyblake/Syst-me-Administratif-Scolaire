"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

/**
 * Point d'entrée du portail enseignant.
 * L'ancien écran d'accueil/sélection a été supprimé :
 * l'enseignant entre directement dans la nouvelle interface Stitch.
 * Le changement d'établissement reste disponible dans TeacherShell.
 */
export default function EspaceEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const etablissements = contexte?.establishments ?? []

  useEffect(() => {
    if (estEnCoursDeChargement) return

    if (!utilisateur || utilisateur.role !== "enseignant") {
      router.replace("/")
      return
    }

    const establishmentId = etablissements[0]?.id
    if (establishmentId) {
      router.replace("/enseignant/etablissement/" + establishmentId)
    }
  }, [estEnCoursDeChargement, utilisateur, etablissements, router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc] text-[#6d7280]">
      <p className="text-sm">Ouverture de votre espace enseignant…</p>
    </main>
  )
}
