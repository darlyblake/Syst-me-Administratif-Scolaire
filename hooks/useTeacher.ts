"use client"

import { useCallback, useEffect, useState } from "react"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"

interface UseTeacherReturn {
  teacher: DonneesEnseignant | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Accès à une fiche enseignant.
 * Les composants de détail ne connaissent pas la source de données.
 */
export function useTeacher(id: string | null): UseTeacherReturn {
  const [teacher, setTeacher] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setTeacher(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = serviceEnseignants.obtenirTousLesEnseignants().find((item) => item.id === id) ?? null
      if (!result) {
        setError("Enseignant introuvable")
      }
      setTeacher(result)
    } catch (cause) {
      console.error("Erreur lors du chargement de l'enseignant:", cause)
      setTeacher(null)
      setError("Impossible de charger les informations de l'enseignant")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  return { teacher, loading, error, reload }
}
