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
    if (!data.grade_level_id) throw new Error("Le niveau académique est obligatoire")
    if (!niveaux.some((niveau) => niveau.id === data.grade_level_id)) {
      throw new Error("Ce niveau n'est pas activé pour cet établissement")
    }
    const result = await creerClasseSupabase(establishmentId, {
      grade_level_id: data.grade_level_id,
      name: data.nom,
      code: data.code ?? null,
      academic_year_id: data.academic_year_id ?? null,
      capacity: data.capacite ?? null,
    })
    await refresh()
    return result
  }, [niveaux, refresh])

  const modifier = useCallback(async (id: string, data: Partial<Classe> & { grade_level_id?: string }) => {
    const targetLevel = data.grade_level_id ?? data.niveau
    if (targetLevel !== undefined && !niveaux.some((niveau) => niveau.id === targetLevel)) {
      throw new Error("Ce niveau n'est pas activé pour cet établissement")
    }
    const changes: Record<string, unknown> = {}
    if (data.nom !== undefined) changes.name = data.nom
    if (data.niveau !== undefined) changes.grade_level_id = data.niveau
    if (data.grade_level_id !== undefined) changes.grade_level_id = data.grade_level_id
    if (data.capacite !== undefined) changes.capacity = data.capacite
    const result = await modifierClasseSupabase(id, changes)
    await refresh()
    return result
  }, [niveaux, refresh])

  const supprimer = useCallback(async (id: string) => {
    await archiverClasseSupabase(id)
    await refresh()
    return true
  }, [refresh])

  const getEleves = useCallback(async (_id: string): Promise<DonneesEleve[]> => [], [])
  const getEnseignants = useCallback(async (_id: string): Promise<DonneesEnseignant[]> => [], [])
  const statistiques = useMemo(() => ({ total: classes.length, actives: classes.length }), [classes])

  return { classes, niveaux, loading, error, statistiques, refresh, ajouter, modifier, supprimer, getEleves, getEnseignants }
}
