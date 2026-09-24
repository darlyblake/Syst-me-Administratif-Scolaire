"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { obtenirClassesSupabase, creerClasseSupabase, modifierClasseSupabase, archiverClasseSupabase } from "@/services/classes.supabase.service"
import { supabaseBrowser } from "@/lib/supabase/client"
import type { Classe, DonneesEleve, DonneesEnseignant } from "@/types/models"

async function getCurrentEstablishmentId(): Promise<string> {
  const { data: { user } } = await supabaseBrowser.auth.getUser()
  if (!user) throw new Error("Session utilisateur introuvable")
  const { data, error } = await supabaseBrowser.from("establishment_members").select("establishment_id").eq("user_id", user.id).eq("active", true).limit(1).maybeSingle()
  if (error || !data?.establishment_id) throw new Error("Établissement introuvable")
  return data.establishment_id
}

export function useClasses() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const establishmentId = await getCurrentEstablishmentId()
      const [classesResult] = await Promise.all([
        obtenirClassesSupabase(establishmentId)
      ])
      setClasses(classesResult)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les classes.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const ajouter = useCallback(async (data: Omit<Classe, "id"> & { grade_level_id?: string; code?: string | null; academic_year_id?: string | null }) => {
    const establishmentId = await getCurrentEstablishmentId()
    // La page fournit directement l'UUID du niveau sélectionné dans la structure académique.
    // On normalise uniquement la chaîne pour éviter qu'un UUID entouré d'espaces soit rejeté.
    const gradeLevelId = typeof data.grade_level_id === "string" ? data.grade_level_id.trim() : ""
    if (!gradeLevelId) throw new Error("Le niveau académique est obligatoire")
    const capacity = Number(data.capacite)
    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new Error("La capacité doit être supérieure à 0")
    }
    const result = await creerClasseSupabase(establishmentId, {
      grade_level_id: gradeLevelId,
      name: data.nom.trim(),
      code: data.code ?? null,
      capacity,
    })
    await refresh()
    return result
  }, [refresh])

  const modifier = useCallback(async (id: string, data: Partial<Classe> & { grade_level_id?: string }) => {
    const targetLevel = data.grade_level_id
    const changes: Record<string, unknown> = {}
    if (data.nom !== undefined) changes.name = data.nom.trim()
    if (targetLevel !== undefined) changes.grade_level_id = targetLevel
    if (data.capacite !== undefined) {
      const capacity = Number(data.capacite)
      if (!Number.isFinite(capacity) || capacity <= 0) {
        throw new Error("La capacité doit être supérieure à 0")
      }
      changes.capacity = capacity
    }
    const result = await modifierClasseSupabase(id, changes)
    await refresh()
    return result
  }, [refresh])

  const supprimer = useCallback(async (id: string) => {
    await archiverClasseSupabase(id)
    await refresh()
    return true
  }, [refresh])

  const getEleves = useCallback((_id: string): DonneesEleve[] => [], [])
  const getEnseignants = useCallback((_id: string): DonneesEnseignant[] => [], [])

  const statistiques = useMemo(() => {
    const totalClasses = classes.length
    const classesActives = classes.filter((classe) => classe.statut !== "inactive").length
    const totalEleves = classes.reduce((sum, classe) => sum + (classe.effectif ?? 0), 0)
    const moyenneElevesParClasse = totalClasses > 0 ? totalEleves / totalClasses : 0
    const recettesTotales = classes.reduce((sum, classe) => sum + (classe.fraisScolarite ?? 0), 0)
    return { total: totalClasses, actives: classesActives, totalClasses, classesActives, moyenneElevesParClasse, recettesTotales }
  }, [classes])

  return { classes, loading, error, statistiques, refresh, ajouter, modifier, supprimer, getEleves, getEnseignants }
}
