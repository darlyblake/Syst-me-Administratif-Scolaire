import { supabaseBrowser } from "@/lib/supabase/client"

export interface StateFinanceSettings {
  establishment_id: string
  state_students_enabled: boolean
  state_covers_registration: boolean
  state_covers_tuition: boolean
  state_allows_family_options: boolean
  state_allows_caution: boolean
  state_caution_default_amount: number
  state_caution_refundable: boolean
}

export interface StateImportStudent {
  first_name: string
  last_name: string
  student_number?: string
  birth_date?: string
  sex?: string
  phone?: string
  email?: string
}

export interface StateImportResult {
  imported: number
  failed: number
  errors: Array<{ row: number; message: string; first_name?: string; last_name?: string }>
}

export async function getStateFinanceSettings(establishmentId: string): Promise<StateFinanceSettings> {
  const { data, error } = await supabaseBrowser.rpc("get_state_finance_settings", {
    p_establishment_id: establishmentId,
  })
  if (error) throw new Error("Impossible de charger la configuration des élèves pris en charge par l'État.")
  return data as StateFinanceSettings
}

export async function upsertStateFinanceSettings(data: StateFinanceSettings): Promise<StateFinanceSettings> {
  const { data: result, error } = await supabaseBrowser.rpc("upsert_state_finance_settings", {
    p_establishment_id: data.establishment_id,
    p_state_students_enabled: data.state_students_enabled,
    p_state_covers_registration: data.state_covers_registration,
    p_state_covers_tuition: data.state_covers_tuition,
    p_state_allows_family_options: data.state_allows_family_options,
    p_state_allows_caution: data.state_allows_caution,
    p_state_caution_default_amount: data.state_caution_default_amount,
    p_state_caution_refundable: data.state_caution_refundable,
  })
  if (error) throw new Error("Impossible d'enregistrer la configuration.")
  return result as StateFinanceSettings
}

export async function importStateStudents(data: {
  establishmentId: string
  academicYearId: string
  classId: string
  tuitionPlanId: string
  students: StateImportStudent[]
  optionIds?: string[]
  cautionAmount?: number
  cautionRefundable?: boolean
}): Promise<StateImportResult> {
  const { data: result, error } = await supabaseBrowser.rpc("import_state_students", {
    p_establishment_id: data.establishmentId,
    p_academic_year_id: data.academicYearId,
    p_class_id: data.classId,
    p_tuition_plan_id: data.tuitionPlanId,
    p_students: data.students,
    p_option_ids: data.optionIds ?? [],
    p_caution_amount: data.cautionAmount ?? 0,
    p_caution_refundable: data.cautionRefundable ?? true,
  })
  if (error) throw new Error(error.message || "Impossible d'importer les élèves pris en charge par l'État.")
  return result as StateImportResult
}
