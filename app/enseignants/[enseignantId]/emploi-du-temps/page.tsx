import EmploiDuTempsClient from "./client-new"

import { serviceEnseignants } from "@/services/enseignants.service"

export function generateStaticParams() {
  // Récupérer dynamiquement tous les IDs des enseignants pour la génération statique
  const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
  return enseignants.map((enseignant) => ({
    enseignantId: enseignant.id.toString(),
  }))
}

export default function EmploiDuTempsPage() {
  return <EmploiDuTempsClient />
}
