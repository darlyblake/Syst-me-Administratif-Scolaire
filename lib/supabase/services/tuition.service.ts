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
  const { data, error } = await supabaseBrowser
    .from("tuition_plans")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) throw new Error("Impossible de charger les tarifs.")
  return (data ?? []) as TuitionPlan[]
}

export async function getTuitionPlan(academicYearId: string, gradeLevelId: string): Promise<TuitionPlan | null> {
  const { data, error } = await supabaseBrowser
    .from("tuition_plans")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .eq("grade_level_id", gradeLevelId)
    .eq("is_active", true)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger le tarif.")
  }

  return (data as TuitionPlan | null) ?? null
}

export async function createTuitionPlan(data: TuitionPlanPayload): Promise<TuitionPlan> {
  const { installments, ...planData } = data

  const { data: plan, error: planError } = await supabaseBrowser
    .from("tuition_plans")
    .insert(planData)
    .select()
    .single()

  if (planError) throw new Error("Impossible d’enregistrer le tarif.")

  if (installments && installments.length > 0) {
    const rows = installments.map((installment) => ({
      ...installment,
      tuition_plan_id: plan.id,
      due_date: installment.due_date ?? null,
    }))

    const { error: installmentError } = await supabaseBrowser.from("tuition_plan_installments").insert(rows)

    if (installmentError) {
      throw new Error("Impossible d’enregistrer les échéances.")
    }
  }

  return plan as TuitionPlan
}

export async function updateTuitionPlan(planId: string, data: TuitionPlanPayload): Promise<TuitionPlan> {
  const { installments, ...planData } = data

  const { data: plan, error: planError } = await supabaseBrowser
    .from("tuition_plans")
    .update(planData)
    .eq("id", planId)
    .select()
    .single()

  if (planError) throw new Error("Impossible de modifier le tarif.")

  if (installments) {
    const rows = installments.map((installment) => ({
      ...installment,
      tuition_plan_id: planId,
      due_date: installment.due_date ?? null,
    }))

    if (rows.length > 0) {
      const { error: installmentError } = await supabaseBrowser.from("tuition_plan_installments").upsert(rows, {
        onConflict: "id",
      })

      if (installmentError) {
        throw new Error("Impossible de synchroniser les échéances.")
      }
    }
  }

  return plan as TuitionPlan
}

export async function deactivateTuitionPlan(planId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("tuition_plans").update({ is_active: false }).eq("id", planId)

  if (error) throw new Error("Impossible de désactiver le tarif.")
}
