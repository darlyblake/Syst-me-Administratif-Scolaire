"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { serviceClasses } from "@/services/classes.service"
import type { Classe, DonneesEleve, DonneesEnseignant } from "@/types/models"

export function useClasses() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    try {
      setClasses(serviceClasses.obtenirToutesLesClasses())
      setError(null)
    } catch {
      setError("Impossible de charger les classes.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => refresh(), [refresh])

  const ajouter = useCallback((data: Omit<Classe, "id">) => {
    const result = serviceClasses.ajouterClasse(data)
    refresh()
    return result
  }, [refresh])

  const modifier = useCallback((id: string, data: Partial<Classe>) => {
    const result = serviceClasses.modifierClasse(id, data)
    refresh()
    return result
  }, [refresh])

  const supprimer = useCallback((id: string) => {
    const result = serviceClasses.supprimerClasse(id)
    refresh()
    return result
  }, [refresh])

  const getEleves = useCallback((id: string): DonneesEleve[] => serviceClasses.obtenirElevesDeClasse(id), [])
  const getEnseignants = useCallback((id: string): DonneesEnseignant[] => serviceClasses.obtenirEnseignantsDeClasse(id), [])
  const statistiques = useMemo(() => serviceClasses.obtenirStatistiquesClasses(), [classes])

  return { classes, loading, error, statistiques, refresh, ajouter, modifier, supprimer, getEleves, getEnseignants }
}
