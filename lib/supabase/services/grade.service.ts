import { supabaseBrowser } from "@/lib/supabase/client"
import type { Grade, GradeWithStudent } from "@/lib/supabase/types"

export async function createGrade(data: Partial<Grade>): Promise<Grade> {
  const { data: result, error } = await supabaseBrowser
    .from("grades")
    .insert({
      establishment_id: data.establishment_id,
      student_id: data.student_id,
      subject: data.subject,
      term: data.term,
      score: data.score,
      max_score: data.max_score || 20,
      appreciation: data.appreciation,
      teacher_id: data.teacher_id,
      recorded_date: data.recorded_date || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer la note.")
  }

  return result as Grade
}

export async function updateGrade(gradeId: string, data: Partial<Grade>): Promise<Grade> {
  const { data: result, error } = await supabaseBrowser
    .from("grades")
    .update({
      score: data.score,
      appreciation: data.appreciation,
      recorded_date: data.recorded_date,
    })
    .eq("id", gradeId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier la note.")
  }

  return result as Grade
}

export async function getGradesByStudent(studentId: string): Promise<Grade[]> {
  const { data, error } = await supabaseBrowser
    .from("grades")
    .select("*")
    .eq("student_id", studentId)
    .order("recorded_date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les notes de l'élève.")
  }

  return (data ?? []) as Grade[]
}

export async function getGradesByClass(classId: string, filters?: { subject?: string; term?: string }): Promise<GradeWithStudent[]> {
  let query = supabaseBrowser
    .from("grades")
    .select("*, student:students(id, first_name, last_name)")
    .eq("class_id", classId)

  if (filters?.subject) {
    query = query.eq("subject", filters.subject)
  }

  if (filters?.term) {
    query = query.eq("term", filters.term)
  }

  const { data, error } = await query.order("student_id", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les notes de la classe.")
  }

  return (data ?? []) as GradeWithStudent[]
}

export async function deleteGrade(gradeId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("grades").delete().eq("id", gradeId)

  if (error) {
    throw new Error("Impossible de supprimer la note.")
  }
}
