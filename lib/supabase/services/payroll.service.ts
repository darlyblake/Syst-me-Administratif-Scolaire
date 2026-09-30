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

  async getState(establishmentId: string, periodId: string) {
    const { data, error } = await db.from("v_payroll_state").select("*")
      .eq("establishment_id", establishmentId).eq("period_id", periodId)
      .order("last_name").order("first_name")
    if (error) throw new Error(error.message || "Impossible de charger l'état de salaire.")
    return (data ?? []).map((r: any) => ({
      ...r, base_amount: Number(r.base_amount || 0), hours_worked: Number(r.hours_worked || 0),
      hourly_rate: Number(r.hourly_rate || 0), net_amount: Number(r.net_amount || 0),
      advances: Number(r.advances || 0), amount_paid: Number(r.amount_paid || 0),
      arrears: Number(r.arrears || 0), remaining_amount: Number(r.remaining_amount || 0),
    }))
  },

  async getOutstandingEntries(establishmentId: string, staffType: string, staffId: string) {
    const { data, error } = await db.from("v_payroll_state")
      .select("id, period_id, period_name, starts_on, ends_on, net_amount, advances, amount_paid, remaining_amount")
      .eq("establishment_id", establishmentId).eq("staff_type", staffType).eq("staff_id", staffId)
      .gt("remaining_amount", 0).order("starts_on", { ascending: true })
    if (error) throw new Error(error.message || "Impossible de charger les arriérés de paie.")
    return data ?? []
  },

  async createAdvance(input: any) {
    const { data: user } = await supabaseBrowser.auth.getUser()
    const { data, error } = await db.from("payroll_advances").insert({
      establishment_id: input.establishmentId, staff_type: input.staffType, staff_id: input.staffId,
      target_period_id: input.targetPeriodId || null, amount: Number(input.amount),
      advance_date: input.advanceDate, payment_method: input.paymentMethod,
      reference: input.reference || null, notes: input.notes || null, created_by: user.user?.id || null,
    }).select().single()
    if (error) throw new Error(error.message || "Impossible d'enregistrer l'avance.")
    return data
  },

  async createPayment(input: any) {
    const { data, error } = await db.rpc("create_payroll_payment", {
      p_establishment_id: input.establishmentId, p_amount: Number(input.amount),
      p_payment_date: input.paymentDate, p_method: input.method,
      p_reference: input.reference || null, p_notes: input.notes || null,
      p_allocations: input.allocations,
    })
    if (error) throw new Error(error.message || "Impossible d'enregistrer le paiement du salaire.")
    return data
  },
}