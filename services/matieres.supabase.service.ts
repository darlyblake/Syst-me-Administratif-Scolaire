import { supabaseBrowser } from "../lib/supabase/client"
import type { Matiere } from "../types/models"

export type SubjectScope = "pre_primary" | "primary" | "secondary" | "high_school" | "university" | "center" | "all"

export interface SubjectRecord {
  id: string
  establishment_id: string
  code: string
  name: string
  coefficient: number
  description: string | null
  grade_level_id: string | null
  level_scope: SubjectScope
  is_primary_generalist: boolean
  active: boolean
}

const toMatiere = (row: SubjectRecord): Matiere => ({
  id: row.id,
  code: row.code,
  nom: row.name,
  niveau: row.grade_level_id ? [row.grade_level_id] : [],
  coefficient: row.coefficient,
  description: row.description ?? undefined,
})

export async function obtenirMatieresSupabase(etablissementId: string): Promise<Matiere[]> {
  const { data, error } = await supabaseBrowser
    .from("subjects")
    .select("id,establishment_id,code,name,coefficient,description,grade_level_id,level_scope,is_primary_generalist,active")
    .eq("establishment_id", etablissementId)
    .eq("active", true)
    .order("name")

  if (error) throw new Error(`Impossible de charger les matières: ${error.message}`)
  return (data ?? []).map(toMatiere)
}

export async function creerMatiereSupabase(input: Omit<SubjectRecord, "id" | "active" | "establishment_id">, etablissementId: string) {
  const { data, error } = await supabaseBrowser
    .from("subjects")
    .insert({ ...input, establishment_id: etablissementId, active: true })
    .select("id,establishment_id,code,name,coefficient,description,grade_level_id,level_scope,is_primary_generalist,active")
    .single()

  if (error) throw new Error(`Impossible de créer la matière: ${error.message}`)
  return toMatiere(data as SubjectRecord)
}

export async function modifierMatiereSupabase(id: string, changes: Partial<Omit<SubjectRecord, "id" | "establishment_id">>) {
  const { data, error } = await supabaseBrowser
    .from("subjects")
    .update(changes)
    .eq("id", id)
    .select("id,establishment_id,code,name,coefficient,description,grade_level_id,level_scope,is_primary_generalist,active")
    .single()

  if (error) throw new Error(`Impossible de modifier la matière: ${error.message}`)
  return toMatiere(data as SubjectRecord)
}

export async function archiverMatiereSupabase(id: string) {
  const { error } = await supabaseBrowser.from("subjects").update({ active: false }).eq("id", id)
  if (error) throw new Error(`Impossible d'archiver la matière: ${error.message}`)
}
