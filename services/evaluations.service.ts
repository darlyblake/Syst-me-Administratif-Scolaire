import { supabaseBrowser } from "@/lib/supabase/client"

export interface Evaluation {
  id: string
  class_id: string
  subject_id: string
  title: string
  assessment_date: string
  max_score: number
}

interface AssignmentContext {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
}

async function getAssignment(classId: string, subjectId: string, teacherId: string, establishmentId: string) {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,subject_id,teacher_id,school_classes!inner(establishment_id)")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .eq("school_classes.establishment_id", establishmentId)
    .maybeSingle()
  if (error) throw new Error(`Impossible de vérifier l'affectation: ${error.message}`)
  if (!data) throw new Error("Cette matière n'est pas affectée à cet enseignant pour cette classe.")
  return data as AssignmentContext
}

export async function creerEvaluation(etablissementId: string, teacherId: string, input: Omit<Evaluation, "id">) {
  await getAssignment(input.class_id, input.subject_id, teacherId, etablissementId)
  if (!input.title.trim()) throw new Error("Le titre de l'évaluation est obligatoire.")
  if (input.max_score <= 0) throw new Error("Le barème doit être supérieur à zéro.")

  const { data, error } = await supabaseBrowser
    .from("assessments")
    .insert({
      class_id: input.class_id,
      subject_id: input.subject_id,
      title: input.title.trim(),
      assessment_date: input.assessment_date,
      max_score: input.max_score,
    })
    .select("id,class_id,subject_id,title,assessment_date,max_score")
    .single()
  if (error) throw new Error(`Impossible de créer l'évaluation: ${error.message}`)
  return data as Evaluation
}

export async function obtenirEvaluationsEnseignant(etablissementId: string, teacherId: string) {
  const { data: assignments, error: assignmentError } = await supabaseBrowser
    .from("class_subjects")
    .select("class_id,subject_id")
    .eq("teacher_id", teacherId)
    .eq("school_classes.establishment_id", etablissementId)
    .not("class_id", "is", null)
  if (assignmentError) throw new Error(`Impossible de charger les affectations: ${assignmentError.message}`)
  if (!assignments?.length) return []

  const pairs = assignments.map((a) => `and(class_id.eq.${a.class_id},subject_id.eq.${a.subject_id})`).join(",")
  const { data, error } = await supabaseBrowser
    .from("assessments")
    .select("id,class_id,subject_id,title,assessment_date,max_score")
    .or(pairs)
    .order("assessment_date", { ascending: false })
  if (error) throw new Error(`Impossible de charger les évaluations: ${error.message}`)
  return (data ?? []) as Evaluation[]
}
