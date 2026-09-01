import { supabaseBrowser } from "@/lib/supabase/client"

export type EstablishmentLevelScope = "pre_primary" | "primary" | "secondary" | "high_school" | "university" | "center"

export interface EnabledEstablishmentLevel {
  scope: EstablishmentLevelScope
  enabled: boolean
}

export interface GradeLevel {
  id: string
  cycle_id: string
  name: string
  code: string
  display_order: number
  active: boolean
  scope: EstablishmentLevelScope
}

export async function getEnabledEstablishmentScopes(establishmentId: string): Promise<EstablishmentLevelScope[]> {
  const { data, error } = await supabaseBrowser
    .from("establishment_enabled_levels")
    .select("level_scope, enabled")
    .eq("establishment_id", establishmentId)
    .eq("enabled", true)
  if (error) throw new Error(`Impossible de charger les niveaux activés: ${error.message}`)
  return (data ?? []).map((row) => row.level_scope as EstablishmentLevelScope)
}

export async function getEnabledGradeLevels(establishmentId: string): Promise<GradeLevel[]> {
  const scopes = await getEnabledEstablishmentScopes(establishmentId)
  if (scopes.length === 0) return []

  const { data, error } = await supabaseBrowser
    .from("grade_levels")
    .select("id,cycle_id,name,code,display_order,active")
    .eq("active", true)
    .order("display_order")

  if (error) throw new Error(`Impossible de charger les niveaux: ${error.message}`)

  return (data ?? []).filter((level) => {
    const code = level.code.toLowerCase()
    const name = level.name.toLowerCase()
    if (scopes.includes("primary") && (code.includes("cp") || code.includes("ce") || name.includes("primaire"))) return true
    if (scopes.includes("secondary") && (code.includes("6") || code.includes("5") || code.includes("4") || code.includes("3") || name.includes("secondaire"))) return true
    if (scopes.includes("high_school") && (code.includes("2") || code.includes("1") || code.includes("tle") || name.includes("lycée"))) return true
    if (scopes.includes("pre_primary") && (code.includes("mater") || name.includes("matern"))) return true
    if (scopes.includes("university") && name.includes("univers")) return true
    if (scopes.includes("center") && name.includes("centre")) return true
    return false
  }).map((level) => ({ ...level, scope: inferScope(level.code, level.name) }))
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
