/**
 * Service de gestion des paiements
 * Contient toute la logique métier liée aux paiements
 */

import type { Paiement } from "@/types/models"

class ServicePaiements {
  private readonly CLE_STOCKAGE_PAIEMENTS = "paiements"

  /**
   * Récupère tous les paiements
   */
  obtenirTousLesPaiements(): Paiement[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_PAIEMENTS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Ajoute un nouveau paiement
   */
  ajouterPaiement(paiement: Omit<Paiement, "id">): Paiement {
    const nouveauPaiement: Paiement = {
      ...paiement,
      id: this.genererIdUnique(),
      datePaiement: new Date().toISOString(),
    }

    const paiements = this.obtenirTousLesPaiements()
    paiements.push(nouveauPaiement)
    this.sauvegarderPaiements(paiements)

    return nouveauPaiement
  }

  /**
   * Récupère les paiements d'un élève spécifique
   */
  obtenirPaiementsEleve(eleveId: string): Paiement[] {
    return this.obtenirTousLesPaiements().filter((p) => p.eleveId === eleveId)
  }

  /**
   * Calcule le total payé par un élève
   */
  calculerTotalPayeEleve(eleveId: string): number {
    return this.obtenirPaiementsEleve(eleveId).reduce((total, paiement) => total + paiement.montant, 0)
  }

  /**
   * Calcule le total des recettes
   */
  calculerTotalRecettes(): number {
    return this.obtenirTousLesPaiements().reduce((total, paiement) => total + paiement.montant, 0)
  }

  private sauvegarderPaiements(paiements: Paiement[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_PAIEMENTS, JSON.stringify(paiements))
  }

  private genererIdUnique(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

// Instance singleton du service
export const servicePaiements = new ServicePaiements()
