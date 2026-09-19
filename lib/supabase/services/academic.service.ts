import { supabaseBrowser } from "@/lib/supabase/client"
import type { AcademicStructureCycle, EducationCycle, GradeLevel, SchoolClass } from "@/lib/supabase/types"

export async function getCycles(establishmentId: string) {
  const { data, error } = await supabaseBrowser
    .from("education_cycles")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("display_order", { ascending: true })

  if (error) throw new Error("Impossible de charger les cycles.")
  return data as EducationCycle[]
}

export async function createCycle(data: Partial<EducationCycle>) {
  const { data: result, error } = await supabaseBrowser.from("education_cycles").insert(data).select().single()
  if (error) throw new Error("Impossible de créer le cycle.")
  return result
}

export async function updateCycle(cycleId: string, data: Partial<EducationCycle>) {
  const { data: result, error } = await supabaseBrowser.from("education_cycles").update(data).eq("id", cycleId).select().single()
  if (error) throw new Error("Impossible de modifier le cycle.")
  return result
}

export async function deactivateCycle(cycleId: string) {
  const { error } = await supabaseBrowser.from("education_cycles").update({ active: false }).eq("id", cycleId)
  if (error) throw new Error("Impossible de désactiver le cycle.")
}

export async function getLevelsByCycle(cycleId: string) {
  const { data, error } = await supabaseBrowser
    .from("grade_levels")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("display_order", { ascending: true })

  if (error) throw new Error("Impossible de charger les niveaux.")
  return data as GradeLevel[]
}

export async function createLevel(data: Partial<GradeLevel>) {
  const { data: result, error } = await supabaseBrowser.from("grade_levels").insert(data).select().single()
  if (error) throw new Error("Impossible de créer le niveau.")
  return result
}

export async function updateLevel(levelId: string, data: Partial<GradeLevel>) {
  const { data: result, error } = await supabaseBrowser.from("grade_levels").update(data).eq("id", levelId).select().single()
  if (error) throw new Error("Impossible de modifier le niveau.")
  return result
}

export async function deactivateLevel(levelId: string) {
  const { error } = await supabaseBrowser.from("grade_levels").update({ active: false }).eq("id", levelId)
  if (error) throw new Error("Impossible de désactiver le niveau.")
}

export async function deleteLevel(levelId: string) {
  // Vérifier si des classes existent pour ce niveau
  const { count, error: countError } = await supabaseBrowser
    .from("school_classes")
    .select("id", { count: "exact", head: true })
    .eq("grade_level_id", levelId)

  if (countError) throw new Error("Impossible de vérifier les classes associées.")
  if (count && count > 0) {
    throw new Error(`Ce niveau possède ${count} classe(s). Supprimez les classes avant de supprimer le niveau.`)
  }

  const { error } = await supabaseBrowser.from("grade_levels").delete().eq("id", levelId)
  if (error) throw new Error("Impossible de supprimer le niveau.")
}

export async function deleteCycle(cycleId: string) {
  // Vérifier si des niveaux existent pour ce cycle
  const { count, error: countError } = await supabaseBrowser
    .from("grade_levels")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", cycleId)

  if (countError) throw new Error("Impossible de vérifier les niveaux associés.")
  if (count && count > 0) {
    throw new Error(`Ce cycle possède ${count} niveau(x). Supprimez les niveaux avant de supprimer le cycle.`)
  }

  const { error } = await supabaseBrowser.from("education_cycles").delete().eq("id", cycleId)
  if (error) throw new Error("Impossible de supprimer le cycle.")
}

export async function getClassesByLevel(levelId: string) {
  const { data, error } = await supabaseBrowser
    .from("school_classes")
    .select("*")
    .eq("grade_level_id", levelId)
    .order("name", { ascending: true })

  if (error) throw new Error("Impossible de charger les classes.")
  return data as SchoolClass[]
}

export async function createClass(data: Partial<SchoolClass>) {
  const { data: result, error } = await supabaseBrowser.from("school_classes").insert(data).select().single()
  if (error) throw new Error("Impossible de créer la classe.")
  return result
}

export async function updateClass(classId: string, data: Partial<SchoolClass>) {
  const { data: result, error } = await supabaseBrowser.from("school_classes").update(data).eq("id", classId).select().single()
  if (error) throw new Error("Impossible de modifier la classe.")
  return result
}

export async function deactivateClass(classId: string) {
  const { error } = await supabaseBrowser.from("school_classes").update({ is_active: false }).eq("id", classId)
  if (error) throw new Error("Impossible de désactiver la classe.")
}

export async function getAcademicStructure(establishmentId: string): Promise<AcademicStructureCycle[]> {
  const { data, error } = await supabaseBrowser
    .from("education_cycles")
    .select(
      `
        id,
        name,
        display_order,
        grade_levels (
          id,
          name,
          display_order,
          school_classes (id, name)
        )
      `
    )
    .eq("establishment_id", establishmentId)
    .eq("active", true)
    .order("display_order", { ascending: true })

  if (error) throw new Error("Impossible de charger la structure académique.")

  const cycles = (data ?? []) as AcademicStructureCycle[]
  
  // Trier les niveaux dans chaque cycle
  return cycles.map(cycle => ({
    ...cycle,
    grade_levels: cycle.grade_levels
      ?.filter(level => level.active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) || []
  }))
}
