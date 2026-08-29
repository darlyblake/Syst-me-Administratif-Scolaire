import { supabaseBrowser } from "@/lib/supabase/client"
import type { AcademicYear } from "@/lib/supabase/types"

export async function getAcademicYears(establishmentId: string): Promise<AcademicYear[]> {
  const { data, error } = await supabaseBrowser
    .from("academic_years")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("start_date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les années scolaires.")
  }

  return (data ?? []) as AcademicYear[]
}

export async function getActiveAcademicYear(establishmentId: string): Promise<AcademicYear | null> {
  const { data, error } = await supabaseBrowser
    .from("academic_years")
    .select("*")
    .eq("establishment_id", establishmentId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de récupérer l’année active.")
  }

  return (data as AcademicYear | null) ?? null
}

export async function createAcademicYear(data: Partial<AcademicYear>): Promise<AcademicYear> {
  const { data: result, error } = await supabaseBrowser.from("academic_years").insert(data).select().single()

  if (error) {
    throw new Error("Impossible de créer l’année scolaire.")
  }

  return result as AcademicYear
}

export async function activateAcademicYear(yearId: string): Promise<AcademicYear> {
  const { data: current, error: currentError } = await supabaseBrowser
    .from("academic_years")
    .select("*")
    .eq("id", yearId)
    .single()

  if (currentError) {
    throw new Error("Année scolaire introuvable.")
  }

  const { data: updated, error: updateError } = await supabaseBrowser
    .from("academic_years")
    .update({ is_active: true, status: "active" })
    .eq("establishment_id", current.establishment_id)
    .neq("id", yearId)
    .select()

  if (updateError) {
    throw new Error("Impossible de mettre à jour l’année active.")
  }

  const { data: result, error } = await supabaseBrowser
    .from("academic_years")
    .update({ is_active: true, status: "active" })
    .eq("id", yearId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible d’activer l’année scolaire.")
  }

  void updated
  return result as AcademicYear
}

export async function closeAcademicYear(yearId: string): Promise<AcademicYear> {
  const { data, error } = await supabaseBrowser
    .from("academic_years")
    .update({ is_active: false, status: "closed" })
    .eq("id", yearId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de fermer l’année scolaire.")
  }

  return data as AcademicYear
}
