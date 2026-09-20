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
    // Récupérer les tranches existantes pour identifier celles à supprimer
    const { data: existingInstallments } = await supabaseBrowser
      .from("tuition_plan_installments")
      .select("id")
      .eq("tuition_plan_id", planId)

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

    // Supprimer les échéances qui ne sont plus dans le payload
    if (existingInstallments) {
      const incomingIds = rows.map((r) => r.id).filter(Boolean)
      const toDelete = existingInstallments.map((i) => i.id).filter((id) => !incomingIds.includes(id as string))
      
      if (toDelete.length > 0) {
        await supabaseBrowser.from("tuition_plan_installments").delete().in("id", toDelete)
      }
    }
  } else if (planData.payment_mode !== "installments") {
     // Si on passe en mode mensuel ou unique, on supprime toutes les tranches existantes
     await supabaseBrowser.from("tuition_plan_installments").delete().eq("tuition_plan_id", planId)
  }

  return plan as TuitionPlan
}

export async function deactivateTuitionPlan(planId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("tuition_plans").update({ active: false }).eq("id", planId)

  if (error) throw new Error("Impossible de désactiver le tarif.")
}
