import { supabaseBrowser } from "@/lib/supabase/client"
import type { Establishment } from "@/lib/supabase/types"

export async function getEstablishments(): Promise<Establishment[]> {
  const { data, error } = await supabaseBrowser
    .from("establishments")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les établissements.")
  }

  return (data ?? []) as Establishment[]
}

export async function getEstablishment(establishmentId: string): Promise<Establishment | null> {
  const { data, error } = await supabaseBrowser
    .from("establishments")
    .select("*")
    .eq("id", establishmentId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l’établissement.")
  }

  return (data as Establishment | null) ?? null
}

export async function createEstablishment(data: Partial<Establishment>): Promise<Establishment> {
  const { data: result, error } = await supabaseBrowser
    .from("establishments")
    .insert({
      name: data.name,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer l’établissement.")
  }

  return result as Establishment
}

export async function updateEstablishment(establishmentId: string, data: Partial<Establishment>): Promise<Establishment> {
  const { data: result, error } = await supabaseBrowser
    .from("establishments")
    .update({
      name: data.name,
    })
    .eq("id", establishmentId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier l’établissement.")
  }

  return result as Establishment
}
