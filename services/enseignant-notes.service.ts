import { supabaseBrowser } from "@/lib/supabase/client"

export interface TeacherClassSubject {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  weekly_hours: number | null
}

export interface TeacherAssessment {
  id: string
  class_id: string
  subject_id: string
  title: string
  assessment_date: string
  max_score: number
}

export interface StudentGrade {
  id?: string
  assessment_id: string
  student_id: string
  score: number | null
  comment: string | null
}

/**
 * Donne uniquement les affectations de l'enseignant connecté.
 * La RLS Supabase reste l'autorité finale : ce service ne remplace pas les policies.
 */
export async function getMyClassSubjects(): Promise<TeacherClassSubject[]> {
  const { data: { user } } = await supabaseBrowser.auth.getUser()
  if (!user) throw new Error("Session utilisateur introuvable")

  const { data: teacher, error: teacherError } = await supabaseBrowser
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .eq("active", true)
    .maybeSingle()
  if (teacherError) throw new Error(`Impossible de récupérer le profil enseignant: ${teacherError.message}`)
  if (!teacher) return []

  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,subject_id,teacher_id,weekly_hours")
    .eq("teacher_id", teacher.id)
  if (error) throw new Error(`Impossible de charger vos affectations: ${error.message}`)
  return (data ?? []) as TeacherClassSubject[]
}

export async function getMyAssessments(): Promise<TeacherAssessment[]> {
  const { data, error } = await supabaseBrowser
    .from("assessments")
    .select("id,class_id,subject_id,title,assessment_date,max_score")
    .order("assessment_date", { ascending: false })
  if (error) throw new Error(`Impossible de charger vos évaluations: ${error.message}`)
  return (data ?? []) as TeacherAssessment[]
}

export async function saveMyGrades(grades: StudentGrade[]): Promise<void> {
  if (grades.length === 0) return
  const cleaned = grades.map((grade) => ({
    ...(grade.id ? { id: grade.id } : {}),
    assessment_id: grade.assessment_id,
    student_id: grade.student_id,
    score: grade.score,
    comment: grade.comment,
  }))

  const { error } = await supabaseBrowser.from("grades").upsert(cleaned, { onConflict: "assessment_id,student_id" })
  if (error) throw new Error(`Impossible d'enregistrer les notes: ${error.message}`)
}

export async function getGradesForAssessment(assessmentId: string): Promise<StudentGrade[]> {
  const { data, error } = await supabaseBrowser
    .from("grades")
    .select("id,assessment_id,student_id,score,comment")
    .eq("assessment_id", assessmentId)
  if (error) throw new Error(`Impossible de charger les notes: ${error.message}`)
  return (data ?? []) as StudentGrade[]
}
