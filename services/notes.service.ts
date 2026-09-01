import { supabaseBrowser } from "@/lib/supabase/client"

export interface NoteInput {
  assessment_id: string
  student_id: string
  score: number | null
  comment?: string | null
}

export interface Note extends NoteInput {
  id: string
}

interface EvaluationContext {
  id: string
  establishment_id: string
  academic_year_id: string
  class_id: string
  subject_id: string
  teacher_id: string
  max_score: number
  period_id: string
}

async function getOpenEvaluation(assessmentId: string, teacherId: string, establishmentId: string) {
  const { data, error } = await supabaseBrowser
    .from("assessments")
    .select("id,establishment_id,academic_year_id,class_id,subject_id,teacher_id,max_score,period_id,academic_grade_periods!inner(start_date,end_date,entry_open)")
    .eq("id", assessmentId)
    .eq("establishment_id", establishmentId)
    .eq("teacher_id", teacherId)
    .eq("academic_grade_periods.entry_open", true)
    .maybeSingle()

  if (error) throw new Error(`Impossible de vérifier la période de saisie: ${error.message}`)
  if (!data) throw new Error("La période de saisie est fermée ou cette évaluation ne vous est pas attribuée.")

  const period = data.academic_grade_periods as unknown as { start_date: string; end_date: string; entry_open: boolean }
  const today = new Date().toISOString().slice(0, 10)
  if (today < period.start_date || today > period.end_date) {
    throw new Error("La période de saisie n'est pas ouverte à cette date.")
  }

  return data as unknown as EvaluationContext
}

async function assertStudentBelongsToClass(studentId: string, classId: string, establishmentId: string) {
  const { data, error } = await supabaseBrowser
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("establishment_id", establishmentId)
    .maybeSingle()

  if (error) throw new Error(`Impossible de vérifier l'inscription de l'élève: ${error.message}`)
  if (!data) throw new Error("Cet élève n'appartient pas à la classe de l'évaluation.")
}

export async function enregistrerNotes(
  establishmentId: string,
  teacherId: string,
  notes: NoteInput[],
): Promise<Note[]> {
  if (!notes.length) return []

  const grouped = new Map<string, NoteInput[]>()
  for (const note of notes) {
    const group = grouped.get(note.assessment_id) ?? []
    group.push(note)
    grouped.set(note.assessment_id, group)
  }

  for (const [assessmentId, assessmentNotes] of grouped) {
    const evaluation = await getOpenEvaluation(assessmentId, teacherId, establishmentId)

    for (const note of assessmentNotes) {
      await assertStudentBelongsToClass(note.student_id, evaluation.class_id, establishmentId)
      if (note.score !== null && (!Number.isFinite(note.score) || note.score < 0 || note.score > evaluation.max_score)) {
        throw new Error(`La note doit être comprise entre 0 et ${evaluation.max_score}.`)
      }
    }
  }

  const payload = notes.map((note) => ({
    assessment_id: note.assessment_id,
    student_id: note.student_id,
    score: note.score,
    comment: note.comment ?? null,
  }))

  const { data, error } = await supabaseBrowser
    .from("grades")
    .upsert(payload, { onConflict: "assessment_id,student_id" })
    .select("id,assessment_id,student_id,score,comment")

  if (error) throw new Error(`Impossible d'enregistrer les notes: ${error.message}`)
  return (data ?? []) as Note[]
}

export async function obtenirNotesEvaluation(
  establishmentId: string,
  teacherId: string,
  assessmentId: string,
): Promise<Note[]> {
  await getOpenEvaluation(assessmentId, teacherId, establishmentId)

  const { data, error } = await supabaseBrowser
    .from("grades")
    .select("id,assessment_id,student_id,score,comment")
    .eq("assessment_id", assessmentId)

  if (error) throw new Error(`Impossible de charger les notes: ${error.message}`)
  return (data ?? []) as Note[]
}
