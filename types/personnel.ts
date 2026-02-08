/**
 * Types pour la gestion du personnel administratif et technique
 */

// Types de contrat
export type TypeContrat = "cdi" | "cdd" | "vacataire" | "consultant"

// Types de rémunération
export type ModeRemuneration = "fixe" | "horaire"

// Statuts du personnel
export type StatutPersonnel = "actif" | "inactif" | "suspendu" | "conge"

// Données principales du personnel
export interface DonneesPersonnel {
  id: string
  nom: string
  prenom: string
  poste: string
  typeContrat: TypeContrat
  modeRemuneration: ModeRemuneration
  salaireFixe?: number // Pour le mode fixe
  tauxHoraire?: number // Pour le mode horaire
  heuresPrevues?: number // Nombre d'heures prévues par mois pour les horaires
  telephone: string
  statut: StatutPersonnel
  dateEmbauche: string
  dateCreation: string
  dateModification: string
}

// Filtres pour la recherche du personnel
export interface FiltresPersonnel {
  recherche: string
  poste: string
  statut: StatutPersonnel | ""
}

// Statistiques du personnel
export interface StatistiquesPersonnel {
  totalPersonnel: number
  parStatut: Record<StatutPersonnel, number>
  parTypeContrat: Record<TypeContrat, number>
  masseSalarialeTotale: number
}
