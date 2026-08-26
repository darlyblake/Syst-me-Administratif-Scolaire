const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des paiements
 * Contient toute la logique métier liée aux paiements
 */

import type { Paiement } from "@/types/models"
import { serviceComptabiliteCentralisee } from "./comptabilite-centralisee.service"
import { serviceComptabiliteFacade } from "./comptabilite-facade.service"
import { serviceEleves } from "./eleves.service"

class ServicePaiements {
  private readonly CLE_STOCKAGE_PAIEMENTS = "paiements"

  /**
   * Récupère tous les paiements
   */
  obtenirTousLesPaiements(): Paiement[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_PAIEMENTS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Ajoute un nouveau paiement et enregistre automatiquement la transaction
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

    this.enregistrerTransactionCentralisee(nouveauPaiement)
    this.enregistrerTransactionFacade(nouveauPaiement)

    return nouveauPaiement
  }

  /**
   * Enregistre la transaction via le service centralisé de comptabilité
   */
  private enregistrerTransactionCentralisee(paiement: Paiement): void {
    const date = paiement.datePaiement.split('T')[0]
    
    const eleve = serviceEleves.obtenirEleveParId(paiement.eleveId)
    const eleveNom = eleve ? `${eleve.prenom} ${eleve.nom}` : "Élève inconnu"
    const classe = eleve?.classe || ""
    
    switch (paiement.typePaiement) {
      case "inscription":
        serviceComptabiliteCentralisee.enregistrerInscription(
          eleveNom,
          classe,
          paiement.montant,
          date,
          paiement.eleveId
        )
        break
      case "scolarite":
        serviceComptabiliteCentralisee.enregistrerScolarite(
          eleveNom,
          classe,
          paiement.montant,
          date,
          paiement.moisPaiement,
          paiement.eleveId
        )
        break
      case "autre":
        if (paiement.description) {
          serviceComptabiliteCentralisee.enregistrerOption(
            eleveNom,
            paiement.description,
            paiement.montant,
            date,
            paiement.eleveId
          )
        }
        break
      default:
        serviceComptabiliteCentralisee.enregistrerTransaction({
          type: "autre",
          categorie: paiement.typePaiement,
          description: paiement.description || paiement.typePaiement,
          montant: paiement.montant,
          date,
          reference: `Paiement #${paiement.id}`,
          details: {
            eleveId: paiement.eleveId,
            eleveNom
          }
        })
    }
  }

  private enregistrerTransactionFacade(paiement: Paiement): void {
    const date = paiement.datePaiement.split('T')[0]
    const eleve = serviceEleves.obtenirEleveParId(paiement.eleveId)

    serviceComptabiliteFacade.enregistrerTransaction({
      type: "entree",
      categorie: paiement.typePaiement,
      description: paiement.description || `Paiement ${paiement.typePaiement}`,
      montant: paiement.montant,
      date,
      reference: `Paiement #${paiement.id}`,
      statut: "valide",
      source: "paiement",
      contexte: {
        eleveId: paiement.eleveId,
        eleveNom: eleve ? `${eleve.prenom} ${eleve.nom}` : undefined,
        classe: eleve?.classe,
        mois: paiement.moisPaiement,
      },
    })
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
    safeLocalStorage.setItem(this.CLE_STOCKAGE_PAIEMENTS, JSON.stringify(paiements))
  }

  private genererIdUnique(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

// Instance singleton du service
export const servicePaiements = new ServicePaiements()
