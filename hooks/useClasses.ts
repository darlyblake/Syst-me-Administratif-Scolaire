"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { obtenirClassesSupabase, creerClasseSupabase, modifierClasseSupabase, archiverClasseSupabase } from "@/services/classes.supabase.service"
import { getEnabledGradeLevels, type GradeLevel } from "@/services/establishment-levels.service"
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
  const [niveaux, setNiveaux] = useState<GradeLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const establishmentId = await getCurrentEstablishmentId()
      const [classesResult, levelsResult] = await Promise.all([
        obtenirClassesSupabase(establishmentId),
        getEnabledGradeLevels(establishmentId),
      ])
      setClasses(classesResult)
      setNiveaux(levelsResult)
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
    const gradeLevelId = data.grade_level_id ?? niveaux.find((niveau) => niveau.name === data.niveau)?.id
    if (!gradeLevelId) throw new Error("Le niveau académique est obligatoire")
    if (!niveaux.some((niveau) => niveau.id === gradeLevelId)) {
      throw new Error("Ce niveau n'est pas activé pour cet établissement")
    }
    const result = await creerClasseSupabase(establishmentId, {
      grade_level_id: gradeLevelId,
      name: data.nom.trim(),
      code: data.code ?? null,
      academic_year_id: data.academic_year_id ?? null,
      capacity: data.capacite == null ? 30 : Math.max(0, Number(data.capacite)),
    })
    await refresh()
    return result
  }, [niveaux, refresh])

  const modifier = useCallback(async (id: string, data: Partial<Classe> & { grade_level_id?: string }) => {
    const targetLevel = data.grade_level_id ?? (data.niveau ? niveaux.find((niveau) => niveau.name === data.niveau)?.id : undefined)
    if (targetLevel !== undefined && !niveaux.some((niveau) => niveau.id === targetLevel)) {
      throw new Error("Ce niveau n'est pas activé pour cet établissement")
    }
    const changes: Record<string, unknown> = {}
    if (data.nom !== undefined) changes.name = data.nom.trim()
    if (targetLevel !== undefined) changes.grade_level_id = targetLevel
    if (data.capacite !== undefined) changes.capacity = Math.max(0, Number(data.capacite))
    const result = await modifierClasseSupabase(id, changes)
    await refresh()
    return result
  }, [niveaux, refresh])

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

  return { classes, niveaux, loading, error, statistiques, refresh, ajouter, modifier, supprimer, getEleves, getEnseignants }
}
