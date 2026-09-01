import { supabaseBrowser } from "@/lib/supabase/client"

export type PeriodeType = "trimester" | "palier" | "semester"

export interface PeriodeNotes {
  id: string
  establishment_id: string
  academic_year_id: string
  period_type: PeriodeType
  period_number: number
  label: string
  start_date: string
  end_date: string
  entry_open: boolean
}

export function typePeriodePourCycle(cycle: string | null | undefined): PeriodeType {
  const value = (cycle ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (value.includes("primaire") || value.includes("pre-primaire") || value.includes("preprimaire")) return "palier"
  if (value.includes("univers") || value.includes("profession") || value.includes("centre")) return "semester"
  return "trimester"
}

export async function obtenirPeriodesNotes(etablissementId: string, anneeId: string) {
  const { data, error } = await supabaseBrowser
    .from("academic_grade_periods")
    .select("id,establishment_id,academic_year_id,period_type,period_number,label,start_date,end_date,entry_open")
    .eq("establishment_id", etablissementId)
    .eq("academic_year_id", anneeId)
    .order("period_type")
    .order("period_number")
  if (error) throw new Error(`Impossible de charger les périodes de notes: ${error.message}`)
  return (data ?? []) as PeriodeNotes[]
}

export async function creerPeriodeNotes(input: Omit<PeriodeNotes, "id">) {
  if (input.end_date < input.start_date) throw new Error("La date de fin doit être postérieure à la date de début.")
  const { data, error } = await supabaseBrowser.from("academic_grade_periods").insert(input).select("*").single()
  if (error) throw new Error(`Impossible de créer la période: ${error.message}`)
  return data as PeriodeNotes
}

export async function modifierPeriodeNotes(id: string, changes: Partial<Pick<PeriodeNotes, "label" | "start_date" | "end_date" | "entry_open">>) {
  if (changes.start_date && changes.end_date && changes.end_date < changes.start_date) throw new Error("La date de fin doit être postérieure à la date de début.")
  const { data, error } = await supabaseBrowser.from("academic_grade_periods").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).select("*").single()
  if (error) throw new Error(`Impossible de modifier la période: ${error.message}`)
  return data as PeriodeNotes
}

export async function fermerPeriodeNotes(id: string) {
  return modifierPeriodeNotes(id, { entry_open: false })
}

export async function ouvrirPeriodeNotes(id: string) {
  return modifierPeriodeNotes(id, { entry_open: true })
}

export async function verifierPeriodeOuverte(periodId: string) {
  const { data, error } = await supabaseBrowser.from("academic_grade_periods").select("entry_open,start_date,end_date").eq("id", periodId).single()
  if (error || !data) throw new Error("Période de notes introuvable.")
  const today = new Date().toISOString().slice(0, 10)
  if (!data.entry_open || today < data.start_date || today > data.end_date) {
    throw new Error("La période de saisie des notes est fermée.")
  }
  return true
}
