const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des congés du personnel
 */

export interface DemandeConge {
  id: string
  personnelId: string
  type: "paye" | "sans_solde" | "maladie" | "exceptionnel"
  dateDebut: string
  dateFin: string
  jours: number
  motif: string
  statut: "en_attente" | "valide" | "refuse" | "annule"
  dateDemande: string
  dateValidation?: string
  validePar?: string
  commentaires?: string
}

class ServiceConges {
  private readonly CLE_STOCKAGE = "conges_personnel"

  /**
   * Récupère toutes les demandes de congé
   */
  obtenirToutesLesDemandes(): DemandeConge[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les demandes de congé
   */
  private sauvegarderDemandes(demandes: DemandeConge[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(demandes))
  }

  /**
   * Récupère les demandes d'un membre du personnel
   */
  obtenirDemandesParPersonnel(personnelId: string): DemandeConge[] {
    const demandes = this.obtenirToutesLesDemandes()
    return demandes.filter(d => d.personnelId === personnelId)
  }

  /**
   * Récupère les demandes par statut
   */
  obtenirDemandesParStatut(statut: "en_attente" | "valide" | "refuse" | "annule"): DemandeConge[] {
    const demandes = this.obtenirToutesLesDemandes()
    return demandes.filter(d => d.statut === statut)
  }

  /**
   * Crée une nouvelle demande de congé
   */
  creerDemande(demande: Omit<DemandeConge, "id" | "dateDemande" | "statut">): DemandeConge {
    const demandes = this.obtenirToutesLesDemandes()
    const nouvelleDemande: DemandeConge = {
      ...demande,
      id: `conge-${Date.now()}`,
      dateDemande: new Date().toISOString(),
      statut: "en_attente"
    }
    
    demandes.push(nouvelleDemande)
    this.sauvegarderDemandes(demandes)
    return nouvelleDemande
  }

  /**
   * Valide une demande de congé
   */
  validerDemande(id: string, validePar: string, commentaires?: string): boolean {
    const demandes = this.obtenirToutesLesDemandes()
    const index = demandes.findIndex(d => d.id === id)
    if (index === -1) return false
    
    demandes[index].statut = "valide"
    demandes[index].dateValidation = new Date().toISOString()
    demandes[index].validePar = validePar
    demandes[index].commentaires = commentaires
    
    this.sauvegarderDemandes(demandes)
    return true
  }

  /**
   * Refuse une demande de congé
   */
  refuserDemande(id: string, validePar: string, commentaires?: string): boolean {
    const demandes = this.obtenirToutesLesDemandes()
    const index = demandes.findIndex(d => d.id === id)
    if (index === -1) return false
    
    demandes[index].statut = "refuse"
    demandes[index].dateValidation = new Date().toISOString()
    demandes[index].validePar = validePar
    demandes[index].commentaires = commentaires
    
    this.sauvegarderDemandes(demandes)
    return true
  }

  /**
   * Annule une demande de congé
   */
  annulerDemande(id: string): boolean {
    const demandes = this.obtenirToutesLesDemandes()
    const index = demandes.findIndex(d => d.id === id)
    if (index === -1) return false
    
    demandes[index].statut = "annule"
    this.sauvegarderDemandes(demandes)
    return true
  }

  /**
   * Calcule le nombre de jours de congé entre deux dates
   */
  calculerJours(dateDebut: string, dateFin: string): number {
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    const diffTime = Math.abs(fin.getTime() - debut.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Inclure le jour de début
  }

  /**
   * Vérifie les chevauchements de congé
   */
  verifierChevauchement(personnelId: string, dateDebut: string, dateFin: string): boolean {
    const demandes = this.obtenirDemandesParPersonnel(personnelId)
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    return demandes.some(d => {
      if (d.statut !== "valide") return false
      const dDebut = new Date(d.dateDebut)
      const dFin = new Date(d.dateFin)
      return (debut <= dFin && fin >= dDebut)
    })
  }

  /**
   * Calcule le solde de congé d'un membre du personnel
   */
  calculerSoldeConge(personnelId: string, annee: number): number {
    const demandes = this.obtenirDemandesParPersonnel(personnelId)
    const demandesAnnee = demandes.filter(d => {
      const date = new Date(d.dateDebut)
      return date.getFullYear() === annee && d.statut === "valide" && d.type === "paye"
    })
    
    const joursUtilises = demandesAnnee.reduce((total, d) => total + d.jours, 0)
    const soldeInitial = 30 // 30 jours de congé payé par an
    return soldeInitial - joursUtilises
  }

  /**
   * Récupère les statistiques de congé
   */
  obtenirStatistiques() {
    const demandes = this.obtenirToutesLesDemandes()
    const enAttente = demandes.filter(d => d.statut === "en_attente").length
    const validees = demandes.filter(d => d.statut === "valide").length
    const refusees = demandes.filter(d => d.statut === "refuse").length
    const annulees = demandes.filter(d => d.statut === "annule").length
    
    return {
      total: demandes.length,
      enAttente,
      validees,
      refusees,
      annulees
    }
  }
}

export const serviceConges = new ServiceConges()
