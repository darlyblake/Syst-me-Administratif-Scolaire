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
}

const toClasse = (row: SchoolClassRecord): Classe => ({
  id: row.id,
  nom: row.name,
  niveau: row.grade_level_id,
  effectif: 0,
  capacite: row.capacity ?? 0,
  fraisScolarite: 0,
  statut: row.active ? "active" : "inactive",
})

const selectFields = "id,establishment_id,grade_level_id,name,code,capacity,active"

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
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .insert({ ...input, establishment_id: etablissementId, active: true })
    .select(selectFields)
    .single()
  if (error) throw new Error(`Impossible de créer la classe: ${error.message}`)
  return toClasse(data as SchoolClassRecord)
}

export async function modifierClasseSupabase(id: string, changes: Partial<Omit<SchoolClassRecord, "id" | "establishment_id">>) {
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .update(changes)
    .eq("id", id)
    .select(selectFields)
    .single()
  if (error) throw new Error(`Impossible de modifier la classe: ${error.message}`)
  return toClasse(data as SchoolClassRecord)
}

export async function archiverClasseSupabase(id: string) {
  const { error } = await supabaseBrowser.from("school_classes").update({ active: false }).eq("id", id)
  if (error) throw new Error(`Impossible d'archiver la classe: ${error.message}`)
}
