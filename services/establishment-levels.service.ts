import { supabaseBrowser } from "@/lib/supabase/client"

export type EstablishmentLevelScope = "pre_primary" | "primary" | "secondary" | "high_school" | "university" | "center"

export interface EnabledEstablishmentLevel { scope: EstablishmentLevelScope; enabled: boolean }
export interface GradeLevel { id: string; cycle_id: string; name: string; code: string; display_order: number; active: boolean; scope: EstablishmentLevelScope }

const SUPPORTED_SCOPES: EstablishmentLevelScope[] = ["pre_primary", "primary", "secondary", "high_school", "university", "center"]

export async function getEnabledEstablishmentScopes(establishmentId: string): Promise<EstablishmentLevelScope[]> {
  const { data, error } = await supabaseBrowser.from("establishment_enabled_levels").select("level_scope, enabled").eq("establishment_id", establishmentId).eq("enabled", true)
  if (error) throw new Error(`Impossible de charger les niveaux activés: ${error.message}`)
  return (data ?? []).map(row => row.level_scope as EstablishmentLevelScope).filter(scope => SUPPORTED_SCOPES.includes(scope))
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
  const scopes = await getEnabledEstablishmentScopes(establishmentId)
  if (scopes.length === 0) return []
  const { data, error } = await supabaseBrowser.from("grade_levels").select("id,cycle_id,name,code,display_order,active").eq("active", true).order("display_order")
  if (error) throw new Error(`Impossible de charger les niveaux: ${error.message}`)
  return (data ?? []).filter(level => scopes.includes(inferScope(level.code, level.name))).map(level => ({ ...level, scope: inferScope(level.code, level.name) }))
}

function inferScope(code: string, name: string): EstablishmentLevelScope {
  const value = `${code} ${name}`.toLowerCase()
  if (value.includes("matern")) return "pre_primary"
  if (value.includes("cp") || value.includes("ce") || value.includes("primaire")) return "primary"
  if (value.includes("6") || value.includes("5") || value.includes("4") || value.includes("3") || value.includes("secondaire")) return "secondary"
  if (value.includes("2") || value.includes("1") || value.includes("tle") || value.includes("lycée")) return "high_school"
  if (value.includes("univers")) return "university"
  return "center"
}
