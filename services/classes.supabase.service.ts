import { supabaseBrowser } from "@/lib/supabase/client"
import type { Classe } from "@/types/models"

export interface SchoolClassRecord {
  id: string
  establishment_id: string
  grade_level_id: string
  name: string
  code: string | null
  capacity?: number | null
  active: boolean
  grade_levels?: { name: string } | null
}

const toClasse = (row: SchoolClassRecord): Classe => ({
  id: row.id,
  nom: row.name,
  niveau: row.grade_levels?.name || row.grade_level_id,
  effectif: 0,
  capacite: row.capacity ?? 0,
  fraisScolarite: 0,
  statut: row.active ? "active" : "inactive",
})

// Champs pour les SELECT (avec jointure possible)
const selectFields = "id,establishment_id,grade_level_id,name,code,capacity,active,grade_levels(name)"

// Champs scalaires uniquement — pour INSERT/UPDATE (pas de jointures)
const scalarFields = "id,establishment_id,grade_level_id,name,code,capacity,active"

/** Récupère un enregistrement complet (avec jointure niveau) après INSERT/UPDATE */
async function fetchById(id: string): Promise<Classe> {
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .select(selectFields)
    .eq("id", id)
    .single()
  if (error) throw new Error(`Impossible de récupérer la classe: ${error.message}`)
  return toClasse(data as SchoolClassRecord)
}

export async function obtenirClassesSupabase(etablissementId: string): Promise<Classe[]> {
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .select(selectFields)
    .eq("establishment_id", etablissementId)
    .eq("active", true)
    .order("name")
  if (error) throw new Error(`Impossible de charger les classes: ${error.message}`)
  return (data ?? []).map(toClasse)
}

export async function creerClasseSupabase(etablissementId: string, input: Omit<SchoolClassRecord, "id" | "establishment_id" | "active">) {
  // INSERT sans jointure (champs scalaires uniquement)
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .insert({
      establishment_id: etablissementId,
      grade_level_id: input.grade_level_id,
      name: input.name,
      code: input.code ?? null,
      capacity: input.capacity ?? null,
      active: true,
    })
    .select(scalarFields)
    .single()
  if (error) throw new Error(`Impossible de créer la classe: ${error.message}`)
  // Récupérer l'enregistrement complet avec la jointure grade_levels
  return fetchById((data as { id: string }).id)
}

export async function modifierClasseSupabase(id: string, changes: Partial<Omit<SchoolClassRecord, "id" | "establishment_id">>) {
  // UPDATE sans jointure (champs scalaires uniquement)
  const { error } = await supabaseBrowser
    .from("school_classes")
    .update(changes)
    .eq("id", id)
    .select(scalarFields)
    .single()
  if (error) throw new Error(`Impossible de modifier la classe: ${error.message}`)
  // Récupérer l'enregistrement complet avec la jointure grade_levels
  return fetchById(id)
}

export async function archiverClasseSupabase(id: string) {
  const { error } = await supabaseBrowser.from("school_classes").update({ active: false }).eq("id", id)
  if (error) throw new Error(`Impossible d'archiver la classe: ${error.message}`)
}
