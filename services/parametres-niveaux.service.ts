import { supabaseBrowser } from "@/lib/supabase/client"
import type { EstablishmentLevelScope } from "@/services/establishment-levels.service"

/**
 * Adaptateur dédié aux niveaux d'établissement.
 * Il permet de migrer progressivement SettingsPage sans toucher aux autres
 * paramètres historiques encore gérés par ServiceParametres.
 */
export async function obtenirNiveauxEtablissement(etablissementId: string): Promise<EstablishmentLevelScope[]> {
  const { data, error } = await supabaseBrowser
    .from("establishment_enabled_levels")
    .select("level_scope")
    .eq("establishment_id", etablissementId)
    .eq("enabled", true)

  if (error) throw new Error(`Impossible de charger les niveaux de l'établissement: ${error.message}`)
  return (data ?? []).map((row) => row.level_scope as EstablishmentLevelScope)
}

export async function enregistrerNiveauxEtablissement(
  etablissementId: string,
  scopes: EstablishmentLevelScope[],
): Promise<void> {
  const { error: disableError } = await supabaseBrowser
    .from("establishment_enabled_levels")
    .update({ enabled: false })
    .eq("establishment_id", etablissementId)

  if (disableError) throw new Error(`Impossible de mettre à jour les niveaux: ${disableError.message}`)

  if (scopes.length === 0) return

  const rows = scopes.map((level_scope) => ({
    establishment_id: etablissementId,
    level_scope,
    enabled: true,
  }))

  const { error } = await supabaseBrowser
    .from("establishment_enabled_levels")
    .upsert(rows, { onConflict: "establishment_id,level_scope" })

  if (error) throw new Error(`Impossible d'enregistrer les niveaux: ${error.message}`)
}
