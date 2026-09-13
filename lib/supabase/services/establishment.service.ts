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
      legal_name: data.legal_name,
      short_name: data.short_name,
      establishment_type: data.establishment_type,
      code: data.code,
      slogan: data.slogan,
      email: data.email,
      phone: data.phone,
      alternate_phone: data.alternate_phone,
      website: data.website,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      postal_code: data.postal_code,
      city: data.city,
      province: data.province,
      country: data.country,
      country_code: data.country_code,
      currency_code: data.currency_code,
      currency_name: data.currency_name,
      currency_symbol: data.currency_symbol,
      timezone: data.timezone,
      logo_url: data.logo_url,
      seal_url: data.seal_url,
    })
    .eq("id", establishmentId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier l'établissement.")
  }

  return result as Establishment
}
