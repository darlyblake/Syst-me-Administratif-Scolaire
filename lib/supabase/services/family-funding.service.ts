import { supabaseBrowser } from "@/lib/supabase/client"

export interface FamilySiblingCandidate {
  student_id: string
  first_name: string
  last_name: string
  student_number: string | null
  birth_date: string | null
  class_name: string | null
  family_code: string | null
}
export interface SponsoringOrganization {
  id: string
  name: string
  organization_type: string
  is_state: boolean
  active: boolean
  reference: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
}
export type FeeCategory = "registration" | "tuition" | "option" | "caution" | "other"
export interface OrganizationCoverageRule {
  id: string
  organization_id: string
  category: FeeCategory
  option_type: string | null
  category_label: string
  coverage_percent: number
  active: boolean
  grade_level_id: string | null
  academic_year_id: string | null
}
const CATEGORY_LABELS: Record<FeeCategory, string> = {
  registration: "Frais d'inscription", tuition: "Scolarité", option: "Options", caution: "Caution", other: "Autres frais",
}
export async function searchFamilySiblingCandidates(establishmentId: string, search: string): Promise<FamilySiblingCandidate[]> {
  if (!establishmentId || search.trim().length < 2) return []
  const { data, error } = await supabaseBrowser.rpc("search_family_sibling_candidates", { p_establishment_id: establishmentId, p_search: search.trim() })
  if (error) throw new Error("Impossible de rechercher les élèves de cet établissement.")
  return Array.isArray(data) ? data as FamilySiblingCandidate[] : []
}
export async function listSponsoringOrganizations(establishmentId: string): Promise<SponsoringOrganization[]> {
  const { data, error } = await supabaseBrowser.from("sponsoring_organizations")
    .select("id,name,organization_type,is_state,active,reference,contact_name,phone,email")
    .eq("establishment_id", establishmentId).order("name")
  if (error) throw new Error("Impossible de charger les organismes de prise en charge.")
  return (data ?? []) as SponsoringOrganization[]
}
export async function listOrganizationCoverageRules(establishmentId: string, organizationId: string): Promise<OrganizationCoverageRule[]> {
  const { data, error } = await supabaseBrowser.from("organization_coverage_rules")
    .select("id,organization_id,category,option_type,coverage_percent,active,grade_level_id,academic_year_id")
    .eq("establishment_id", establishmentId).eq("organization_id", organizationId).eq("active", true).order("category")
  if (error) throw new Error("Impossible de charger les règles de couverture.")
  return (data ?? []).map((row: any) => { const optionLabels: Record<string, string> = { tenue: "Tenue / uniforme", transport: "Transport", cantine: "Cantine", assurance: "Assurance", cooperative: "Coopérative", activite_parascolaire: "Activité parascolaire" }; const optionLabel = row.option_type ? (optionLabels[row.option_type] ?? row.option_type.replaceAll("_", " ")) : ""; return { ...row, category_label: (CATEGORY_LABELS[row.category as FeeCategory] ?? "Autres frais") + (optionLabel ? " — " + optionLabel : "") } }) as OrganizationCoverageRule[]
}
