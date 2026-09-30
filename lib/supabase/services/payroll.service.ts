import { supabaseBrowser } from "@/lib/supabase/client"

const db = supabaseBrowser as any

export const payrollService = {
  async getSettings(establishmentId: string) {
    const { data, error } = await db.from("payroll_settings").select("*").eq("establishment_id", establishmentId).maybeSingle()
    if (error) throw new Error(error.message || "Impossible de charger les paramètres de paie.")
    return data
  },

  async saveSettings(establishmentId: string, generationDay: number, autoGenerate: boolean) {
    const { data, error } = await db.from("payroll_settings").upsert({
      establishment_id: establishmentId,
      generation_day: generationDay,
      frequency: "monthly",
      period_scope: "previous_month",
      auto_generate: autoGenerate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "establishment_id" }).select().single()
    if (error) throw new Error(error.message || "Impossible d'enregistrer les paramètres de paie.")
    return data
  },

  async getStaff(establishmentId: string) {
    const { data: staff, error } = await db.from("v_payroll_staff").select("*")
      .eq("establishment_id", establishmentId).order("last_name").order("first_name")
    if (error) throw new Error(error.message || "Impossible de charger le personnel.")
    const { data: compensations, error: compensationError } = await db.from("staff_compensations").select("*")
      .eq("establishment_id", establishmentId).eq("active", true)
    if (compensationError) throw new Error(compensationError.message || "Impossible de charger les rémunérations.")
    const map = new Map((compensations ?? []).map((c: any) => [`${c.staff_type}:${c.staff_id}`, c]))
    return (staff ?? []).map((s: any) => {
      const c = map.get(`${s.staff_type}:${s.staff_id}`) as any
      return { ...s, compensation_id: c?.id, remuneration_type: c?.remuneration_type,
        monthly_salary: Number(c?.monthly_salary || 0), hourly_rate: Number(c?.hourly_rate || 0) }
    })
  },

  async saveCompensation(input: any) {
    const { data: current } = await db.from("staff_compensations").select("id")
      .eq("establishment_id", input.establishmentId).eq("staff_type", input.staffType)
      .eq("staff_id", input.staffId).eq("active", true).maybeSingle()
    if (current?.id) {
      const { error } = await db.from("staff_compensations").update({
        active: false, effective_to: input.effectiveFrom || new Date().toISOString().slice(0, 10)
      }).eq("id", current.id)
      if (error) throw new Error(error.message || "Impossible de fermer l'ancienne rémunération.")
    }
    const { data, error } = await db.from("staff_compensations").insert({
      establishment_id: input.establishmentId, staff_type: input.staffType, staff_id: input.staffId,
      remuneration_type: input.remunerationType,
      monthly_salary: input.remunerationType === "fixed" ? Number(input.monthlySalary || 0) : 0,
      hourly_rate: input.remunerationType === "hourly" ? Number(input.hourlyRate || 0) : 0,
      effective_from: input.effectiveFrom || new Date().toISOString().slice(0, 10),
      active: true, notes: input.notes || null,
    }).select().single()
    if (error) throw new Error(error.message || "Impossible d'enregistrer la rémunération.")
    return data
  },

  async getPeriods(establishmentId: string) {
    const { data, error } = await db.from("payroll_periods").select("*")
      .eq("establishment_id", establishmentId).order("starts_on", { ascending: false })
    if (error) throw new Error(error.message || "Impossible de charger les périodes de paie.")
    return data ?? []
  },

  async generatePeriod(establishmentId: string, startsOn: string, endsOn: string) {
    const { data, error } = await db.rpc("generate_payroll_period", {
      p_establishment_id: establishmentId, p_starts_on: startsOn, p_ends_on: endsOn
    })
    if (error) throw new Error(error.message || "Impossible de générer l'état de salaire.")
    return data as string
  },
}