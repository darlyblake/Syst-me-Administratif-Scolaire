import type { Matiere } from "../types/models"
import {
  obtenirMatieresSupabase,
  creerMatiereSupabase,
  modifierMatiereSupabase,
  archiverMatiereSupabase,
  type SubjectRecord,
} from "./matieres.supabase.service"

/** Service unifié de gestion des matières. Supabase est la source de vérité. */
class ServiceMatieres {
  async obtenirToutesLesMatieres(etablissementId: string): Promise<Matiere[]> {
    return obtenirMatieresSupabase(etablissementId)
  }

  async obtenirMatieresParNiveau(etablissementId: string, niveauId: string): Promise<Matiere[]> {
    const matieres = await obtenirMatieresSupabase(etablissementId)
    return matieres.filter((matiere) => matiere.niveau.includes(niveauId))
  }

  async ajouterMatiere(etablissementId: string, donnees: Omit<SubjectRecord, "id" | "active" | "establishment_id">): Promise<Matiere> {
    return creerMatiereSupabase(donnees, etablissementId)
  }

  async modifierMatiere(id: string, donnees: Partial<Omit<SubjectRecord, "id" | "establishment_id">>): Promise<Matiere> {
    return modifierMatiereSupabase(id, donnees)
  }

  async supprimerMatiere(id: string): Promise<boolean> {
    await archiverMatiereSupabase(id)
    return true
  }
}

export const serviceMatieres = new ServiceMatieres()
