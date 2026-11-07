import { supabaseBrowser } from "@/lib/supabase/client"

export type SchoolEventType = "reunion" | "examen" | "fete" | "conference" | "sport" | "autre"

export type SchoolEvent = {
  id: string
  title: string
  description: string | null
  event_type: SchoolEventType
  starts_at: string
  ends_at: string | null
  location: string | null
  academic_year_id: string | null
  created_at: string
}

export const schoolEventsService = {
  async list(establishmentId: string, academicYearId?: string | null) {
    let query = supabaseBrowser
      .from("school_events")
      .select("id,title,description,event_type,starts_at,ends_at,location,academic_year_id,created_at")
      .eq("establishment_id", establishmentId)
      .order("starts_at", { ascending: true })
    if (academicYearId) query = query.eq("academic_year_id", academicYearId)
    const { data, error } = await query
    if (error) throw new Error(error.message || "Impossible de charger les événements scolaires.")
    return (data ?? []) as SchoolEvent[]
  },

  async create(input: {
    establishmentId: string
    academicYearId: string | null
    title: string
    description?: string
    eventType: SchoolEventType
    startsAt: string
    endsAt?: string | null
    location?: string
  }) {
    const { data: auth } = await supabaseBrowser.auth.getUser()
    const { data, error } = await supabaseBrowser
      .from("school_events")
      .insert({
        establishment_id: input.establishmentId,
        academic_year_id: input.academicYearId,
        created_by: auth.user?.id ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        event_type: input.eventType,
        starts_at: input.startsAt,
        ends_at: input.endsAt || null,
        location: input.location?.trim() || null,
      })
      .select("id,title,description,event_type,starts_at,ends_at,location,academic_year_id,created_at")
      .single()
    if (error) throw new Error(error.message || "Impossible d'enregistrer l'événement.")
    return data as SchoolEvent
  },

  async remove(id: string) {
    const { error } = await supabaseBrowser.from("school_events").delete().eq("id", id)
    if (error) throw new Error(error.message || "Impossible de supprimer l'événement.")
  },
}
