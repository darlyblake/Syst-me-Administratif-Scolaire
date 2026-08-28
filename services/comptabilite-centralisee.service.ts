const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service centralisé de comptabilité
 * Capture automatiquement toutes les transactions financières de l'école
 */

import { serviceMouvements } from "./mouvements.service"

export type TypeTransaction = 
  | "inscription" 
  | "reinscription" 
  | "scolarite" 
  | "option" 
  | "salaire" 
  | "depense" 
  | "vacataire" 
  | "autre"

export interface TransactionFinanciere {
  type: TypeTransaction
  categorie: string
  description: string
  montant: number
  date: string
  reference?: string
  details?: {
    eleveId?: string
    eleveNom?: string
    personnelId?: string
    personnelNom?: string
    classe?: string
    mois?: string[]
    fournisseur?: string
    poste?: string
  }
}

class ServiceComptabiliteCentralisee {
  /**
   * Enregistre automatiquement une transaction financière
   * C'est le point d'entrée unique pour toutes les opérations financières
   */
  enregistrerTransaction(transaction: TransactionFinanciere): void {
    if (typeof window === 'undefined') return;
    
    const typeMouvement = this.determinerTypeMouvement(transaction.type)
    
    serviceMouvements.ajouterMouvement({
      type: typeMouvement,
      categorie: transaction.categorie,
      description: this.formaterDescription(transaction),
      montant: transaction.montant,
      date: transaction.date,
      reference: transaction.reference || this.genererReference(transaction),
      compteId: undefined
    })
  }

  /**
   * Détermine si c'est une entrée ou une sortie selon le type de transaction
   */
  private determinerTypeMouvement(type: TypeTransaction): "entree" | "sortie" {
    const typesEntree: TypeTransaction[] = ["inscription", "reinscription", "scolarite", "option"]
    return typesEntree.includes(type) ? "entree" : "sortie"
  }

  /**
   * Formate la description avec les détails disponibles
   */
  private formaterDescription(transaction: TransactionFinanciere): string {
    let description = transaction.description
    
    if (transaction.details) {
      const details = transaction.details
      if (details.eleveNom) {
        description += ` - ${details.eleveNom}`
      }
      if (details.personnelNom) {
        description += ` - ${details.personnelNom}`
      }
      if (details.classe) {
        description += ` (${details.classe})`
      }
      if (details.mois && details.mois.length > 0) {
        description += ` - ${details.mois.join(", ")}`
      }
      if (details.poste) {
        description += ` (${details.poste})`
      }
    }
    
    return description
  }

  /**
   * Génère une référence automatique
   */
  private genererReference(transaction: TransactionFinanciere): string {
    const prefix = this.getPrefixe(transaction.type)
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}-${timestamp}`
  }

  /**
   * Obtient le préfixe selon le type de transaction
   */
  private getPrefixe(type: TypeTransaction): string {
    const prefixes: Record<TypeTransaction, string> = {
      inscription: "INS",
      reinscription: "REINS",
      scolarite: "SCOL",
      option: "OPT",
      salaire: "SAL",
      depense: "DEP",
      vacataire: "VAC",
      autre: "AUT"
    }
    return prefixes[type]
  }

  /**
   * Enregistre une inscription
   */
  enregistrerInscription(eleveNom: string, classe: string, montant: number, date: string, eleveId?: string): void {
    this.enregistrerTransaction({
      type: "inscription",
      categorie: "Inscription",
      description: "Frais d'inscription",
      montant,
      date,
      details: {
        eleveId,
        eleveNom,
        classe
      }
    })
  }

  /**
   * Enregistre une réinscription
   */
  enregistrerReinscription(eleveNom: string, classe: string, montant: number, date: string, eleveId?: string): void {
    this.enregistrerTransaction({
      type: "reinscription",
      categorie: "Réinscription",
      description: "Frais de réinscription",
      montant,
      date,
      details: {
        eleveId,
        eleveNom,
        classe
      }
    })
  }

  /**
   * Enregistre un paiement de scolarité
   */
  enregistrerScolarite(eleveNom: string, classe: string, montant: number, date: string, mois?: string[], eleveId?: string): void {
    this.enregistrerTransaction({
      type: "scolarite",
      categorie: "Scolarité",
      description: mois?.length ? "Scolarité" : "Frais de scolarité",
      montant,
      date,
      details: {
        eleveId,
        eleveNom,
        classe,
        mois
      }
    })
  }

  /**
   * Enregistre un paiement d'option
   */
  enregistrerOption(eleveNom: string, optionNom: string, montant: number, date: string, eleveId?: string): void {
    this.enregistrerTransaction({
      type: "option",
      categorie: "Options",
      description: optionNom,
      montant,
      date,
      details: {
        eleveId,
        eleveNom
      }
    })
  }

  /**
   * Enregistre un paiement de salaire
   */
  enregistrerSalaire(personnelNom: string, poste: string, montant: number, date: string, personnelId?: string): void {
    this.enregistrerTransaction({
      type: "salaire",
      categorie: "Salaires",
      description: "Salaire",
      montant,
      date,
      details: {
        personnelId,
        personnelNom,
        poste
      }
    })
  }

  /**
   * Enregistre une dépense
   */
  enregistrerDepense(categorie: string, description: string, montant: number, date: string, fournisseur?: string): void {
    this.enregistrerTransaction({
      type: "depense",
      categorie,
      description,
      montant,
      date,
      details: {
        fournisseur
      }
    })
  }

  /**
   * Enregistre un paiement de vacataire
   */
  enregistrerVacataire(personnelNom: string, montant: number, date: string, personnelId?: string): void {
    this.enregistrerTransaction({
      type: "vacataire",
      categorie: "Vacataires",
      description: "Heures vacataires",
      montant,
      date,
      details: {
        personnelId,
        personnelNom
      }
    })
  }
}

export const serviceComptabiliteCentralisee = new ServiceComptabiliteCentralisee()
