const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des heures de travail pour les vacataires
 */

import { serviceComptabiliteCentralisee } from "./comptabilite-centralisee.service"
import { serviceComptabiliteFacade } from "./comptabilite-facade.service"
import { servicePersonnel } from "./personnel.service"

export interface HeureVacataire {
  id: string
  vacataireId: string
  date: string
  heuresTravaillees: number
  tauxHoraire: number
  montant: number
  motif?: string
  classe?: string
  matiere?: string
  statut: "en_attente" | "valide" | "paye"
  dateValidation?: string
  validePar?: string
}

class ServiceHeuresVacataires {
  private readonly CLE_STOCKAGE = "heures_vacataires"

  /**
   * Récupère toutes les heures de vacataires
   */
  obtenirToutesLesHeures(): HeureVacataire[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les heures
   */
  private sauvegarderHeures(heures: HeureVacataire[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(heures))
  }

  /**
   * Récupère les heures d'un vacataire
   */
  obtenirHeuresVacataire(vacataireId: string): HeureVacataire[] {
    const heures = this.obtenirToutesLesHeures()
    return heures.filter(h => h.vacataireId === vacataireId)
  }

  /**
   * Récupère les heures par période
   */
  obtenirHeuresParPeriode(debut: string, fin: string): HeureVacataire[] {
    const heures = this.obtenirToutesLesHeures()
    return heures.filter(h => {
      const date = new Date(h.date)
      return date >= new Date(debut) && date <= new Date(fin)
    })
  }

  /**
   * Récupère les heures par statut
   */
  obtenirHeuresParStatut(statut: HeureVacataire["statut"]): HeureVacataire[] {
    const heures = this.obtenirToutesLesHeures()
    return heures.filter(h => h.statut === statut)
  }

  /**
   * Crée une nouvelle heure de travail
   */
  creerHeure(heure: Omit<HeureVacataire, "id" | "montant">): HeureVacataire {
    const heures = this.obtenirToutesLesHeures()
    const nouvelleHeure: HeureVacataire = {
      ...heure,
      id: `heure-${Date.now()}`,
      montant: heure.heuresTravaillees * heure.tauxHoraire
    }
    
    heures.push(nouvelleHeure)
    this.sauvegarderHeures(heures)
    return nouvelleHeure
  }

  /**
   * Valide une heure de travail
   */
  validerHeure(id: string, validePar: string): boolean {
    const heures = this.obtenirToutesLesHeures()
    const index = heures.findIndex(h => h.id === id)
    
    if (index === -1) return false
    
    heures[index].statut = "valide"
    heures[index].dateValidation = new Date().toISOString()
    heures[index].validePar = validePar
    this.sauvegarderHeures(heures)
    return true
  }

  /**
   * Marque une heure comme payée et enregistre la transaction
   */
  marquerPaye(id: string): boolean {
    const heures = this.obtenirToutesLesHeures()
    const index = heures.findIndex(h => h.id === id)
    
    if (index === -1) return false
    
    const heure = heures[index]
    heure.statut = "paye"
    this.sauvegarderHeures(heures)
    
    // Enregistrer la transaction via le service centralisé
    const personnel = servicePersonnel.obtenirToutLePersonnel().find(p => p.id === heure.vacataireId)
    if (personnel) {
      serviceComptabiliteCentralisee.enregistrerVacataire(
        `${personnel.prenom} ${personnel.nom}`,
        heure.montant,
        heure.date,
        personnel.id
      )

      serviceComptabiliteFacade.enregistrerTransaction({
        type: "sortie",
        categorie: "Vacataires",
        description: `Heures vacataires ${personnel.prenom} ${personnel.nom}`,
        montant: heure.montant,
        date: heure.date,
        reference: `Vacataire #${heure.id}`,
        statut: "payee",
        source: "vacataire",
        contexte: {
          personnelId: personnel.id,
          personnelNom: `${personnel.prenom} ${personnel.nom}`,
        },
      })
    }
    
    return true
  }

  /**
   * Supprime une heure de travail
   */
  supprimerHeure(id: string): boolean {
    const heures = this.obtenirToutesLesHeures()
    const nouvellesHeures = heures.filter(h => h.id !== id)
    
    if (nouvellesHeures.length === heures.length) return false
    
    this.sauvegarderHeures(nouvellesHeures)
    return true
  }

  /**
   * Calcule le total des heures pour un vacataire
   */
  calculerTotalHeures(vacataireId: string): number {
    const heures = this.obtenirHeuresVacataire(vacataireId)
    return heures.reduce((sum, h) => sum + h.heuresTravaillees, 0)
  }

  /**
   * Calcule le total à payer pour un vacataire
   */
  calculerTotalAPayer(vacataireId: string): number {
    const heures = this.obtenirHeuresVacataire(vacataireId)
    return heures.reduce((sum, h) => sum + h.montant, 0)
  }

  /**
   * Calcule le total à payer pour une période
   */
  calculerTotalPeriode(debut: string, fin: string): number {
    const heures = this.obtenirHeuresParPeriode(debut, fin)
    return heures.reduce((sum, h) => sum + h.montant, 0)
  }

  /**
   * Obtient les statistiques
   */
  obtenirStatistiques() {
    const heures = this.obtenirToutesLesHeures()
    const total = heures.length
    const totalHeures = heures.reduce((sum, h) => sum + h.heuresTravaillees, 0)
    const totalMontant = heures.reduce((sum, h) => sum + h.montant, 0)
    const parStatut: Record<string, number> = {}
    
    heures.forEach(h => {
      parStatut[h.statut] = (parStatut[h.statut] || 0) + 1
    })
    
    return {
      total,
      totalHeures,
      totalMontant,
      parStatut
    }
  }
}

export const serviceHeuresVacataires = new ServiceHeuresVacataires()
