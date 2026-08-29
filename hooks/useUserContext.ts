import { useAuthentification } from "@/providers/authentification.provider"

/**
 * Hook pour accéder au contexte utilisateur actuel
 * Inclut les informations de rôle et les établissements
 */
export function useUserContext() {
  const { utilisateur, contexte, etablissementActif, selectionnerEtablissement, estConnecte, estEnCoursDeChargement } = useAuthentification()

  return {
    utilisateur,
    contexte,
    etablissementActif,
    selectionnerEtablissement,
    estConnecte,
    estEnCoursDeChargement,

    // Helpers
    isAdmin: utilisateur?.role === "admin",
    isParent: utilisateur?.role === "parent",
    isTeacher: utilisateur?.role === "enseignant",
    isSchool: utilisateur?.role === "ecole",

    // Établissements
    establishments: contexte?.establishments || [],
    hasMultipleEstablishments: (contexte?.establishments?.length || 0) > 1,
    primaryEstablishment: etablissementActif ?? contexte?.establishments?.[0],
  }
}
