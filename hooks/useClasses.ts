"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuthentification } from "@/providers/authentification.provider"
import { usePermissions } from "@/hooks/usePermissions"
import { serviceClasses } from "@/services/classes.service"
import type { Classe } from "@/types/models"

/**
 * Couche de gestion du module Classes.
 * Les composants ne doivent pas appeler serviceClasses directement.
 *
 * Le filtre par établissement améliore l'isolation côté UI. Il ne remplace
 * pas les contrôles d'autorisation côté backend lorsque celui-ci sera branché.
 */
export function useClasses() {
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()
  const { can, establishmentId } = usePermissions()
  const [classes, setClasses] = useState<Classe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canView = can("classes.view")
  const canManage = can("classes.manage")

  const load = useCallback(() => {
    if (!utilisateur || !canView) {
      setClasses([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const allClasses = serviceClasses.obtenirToutesLesClasses()
      const scopedClasses = establishmentId
        ? allClasses.filter((classe) => !classe.etablissementId || classe.etablissementId === establishmentId)
        : allClasses

      setClasses(scopedClasses)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les classes")
      setClasses([])
    } finally {
      setIsLoading(false)
    }
  }, [canView, establishmentId, utilisateur])

  useEffect(() => {
    if (!estEnCoursDeChargement) load()
  }, [estEnCoursDeChargement, load])

  const refresh = useCallback(() => load(), [load])

  const createClass = useCallback(
    (data: Omit<Classe, "id">) => {
      if (!canManage) throw new Error("Vous n'avez pas l'autorisation de gérer les classes")
      const classe = serviceClasses.ajouterClasse({
        ...data,
        ...(establishmentId ? { etablissementId: establishmentId } : {}),
      })
      refresh()
      return classe
    },
    [canManage, establishmentId, refresh],
  )

  const updateClass = useCallback(
    (id: string, data: Partial<Classe>) => {
      if (!canManage) throw new Error("Vous n'avez pas l'autorisation de modifier les classes")
      const classe = serviceClasses.modifierClasse(id, data)
      if (!classe) throw new Error("Classe introuvable")
      refresh()
      return classe
    },
    [canManage, refresh],
  )

  const deleteClass = useCallback(
    (id: string) => {
      if (!canManage) throw new Error("Vous n'avez pas l'autorisation de supprimer les classes")
      const classe = classes.find((item) => item.id === id)
      if (!classe) throw new Error("Classe introuvable")
      if (establishmentId && classe.etablissementId && classe.etablissementId !== establishmentId) {
        throw new Error("Cette classe appartient à un autre établissement")
      }
      const deleted = serviceClasses.supprimerClasse(id)
      if (!deleted) throw new Error("Impossible de supprimer la classe")
      refresh()
      return true
    },
    [canManage, classes, establishmentId, refresh],
  )

  const getStudentCount = useCallback((id: string) => serviceClasses.compterElevesParClasse(id), [])
  const getTeachers = useCallback((id: string) => serviceClasses.obtenirEnseignantsDeClasse(id), [])

  const statistics = useMemo(
    () => ({
      totalClasses: classes.length,
      classesActives: classes.length,
      moyenneElevesParClasse:
        classes.length > 0
          ? classes.reduce((total, classe) => total + getStudentCount(classe.id), 0) / classes.length
          : 0,
      recettesTotales: classes.reduce(
        (total, classe) => total + classe.fraisScolarite * getStudentCount(classe.id),
        0,
      ),
    }),
    [classes, getStudentCount],
  )

  return {
    classes,
    isLoading,
    error,
    refresh,
    createClass,
    updateClass,
    deleteClass,
    getStudentCount,
    getTeachers,
    statistics,
    canView,
    canManage,
    establishmentId,
  }
}
