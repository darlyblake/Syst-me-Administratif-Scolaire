import { supabaseBrowser } from "@/lib/supabase/client"

export interface AffectationEnseignant {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  weeklyHours: number | null
  className: string
  subjectName: string
}

class ServiceAffectationsEnseignants {
  async obtenir(teacherId: string, establishmentId: string): Promise<AffectationEnseignant[]> {
    const { data, error } = await supabaseBrowser
      .from("class_subjects")
      .select("id,class_id,subject_id,teacher_id,weekly_hours,school_class:school_classes!inner(id,name,establishment_id),subject:subjects!inner(id,name,establishment_id)")
      .eq("teacher_id", teacherId)
      .eq("school_class.establishment_id", establishmentId)
      .eq("subject.establishment_id", establishmentId)
      .order("created_at")

    if (error) throw new Error(error.message)

    return (data ?? []).map((row: any) => ({
      id: row.id,
      classId: row.class_id,
      subjectId: row.subject_id,
      teacherId: row.teacher_id,
      weeklyHours: row.weekly_hours,
      className: row.school_class?.name ?? "",
      subjectName: row.subject?.name ?? "",
    }))
  }

  async ajouter(params: { teacherId: string; classId: string; subjectId: string; weeklyHours?: number | null }): Promise<void> {
    const { error } = await supabaseBrowser.from("class_subjects").insert({
      teacher_id: params.teacherId,
      class_id: params.classId,
      subject_id: params.subjectId,
      weekly_hours: params.weeklyHours ?? null,
    })
    if (error) throw new Error(error.message)
  }

  async modifier(id: string, params: { subjectId?: string; weeklyHours?: number | null }): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (params.subjectId !== undefined) payload.subject_id = params.subjectId
    if (params.weeklyHours !== undefined) payload.weekly_hours = params.weeklyHours
    if (!Object.keys(payload).length) return

    const { error } = await supabaseBrowser.from("class_subjects").update(payload).eq("id", id)
    if (error) throw new Error(error.message)
  }

  async supprimer(id: string): Promise<void> {
    const { error } = await supabaseBrowser.from("class_subjects").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }
}

export const serviceAffectationsEnseignants = new ServiceAffectationsEnseignants()
