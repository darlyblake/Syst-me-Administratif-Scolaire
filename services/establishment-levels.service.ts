import { supabaseBrowser } from "@/lib/supabase/client"

export type EstablishmentLevelScope = "pre_primary" | "primary" | "secondary" | "high_school" | "university" | "center"

export interface EnabledEstablishmentLevel { scope: EstablishmentLevelScope; enabled: boolean }
export interface GradeLevel { id: string; cycle_id: string; name: string; code: string; display_order: number; active: boolean; scope: EstablishmentLevelScope }

const SUPPORTED_SCOPES: EstablishmentLevelScope[] = ["pre_primary", "primary", "secondary", "high_school", "university", "center"]

/**
 * Source de vérité de la structure scolaire :
 * Paramètres > Structure académique enregistre les cycles dans education_cycles
 * et leurs niveaux dans grade_levels.
 *
 * establishment_enabled_levels est conservée pour compatibilité avec les
 * anciennes configurations, mais ne doit pas masquer une structure active.
 */
export async function getEnabledEstablishmentScopes(establishmentId: string): Promise<EstablishmentLevelScope[]> {
  const { data, error } = await supabaseBrowser
    .from("education_cycles")
    .select("name, code, active")
    .eq("establishment_id", establishmentId)
    .eq("active", true)
    .order("display_order")

  if (error) throw new Error(`Impossible de charger les cycles activés: ${error.message}`)

  return [...new Set(
    (data ?? [])
      .map((cycle) => inferScope(cycle.code, cycle.name))
      .filter((scope) => SUPPORTED_SCOPES.includes(scope))
  )]
}

export async function saveEnabledEstablishmentScopes(establishmentId: string, scopes: EstablishmentLevelScope[]): Promise<void> {
  const uniqueScopes = [...new Set(scopes)].filter((scope): scope is EstablishmentLevelScope => SUPPORTED_SCOPES.includes(scope))
  const { error: deleteError } = await supabaseBrowser.from("establishment_enabled_levels").delete().eq("establishment_id", establishmentId)
  if (deleteError) throw new Error(`Impossible de mettre à jour les niveaux: ${deleteError.message}`)
  if (uniqueScopes.length === 0) return
  const { error: insertError } = await supabaseBrowser.from("establishment_enabled_levels").insert(uniqueScopes.map(level_scope => ({ establishment_id: establishmentId, level_scope, enabled: true })))
  if (insertError) throw new Error(`Impossible d'enregistrer les niveaux: ${insertError.message}`)
}

export async function getEnabledGradeLevels(establishmentId: string): Promise<GradeLevel[]> {
  const { data: cycles, error: cyclesError } = await supabaseBrowser
    .from("education_cycles")
    .select("id, name, code, active, display_order")
    .eq("establishment_id", establishmentId)
    .eq("active", true)
    .order("display_order")

  if (cyclesError) throw new Error(`Impossible de charger les cycles activés: ${cyclesError.message}`)
  if (!cycles?.length) return []

  const cycleIds = cycles.map((cycle) => cycle.id)
  const { data: levels, error: levelsError } = await supabaseBrowser
    .from("grade_levels")
    .select("id,cycle_id,name,code,display_order,active")
    .in("cycle_id", cycleIds)
    .eq("active", true)
    .order("display_order")

  if (levelsError) throw new Error(`Impossible de charger les niveaux: ${levelsError.message}`)

  const scopeByCycleId = new Map(
    cycles.map((cycle) => [cycle.id, inferScope(cycle.code, cycle.name)])
  )

  return (levels ?? [])
    .map((level) => {
      const scope = scopeByCycleId.get(level.cycle_id)
      return scope ? { ...level, scope } : null
    })
    .filter((level): level is GradeLevel => level !== null)
}

function inferScope(code: string | null, name: string): EstablishmentLevelScope {
  const value = `${code ?? ""} ${name}`.toLowerCase()

  if (value.includes("matern")) return "pre_primary"
  if (value.includes("primaire")) return "primary"
  if (value.includes("collège") || value.includes("college") || value.includes("secondaire")) return "secondary"
  if (value.includes("lycée") || value.includes("lycee")) return "high_school"
  if (value.includes("univers")) return "university"
  return "center"
}
