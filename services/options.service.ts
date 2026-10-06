import { supabaseBrowser } from "@/lib/supabase/client"

export interface OptionScolaire {
  id: string
  establishmentId: string
  nom: string
  type: "cantine" | "transport" | "tenue" | "assurance" | "activite_parascolaire" | "cooperative" | "autre"
  prix: number
  description?: string
  obligatoire: boolean
  actif: boolean
}

export type OptionScolaireInput = Omit<OptionScolaire, "id" | "establishmentId">

function mapRow(row: any): OptionScolaire {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    nom: row.name,
    type: row.option_type || "autre",
    prix: Number(row.default_amount || 0),
    description: row.description || "",
    obligatoire: Boolean(row.required),
    actif: Boolean(row.active),
  }
}

class ServiceOptions {
  async obtenirToutesLesOptions(establishmentId: string): Promise<OptionScolaire[]> {
    const { data, error } = await supabaseBrowser
      .from("student_options")
      .select("id,establishment_id,name,code,description,default_amount,active,option_type,required")
      .eq("establishment_id", establishmentId)
      .order("name", { ascending: true })

    if (error) throw error
    return (data || []).map(mapRow)
  }

  async obtenirOptionsParType(establishmentId: string, type: OptionScolaire["type"]): Promise<OptionScolaire[]> {
    const options = await this.obtenirToutesLesOptions(establishmentId)
    return options.filter((option) => option.type === type && option.actif)
  }

  async creerOption(establishmentId: string, option: OptionScolaireInput): Promise<OptionScolaire> {
    const { data, error } = await supabaseBrowser
      .from("student_options")
      .insert({
        establishment_id: establishmentId,
        name: option.nom.trim(),
        description: option.description?.trim() || null,
        default_amount: option.prix,
        active: option.actif,
        option_type: option.type,
        required: option.obligatoire,
      })
      .select("id,establishment_id,name,description,default_amount,active,option_type,required")
      .single()

    if (error) throw error
    return mapRow(data)
  }

  async mettreAJourOption(
    establishmentId: string,
    id: string,
    donneesModifiees: Partial<OptionScolaireInput>
  ): Promise<OptionScolaire> {
    const payload: Record<string, unknown> = {}
    if (donneesModifiees.nom !== undefined) payload.name = donneesModifiees.nom.trim()
    if (donneesModifiees.description !== undefined) payload.description = donneesModifiees.description?.trim() || null
    if (donneesModifiees.prix !== undefined) payload.default_amount = donneesModifiees.prix
    if (donneesModifiees.actif !== undefined) payload.active = donneesModifiees.actif
    if (donneesModifiees.type !== undefined) payload.option_type = donneesModifiees.type
    if (donneesModifiees.obligatoire !== undefined) payload.required = donneesModifiees.obligatoire

    const { data, error } = await supabaseBrowser
      .from("student_options")
      .update(payload)
      .eq("id", id)
      .eq("establishment_id", establishmentId)
      .select("id,establishment_id,name,description,default_amount,active,option_type,required")
      .single()

    if (error) throw error
    return mapRow(data)
  }

  async supprimerOption(establishmentId: string, id: string): Promise<void> {
    const { error } = await supabaseBrowser
      .from("student_options")
      .delete()
      .eq("id", id)
      .eq("establishment_id", establishmentId)

    if (error) throw error
  }
}

export const serviceOptions = new ServiceOptions()
