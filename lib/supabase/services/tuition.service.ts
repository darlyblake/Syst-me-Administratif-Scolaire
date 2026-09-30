import { supabaseBrowser } from "@/lib/supabase/client"
import type { TuitionPlan, TuitionPlanInstallment } from "@/lib/supabase/types"

interface TuitionPlanPayload extends Partial<TuitionPlan> {
  installments?: Array<
    Partial<Omit<TuitionPlanInstallment, "id" | "tuition_plan_id" | "created_at">> & {
      id?: string
    }
  >
}

export async function getTuitionPlans(academicYearId: string): Promise<TuitionPlan[]> {
  if (!academicYearId) {
    return []
  }

  const { data, error } = await supabaseBrowser
    .from("tuition_plans")
    .select("*, installments:tuition_plan_installments(*)")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: false })

  if (error) throw new Error("Impossible de charger les tarifs.")
  
  // Tri des échéances par numéro (côté client pour éviter les soucis de syntaxe PostgREST)
  const plans = (data ?? []) as any[]
  plans.forEach(plan => {
    if (plan.installments) {
      plan.installments.sort((a: any, b: any) => (a.installment_number ?? 0) - (b.installment_number ?? 0))
    }
  })

  return plans as TuitionPlan[]
}

export async function getTuitionPlan(academicYearId: string, gradeLevelId: string): Promise<TuitionPlan | null> {
  const { data, error } = await supabaseBrowser
    .from("tuition_plans")
    .select("*, installments:tuition_plan_installments(*)")
    .eq("academic_year_id", academicYearId)
    .eq("grade_level_id", gradeLevelId)
    .eq("active", true)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger le tarif.")
  }

  if (data && data.installments) {
    data.installments.sort((a: any, b: any) => (a.installment_number ?? 0) - (b.installment_number ?? 0))
  }

  return (data as TuitionPlan | null) ?? null
}

export async function createTuitionPlan(data: TuitionPlanPayload): Promise<TuitionPlan> {
  let percentageSumCreate = 0;
  const schedule = data.installments?.map((inst, idx, arr) => {
    let p = inst.percentage;
    if (!p) {
      if (idx === arr.length - 1) {
        p = 100 - percentageSumCreate;
      } else {
        p = inst.amount && data.annual_tuition ? Math.round((inst.amount / data.annual_tuition) * 100) : 0;
      }
    }
    percentageSumCreate += p;
    return {
      label: inst.label,
      percentage: p,
      due_date: inst.due_date ?? null
    }
  }) ?? []

  let planError = null;
  let plan = null;

  if (data.payment_mode === "installments") {
    const res = await supabaseBrowser.rpc("create_tuition_plan_server_validated", {
      p_establishment_id: data.establishment_id!,
      p_academic_year_id: data.academic_year_id!,
      p_grade_level_id: data.grade_level_id!,
      p_name: data.name ?? "Scolarité",
      p_annual_tuition: data.annual_tuition!,
      p_payment_mode: data.payment_mode,
      p_schedule: schedule,
      p_billing_start_date: data.billing_start_date ?? null,
      p_billing_end_date: data.billing_end_date ?? null,
      p_enrollment_payment_priority: data.enrollment_payment_priority ?? 1,
    })
    plan = res.data;
    planError = res.error;
  } else {
    // Mode mensuel ou unique
    const res = await supabaseBrowser.rpc("create_tuition_plan", {
      p_establishment_id: data.establishment_id!,
      p_academic_year_id: data.academic_year_id!,
      p_grade_level_id: data.grade_level_id!,
      p_name: data.name ?? "Scolarité",
      p_registration_fee: data.registration_fee ?? 0,
      p_annual_tuition: data.annual_tuition!,
      p_payment_mode: data.payment_mode!,
      p_installment_count: data.payment_mode === "single" ? 1 : null // null lets the backend generate based on dates or fallback
    })
    plan = res.data;
    planError = res.error;
  }

  if (planError) throw new Error("Impossible d’enregistrer le tarif. " + planError.message)
  return plan as TuitionPlan
}

export async function updateTuitionPlan(planId: string, data: TuitionPlanPayload): Promise<TuitionPlan> {
  let percentageSumUpdate = 0;
  const schedule = data.installments?.map((inst, idx, arr) => {
    let p = inst.percentage;
    if (!p) {
      if (idx === arr.length - 1) {
        p = 100 - percentageSumUpdate;
      } else {
        p = inst.amount && data.annual_tuition ? Math.round((inst.amount / data.annual_tuition) * 100) : 0;
      }
    }
    percentageSumUpdate += p;
    return {
      label: inst.label,
      percentage: p,
      due_date: inst.due_date ?? null
    }
  }) ?? []

  const { data: plan, error: planError } = await supabaseBrowser.rpc("update_tuition_plan_server_validated", {
    p_tuition_plan_id: planId,
    p_name: data.name ?? "Scolarité",
    p_registration_fee: data.registration_fee ?? 0,
    p_annual_tuition: data.annual_tuition!,
    p_payment_mode: data.payment_mode!,
    p_schedule: schedule,
    p_billing_start_date: data.billing_start_date ?? null,
    p_billing_end_date: data.billing_end_date ?? null,
    p_active: data.active ?? true,
    p_enrollment_payment_priority: data.enrollment_payment_priority ?? 1,
  })

  if (planError) throw new Error("Impossible de modifier le tarif. " + planError.message)
  return plan as TuitionPlan
}


export async function setTuitionPlanLateEnrollmentPolicy(
  tuitionPlanId: string,
  policy: "full_year" | "from_enrollment",
): Promise<void> {
  const { error } = await supabaseBrowser.rpc("set_tuition_plan_late_enrollment_policy", {
    p_tuition_plan_id: tuitionPlanId,
    p_policy: policy,
  })
  if (error) throw new Error("Impossible d'enregistrer la règle des inscriptions en cours d'année. " + error.message)
}

export async function deactivateTuitionPlan(planId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("tuition_plans").update({ active: false }).eq("id", planId)

  if (error) throw new Error("Impossible de désactiver le tarif.")
}
