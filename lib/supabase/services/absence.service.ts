import { supabaseBrowser } from "@/lib/supabase/client"
import type { Absence, AbsenceWithStudent } from "@/lib/supabase/types"

export async function recordAbsence(data: Partial<Absence>): Promise<Absence> {
  const { data: result, error } = await supabaseBrowser
    .from("absences")
    .insert({
      establishment_id: data.establishment_id,
      student_id: data.student_id,
      class_id: data.class_id,
      date: data.date || new Date().toISOString(),
      status: data.status || "absent",
      reason: data.reason,
      justified: data.justified || false,
      justified_by: data.justified_by,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible d'enregistrer l'absence.")
  }

  return result as Absence
}

export async function updateAbsence(absenceId: string, data: Partial<Absence>): Promise<Absence> {
  const { data: result, error } = await supabaseBrowser
    .from("absences")
    .update({
      status: data.status,
      reason: data.reason,
      justified: data.justified,
      justified_by: data.justified_by,
      notes: data.notes,
    })
    .eq("id", absenceId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier l'absence.")
  }

  return result as Absence
}

export async function getAbsencesByStudent(studentId: string, dateRange?: { start: string; end: string }): Promise<Absence[]> {
  let query = supabaseBrowser
    .from("absences")
    .select("*")
    .eq("student_id", studentId)

  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end)
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les absences de l'élève.")
  }

  return (data ?? []) as Absence[]
}

export async function getAbsencesByClass(classId: string, date?: string): Promise<AbsenceWithStudent[]> {
  let query = supabaseBrowser
    .from("absences")
    .select("*, student:students(id, first_name, last_name)")
    .eq("class_id", classId)

  if (date) {
    query = query.eq("date", date)
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les absences de la classe.")
  }

  return (data ?? []) as AbsenceWithStudent[]
}

export async function getAbsencesForDate(establishmentId: string, date: string): Promise<AbsenceWithStudent[]> {
  const { data, error } = await supabaseBrowser
    .from("absences")
    .select("*, student:students(id, first_name, last_name)")
    .eq("establishment_id", establishmentId)
    .eq("date", date)
    .order("class_id", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les absences de la journée.")
  }

  return (data ?? []) as AbsenceWithStudent[]
}
