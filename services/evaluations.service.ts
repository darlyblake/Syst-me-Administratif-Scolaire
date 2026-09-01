import { supabaseBrowser } from "@/lib/supabase/client"

export interface Evaluation {
  id: string
  establishment_id: string
  academic_year_id: string
  class_id: string
  subject_id: string
  teacher_id: string
  title: string
  assessment_date: string
  max_score: number
  period_id: string
  term: string | null
}

interface AssignmentContext {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
}

interface GradePeriod {
  id: string
  establishment_id: string
  academic_year_id: string
  period_type: string
  period_number: number
  label: string
  start_date: string
  end_date: string
  entry_open: boolean
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

async function getOpenPeriod(establishmentId: string, academicYearId: string, periodId: string, assessmentDate: string) {
  const { data, error } = await supabaseBrowser
    .from("academic_grade_periods")
    .select("id,establishment_id,academic_year_id,period_type,period_number,label,start_date,end_date,entry_open")
    .eq("id", periodId)
    .eq("establishment_id", establishmentId)
    .eq("academic_year_id", academicYearId)
    .eq("entry_open", true)
    .lte("start_date", assessmentDate)
    .gte("end_date", assessmentDate)
    .maybeSingle()
  if (error) throw new Error(`Impossible de vérifier la période de saisie: ${error.message}`)
  if (!data) throw new Error("La période de saisie des notes est fermée ou la date de l'évaluation est hors période.")
  return data as GradePeriod
}

export async function creerEvaluation(
  etablissementId: string,
  teacherId: string,
  input: Omit<Evaluation, "id" | "establishment_id" | "teacher_id" | "term">,
) {
  await getAssignment(input.class_id, input.subject_id, teacherId, etablissementId)
  if (!input.title.trim()) throw new Error("Le titre de l'évaluation est obligatoire.")
  if (input.max_score <= 0) throw new Error("Le barème doit être supérieur à zéro.")

  const period = await getOpenPeriod(etablissementId, input.academic_year_id, input.period_id, input.assessment_date)

  const { data, error } = await supabaseBrowser
    .from("assessments")
    .insert({
      establishment_id: etablissementId,
      academic_year_id: input.academic_year_id,
      class_id: input.class_id,
      subject_id: input.subject_id,
      teacher_id: teacherId,
      title: input.title.trim(),
      assessment_date: input.assessment_date,
      max_score: input.max_score,
      period_id: period.id,
      term: period.label,
    })
    .select("id,establishment_id,academic_year_id,class_id,subject_id,teacher_id,title,assessment_date,max_score,period_id,term")
    .single()
  if (error) throw new Error(`Impossible de créer l'évaluation: ${error.message}`)
  return data as Evaluation
}

export async function obtenirEvaluationsEnseignant(etablissementId: string, teacherId: string, periodId?: string) {
  const { data: assignments, error: assignmentError } = await supabaseBrowser
    .from("class_subjects")
    .select("class_id,subject_id")
    .eq("teacher_id", teacherId)
    .not("class_id", "is", null)
  if (assignmentError) throw new Error(`Impossible de charger les affectations: ${assignmentError.message}`)
  if (!assignments?.length) return []

  const pairs = assignments.map((a) => `and(class_id.eq.${a.class_id},subject_id.eq.${a.subject_id})`).join(",")
  let query = supabaseBrowser
    .from("assessments")
    .select("id,establishment_id,academic_year_id,class_id,subject_id,teacher_id,title,assessment_date,max_score,period_id,term")
    .eq("establishment_id", etablissementId)
    .eq("teacher_id", teacherId)
    .or(pairs)
    .order("assessment_date", { ascending: false })

  if (periodId) query = query.eq("period_id", periodId)
  const { data, error } = await query
  if (error) throw new Error(`Impossible de charger les évaluations: ${error.message}`)
  return (data ?? []) as Evaluation[]
}

export async function verifierPeriodeSaisie(
  etablissementId: string,
  academicYearId: string,
  periodId: string,
  assessmentDate: string,
) {
  return getOpenPeriod(etablissementId, academicYearId, periodId, assessmentDate)
}
