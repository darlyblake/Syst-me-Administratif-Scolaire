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
  // Construire le payload uniquement avec les champs définis et valides
  const payload: Record<string, any> = {}

  // N'envoyer que les champs qui sont définis et non null
  if (data.name !== undefined) payload.name = data.name
  if (data.legal_name !== undefined) payload.legal_name = data.legal_name
  if (data.short_name !== undefined) payload.short_name = data.short_name
  if (data.establishment_type !== undefined) payload.establishment_type = data.establishment_type
  if (data.code !== undefined) payload.code = data.code
  if (data.slogan !== undefined) payload.slogan = data.slogan
  if (data.email !== undefined) payload.email = data.email
  if (data.phone !== undefined) payload.phone = data.phone
  if (data.alternate_phone !== undefined) payload.alternate_phone = data.alternate_phone
  if (data.website !== undefined) payload.website = data.website
  if (data.address_line1 !== undefined) payload.address_line1 = data.address_line1
  if (data.address_line2 !== undefined) payload.address_line2 = data.address_line2
  if (data.postal_code !== undefined) payload.postal_code = data.postal_code
  if (data.city !== undefined) payload.city = data.city
  if (data.province !== undefined) payload.province = data.province
  if (data.country !== undefined) payload.country = data.country
  if (data.country_code !== undefined) payload.country_code = data.country_code
  if (data.currency_code !== undefined) payload.currency_code = data.currency_code
  if (data.currency_name !== undefined) payload.currency_name = data.currency_name
  if (data.currency_symbol !== undefined) payload.currency_symbol = data.currency_symbol
  if (data.timezone !== undefined) payload.timezone = data.timezone
  if (data.logo_url !== undefined) payload.logo_url = data.logo_url
  if (data.seal_url !== undefined) payload.seal_url = data.seal_url
  if (data.director_name !== undefined) payload.director_name = data.director_name

  const { data: result, error } = await supabaseBrowser
    .from("establishments")
    .update(payload)
    .eq("id", establishmentId)
    .select()
    .single()

  if (error) {
    console.error("Erreur modification établissement:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
    })
    throw new Error(error.message || "Impossible de modifier l'établissement.")
  }

  return result as Establishment
}
