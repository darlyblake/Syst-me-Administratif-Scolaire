import { supabaseBrowser } from "@/lib/supabase/client"

export interface AffectationEnseignant {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  weekly_hours: number | null
}

export async function obtenirAffectations(etablissementId: string): Promise<AffectationEnseignant[]> {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,subject_id,teacher_id,weekly_hours,school_classes!inner(establishment_id)")
    .eq("school_classes.establishment_id", etablissementId)
  if (error) throw new Error(`Impossible de charger les affectations: ${error.message}`)
  return (data ?? []).map(({ id, class_id, subject_id, teacher_id, weekly_hours }) => ({ id, class_id, subject_id, teacher_id, weekly_hours }))
}

export async function creerAffectation(
  etablissementId: string,
  input: Omit<AffectationEnseignant, "id">,
): Promise<AffectationEnseignant> {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .insert(input)
    .select("id,class_id,subject_id,teacher_id,weekly_hours,school_classes!inner(establishment_id)")
    .eq("school_classes.establishment_id", etablissementId)
    .single()
  if (error) throw new Error(`Impossible de créer l'affectation: ${error.message}`)
  const row = data as AffectationEnseignant
  return { id: row.id, class_id: row.class_id, subject_id: row.subject_id, teacher_id: row.teacher_id, weekly_hours: row.weekly_hours }
}

export async function modifierAffectation(id: string, changes: Partial<Omit<AffectationEnseignant, "id">>) {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .update(changes)
    .eq("id", id)
    .select("id,class_id,subject_id,teacher_id,weekly_hours")
    .single()
  if (error) throw new Error(`Impossible de modifier l'affectation: ${error.message}`)
  return data as AffectationEnseignant
}

export async function supprimerAffectation(id: string) {
  const { error } = await supabaseBrowser.from("class_subjects").delete().eq("id", id)
  if (error) throw new Error(`Impossible de supprimer l'affectation: ${error.message}`)
}
