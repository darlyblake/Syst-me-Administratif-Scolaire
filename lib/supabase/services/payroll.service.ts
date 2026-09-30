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
}
