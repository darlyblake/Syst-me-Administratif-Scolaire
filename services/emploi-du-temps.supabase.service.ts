import { supabaseBrowser } from "@/lib/supabase/client"

export interface EmploiDuTempsAffectation {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  weekly_hours: number | null
  subject_name: string
  subject_code: string | null
  teacher_name: string
}

export interface TimetableSlot {
  id: string
  establishment_id: string
  academic_year_id: string
  class_subject_id: string
  class_id: string
  subject_id: string
  teacher_id: string
  subject_name: string
  teacher_name: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
}

const SLOT_SELECT = `
  id,establishment_id,academic_year_id,class_subject_id,day_of_week,starts_at,ends_at,room,
  class_subjects!inner(
    class_id,subject_id,teacher_id,
    subjects!inner(id,name,code),
    teachers!inner(id,first_name,last_name)
  )
`

const toTime = (value: string) => value.slice(0, 5)

export async function obtenirAffectationsClasse(etablissementId: string, classId: string): Promise<EmploiDuTempsAffectation[]> {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,subject_id,teacher_id,weekly_hours,subjects!inner(id,name,code),teachers!inner(id,first_name,last_name,active)")
    .eq("class_id", classId)
    .eq("teachers.active", true)
    .eq("subjects.active", true)

  if (error) throw new Error(`Impossible de charger les affectations de la classe: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    class_id: row.class_id,
    subject_id: row.subject_id,
    teacher_id: row.teacher_id,
    weekly_hours: row.weekly_hours == null ? null : Number(row.weekly_hours),
    subject_name: row.subjects?.name ?? "Matière",
    subject_code: row.subjects?.code ?? null,
    teacher_name: [row.teachers?.first_name, row.teachers?.last_name].filter(Boolean).join(" ") || "Enseignant",
  }))
}

export async function obtenirCreneauxClasse(etablissementId: string, classId: string, academicYearId: string): Promise<TimetableSlot[]> {
  const { data, error } = await supabaseBrowser
    .from("timetable_slots")
    .select(SLOT_SELECT)
    .eq("establishment_id", etablissementId)
    .eq("academic_year_id", academicYearId)
    .eq("class_subjects.class_id", classId)
    .order("day_of_week")
    .order("starts_at")

  if (error) throw new Error(`Impossible de charger l'emploi du temps: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    establishment_id: row.establishment_id,
    academic_year_id: row.academic_year_id,
    class_subject_id: row.class_subject_id,
    class_id: row.class_subjects?.class_id,
    subject_id: row.class_subjects?.subject_id,
    teacher_id: row.class_subjects?.teacher_id,
    subject_name: row.class_subjects?.subjects?.name ?? "Matière",
    teacher_name: [row.class_subjects?.teachers?.first_name, row.class_subjects?.teachers?.last_name].filter(Boolean).join(" ") || "Enseignant",
    day_of_week: Number(row.day_of_week),
    starts_at: toTime(row.starts_at),
    ends_at: toTime(row.ends_at),
    room: row.room ?? null,
  }))
}

async function obtenirConflits(
  etablissementId: string,
  academicYearId: string,
  dayOfWeek: number,
  startsAt: string,
  endsAt: string,
  teacherId: string,
  room: string | null,
  excludeSlotId?: string,
) {
  const { data, error } = await supabaseBrowser
    .from("timetable_slots")
    .select("id,class_subject_id,day_of_week,starts_at,ends_at,room,class_subjects!inner(class_id,teacher_id)")
    .eq("establishment_id", etablissementId)
    .eq("academic_year_id", academicYearId)
    .eq("day_of_week", dayOfWeek)

  if (error) throw new Error(`Impossible de vérifier les conflits: ${error.message}`)

  const start = startsAt.slice(0, 5)
  const end = endsAt.slice(0, 5)
  return (data ?? []).filter((row: any) => {
    if (excludeSlotId && row.id === excludeSlotId) return false
    const rowStart = toTime(row.starts_at)
    const rowEnd = toTime(row.ends_at)
    const overlaps = start < rowEnd && end > rowStart
    if (!overlaps) return false
    if (row.class_subjects?.teacher_id === teacherId) return true
    if (room && row.room && row.room.trim().toLowerCase() === room.trim().toLowerCase()) return true
    return false
  })
}

export async function creerCreneauEmploiDuTemps(params: {
  etablissementId: string
  academicYearId: string
  classId: string
  classSubjectId: string
  dayOfWeek: number
  startsAt: string
  endsAt: string
  room?: string | null
}): Promise<void> {
  if (params.startsAt >= params.endsAt) throw new Error("L'heure de fin doit être après l'heure de début.")

  const { data: assignment, error: assignmentError } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,teacher_id")
    .eq("id", params.classSubjectId)
    .eq("class_id", params.classId)
    .single()

  if (assignmentError || !assignment) throw new Error("L'affectation sélectionnée est introuvable pour cette classe.")

  const conflicts = await obtenirConflits(
    params.etablissementId,
    params.academicYearId,
    params.dayOfWeek,
    params.startsAt,
    params.endsAt,
    assignment.teacher_id,
    params.room ?? null,
  )

  if (conflicts.some((row: any) => row.class_subjects?.teacher_id === assignment.teacher_id)) {
    throw new Error("Cet enseignant est déjà occupé sur ce créneau.")
  }
  if (params.room && conflicts.some((row: any) => row.room && row.room.trim().toLowerCase() === params.room!.trim().toLowerCase())) {
    throw new Error("Cette salle est déjà occupée sur ce créneau.")
  }
  if (conflicts.some((row: any) => row.class_subjects?.class_id === params.classId)) {
    throw new Error("La classe a déjà un cours sur ce créneau.")
  }

  const { error } = await supabaseBrowser.from("timetable_slots").insert({
    establishment_id: params.etablissementId,
    academic_year_id: params.academicYearId,
    class_subject_id: params.classSubjectId,
    day_of_week: params.dayOfWeek,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    room: params.room?.trim() || null,
  })

  if (error) throw new Error(`Impossible d'enregistrer le créneau: ${error.message}`)
}

export async function modifierCreneauEmploiDuTemps(params: {
  id: string
  etablissementId: string
  academicYearId: string
  classId: string
  classSubjectId: string
  dayOfWeek: number
  startsAt: string
  endsAt: string
  room?: string | null
}): Promise<void> {
  if (params.startsAt >= params.endsAt) throw new Error("L'heure de fin doit être après l'heure de début.")

  const { data: assignment, error: assignmentError } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,teacher_id")
    .eq("id", params.classSubjectId)
    .eq("class_id", params.classId)
    .single()

  if (assignmentError || !assignment) throw new Error("L'affectation sélectionnée est introuvable pour cette classe.")

  const conflicts = await obtenirConflits(
    params.etablissementId,
    params.academicYearId,
    params.dayOfWeek,
    params.startsAt,
    params.endsAt,
    assignment.teacher_id,
    params.room ?? null,
    params.id,
  )

  if (conflicts.some((row: any) => row.class_subjects?.teacher_id === assignment.teacher_id)) {
    throw new Error("Cet enseignant est déjà occupé sur ce créneau.")
  }
  if (params.room && conflicts.some((row: any) => row.room && row.room.trim().toLowerCase() === params.room!.trim().toLowerCase())) {
    throw new Error("Cette salle est déjà occupée sur ce créneau.")
  }
  if (conflicts.some((row: any) => row.class_subjects?.class_id === params.classId)) {
    throw new Error("La classe a déjà un cours sur ce créneau.")
  }

  const { error } = await supabaseBrowser
    .from("timetable_slots")
    .update({
      class_subject_id: params.classSubjectId,
      day_of_week: params.dayOfWeek,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      room: params.room?.trim() || null,
    })
    .eq("id", params.id)
    .eq("establishment_id", params.etablissementId)
    .eq("academic_year_id", params.academicYearId)

  if (error) throw new Error(`Impossible de modifier le créneau: ${error.message}`)
}

export async function supprimerCreneauEmploiDuTemps(id: string, etablissementId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("timetable_slots")
    .delete()
    .eq("id", id)
    .eq("establishment_id", etablissementId)

  if (error) throw new Error(`Impossible de supprimer le créneau: ${error.message}`)
}
