import { supabaseBrowser } from "@/lib/supabase/client"
import type { EstablishmentFeeSettings, EstablishmentFeeOverride } from "@/lib/supabase/types/tuition"

export async function getEstablishmentFeeSettings(establishmentId: string): Promise<EstablishmentFeeSettings | null> {
  const { data, error } = await supabaseBrowser
    .from("establishment_fee_settings")
    .select("*")
    .eq("establishment_id", establishmentId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger les paramètres de frais généraux.")
  }

  return data as EstablishmentFeeSettings | null
}

export async function upsertEstablishmentFeeSettings(
  establishmentId: string, 
  settings: { registration_fee: number; re_registration_fee: number }
): Promise<EstablishmentFeeSettings> {
  const payload = {
    establishment_id: establishmentId,
    ...settings
  }

  const { data, error } = await supabaseBrowser
    .from("establishment_fee_settings")
    .upsert(payload, { onConflict: "establishment_id" })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de sauvegarder les paramètres de frais généraux.")
  }

  return data as EstablishmentFeeSettings
}

export async function getEstablishmentFeeOverrides(establishmentId: string): Promise<EstablishmentFeeOverride[]> {
  const { data, error } = await supabaseBrowser
    .from("establishment_fee_overrides")
    .select("*")
    .eq("establishment_id", establishmentId)

  if (error) {
    throw new Error("Impossible de charger les frais spécifiques.")
  }

  return data as EstablishmentFeeOverride[]
}

export async function upsertEstablishmentFeeOverride(
  overrideData: Omit<EstablishmentFeeOverride, "id"> & { id?: string }
): Promise<EstablishmentFeeOverride> {
  const { data, error } = await supabaseBrowser
    .from("establishment_fee_overrides")
    .upsert(overrideData)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de sauvegarder les frais spécifiques.")
  }

  return data as EstablishmentFeeOverride
}

export async function deleteEstablishmentFeeOverride(overrideId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("establishment_fee_overrides")
    .delete()
    .eq("id", overrideId)

  if (error) {
    throw new Error("Impossible de supprimer les frais spécifiques.")
  }
}

export async function getEffectiveEnrollmentFees(
  establishmentId: string,
  gradeLevelId: string
): Promise<{ registration_fee: number; re_registration_fee: number }> {
  const { data, error } = await supabaseBrowser
    .rpc("get_effective_enrollment_fees", {
      p_establishment_id: establishmentId,
      p_grade_level_id: gradeLevelId
    })

  if (error) {
    throw new Error("Impossible de calculer les frais applicables.")
  }

  return data as { registration_fee: number; re_registration_fee: number }
}
