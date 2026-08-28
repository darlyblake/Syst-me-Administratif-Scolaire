const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des dépenses
 * Contient toute la logique métier liée aux dépenses opérationnelles
 */

import { serviceComptabiliteCentralisee } from "./comptabilite-centralisee.service"
import { serviceComptabiliteFacade } from "./comptabilite-facade.service"

export interface CategorieDepense {
  id: string
  nom: string
  description: string
  budgetMensuel?: number
}

export interface Depense {
  id: string
  categorieId: string
  nom: string
  description: string
  montant: number
  date: string
  statut: "en_attente" | "validee" | "payee"
  facture?: string
  fournisseur?: string
  reference?: string
}

class ServiceDepenses {
  private readonly CLE_STOCKAGE_CATEGORIES = "categories_depenses"
  private readonly CLE_STOCKAGE_DEPENSES = "depenses"

  /**
   * Récupère toutes les catégories de dépenses
   */
  obtenirToutesLesCategories(): CategorieDepense[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_CATEGORIES)
      if (donnees) {
        return JSON.parse(donnees)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories:", error)
    }
    
    // Catégories par défaut
    return this.obtenirCategoriesParDefaut()
  }

  /**
   * Obtient les catégories par défaut
   */
  private obtenirCategoriesParDefaut(): CategorieDepense[] {
    return [
      {
        id: "cat-loyer",
        nom: "Loyer",
        description: "Paiement du loyer des locaux",
        budgetMensuel: 0
      },
      {
        id: "cat-elec",
        nom: "Électricité",
        description: "Factures d'électricité",
        budgetMensuel: 0
      },
      {
        id: "cat-eau",
        nom: "Eau",
        description: "Factures d'eau",
        budgetMensuel: 0
      },
      {
        id: "cat-internet",
        nom: "Internet",
        description: "Abonnement internet",
        budgetMensuel: 0
      },
      {
        id: "cat-fournitures",
        nom: "Fournitures",
        description: "Fournitures de bureau et scolaires",
        budgetMensuel: 0
      },
      {
        id: "cat-entretien",
        nom: "Entretien",
        description: "Entretien des locaux et équipements",
        budgetMensuel: 0
      },
      {
        id: "cat-securite",
        nom: "Sécurité",
        description: "Services de sécurité",
        budgetMensuel: 0
      },
      {
        id: "cat-nettoyage",
        nom: "Nettoyage",
        description: "Services de nettoyage",
        budgetMensuel: 0
      },
      {
        id: "cat-transport",
        nom: "Transport",
        description: "Frais de transport",
        budgetMensuel: 0
      },
      {
        id: "cat-divers",
        nom: "Divers",
        description: "Autres dépenses",
        budgetMensuel: 0
      }
    ]
  }

  /**
   * Sauvegarde les catégories
   */
  private sauvegarderCategories(categories: CategorieDepense[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_CATEGORIES, JSON.stringify(categories))
  }

  /**
   * Ajoute une catégorie de dépense
   */
  ajouterCategorie(categorie: Omit<CategorieDepense, "id">): CategorieDepense {
    const categories = this.obtenirToutesLesCategories()
    const nouvelleCategorie: CategorieDepense = {
      ...categorie,
      id: `cat-${Date.now()}`
    }
    categories.push(nouvelleCategorie)
    this.sauvegarderCategories(categories)
    return nouvelleCategorie
  }

  /**
   * Modifie une catégorie
   */
  modifierCategorie(id: string, categorieModifiee: Partial<CategorieDepense>): boolean {
    const categories = this.obtenirToutesLesCategories()
    const index = categories.findIndex(c => c.id === id)
    if (index === -1) return false
    
    categories[index] = { ...categories[index], ...categorieModifiee }
    this.sauvegarderCategories(categories)
    return true
  }

  /**
   * Supprime une catégorie
   */
  supprimerCategorie(id: string): boolean {
    const categories = this.obtenirToutesLesCategories()
    const nouvellesCategories = categories.filter(c => c.id !== id)
    if (nouvellesCategories.length === categories.length) return false
    
    this.sauvegarderCategories(nouvellesCategories)
    return true
  }

  /**
   * Récupère toutes les dépenses
   */
  obtenirToutesLesDepenses(): Depense[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_DEPENSES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les dépenses
   */
  private sauvegarderDepenses(depenses: Depense[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_DEPENSES, JSON.stringify(depenses))
  }

  /**
   * Ajoute une dépense
   */
  ajouterDepense(depense: Omit<Depense, "id">): Depense {
    const depenses = this.obtenirToutesLesDepenses()
    const nouvelleDepense: Depense = {
      ...depense,
      id: `dep-${Date.now()}`
    }
    depenses.push(nouvelleDepense)
    this.sauvegarderDepenses(depenses)
    return nouvelleDepense
  }

  /**
   * Modifie une dépense
   */
  modifierDepense(id: string, depenseModifiee: Partial<Depense>): boolean {
    const depenses = this.obtenirToutesLesDepenses()
    const index = depenses.findIndex(d => d.id === id)
    if (index === -1) return false
    
    depenses[index] = { ...depenses[index], ...depenseModifiee }
    this.sauvegarderDepenses(depenses)
    return true
  }

  /**
   * Supprime une dépense
   */
  supprimerDepense(id: string): boolean {
    const depenses = this.obtenirToutesLesDepenses()
    const nouvellesDepenses = depenses.filter(d => d.id !== id)
    if (nouvellesDepenses.length === depenses.length) return false
    
    this.sauvegarderDepenses(nouvellesDepenses)
    return true
  }

  /**
   * Valide une dépense
   */
  validerDepense(id: string): boolean {
    const depenses = this.obtenirToutesLesDepenses()
    const index = depenses.findIndex(d => d.id === id)
    if (index === -1) return false
    
    depenses[index].statut = "validee"
    this.sauvegarderDepenses(depenses)
    return true
  }

  /**
   * Marque une dépense comme payée et enregistre la transaction
   */
  marquerCommePayee(id: string): boolean {
    const depenses = this.obtenirToutesLesDepenses()
    const index = depenses.findIndex(d => d.id === id)
    if (index === -1) return false
    
    depenses[index].statut = "payee"
    this.sauvegarderDepenses(depenses)
    
    // Enregistrer la transaction via le service centralisé
    const depense = depenses[index]
    const categorie = this.obtenirToutesLesCategories().find(c => c.id === depense.categorieId)
    
    serviceComptabiliteCentralisee.enregistrerDepense(
      categorie?.nom || "Dépenses",
      depense.nom,
      depense.montant,
      depense.date,
      depense.fournisseur
    )

    serviceComptabiliteFacade.enregistrerTransaction({
      type: "sortie",
      categorie: categorie?.nom || "Dépenses",
      description: depense.nom,
      montant: depense.montant,
      date: depense.date,
      reference: `Depense #${depense.id}`,
      statut: "payee",
      source: "depense",
      contexte: {
        fournisseur: depense.fournisseur,
      },
    })
    
    return true
  }

  /**
   * Récupère les dépenses par catégorie
   */
  obtenirDepensesParCategorie(categorieId: string): Depense[] {
    const depenses = this.obtenirToutesLesDepenses()
    return depenses.filter(d => d.categorieId === categorieId)
  }

  /**
   * Récupère les dépenses par période
   */
  obtenirDepensesParPeriode(dateDebut: string, dateFin: string): Depense[] {
    const depenses = this.obtenirToutesLesDepenses()
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    return depenses.filter(d => {
      const date = new Date(d.date)
      return date >= debut && date <= fin
    })
  }

  /**
   * Calcule le total des dépenses par catégorie pour une période
   */
  calculerTotalParCategorie(categorieId: string, dateDebut: string, dateFin: string): number {
    const depenses = this.obtenirDepensesParPeriode(dateDebut, dateFin)
    return depenses
      .filter(d => d.categorieId === categorieId && d.statut === "payee")
      .reduce((total, d) => total + d.montant, 0)
  }

  /**
   * Calcule le total des dépenses pour une période
   */
  calculerTotalDepenses(dateDebut: string, dateFin: string): number {
    const depenses = this.obtenirDepensesParPeriode(dateDebut, dateFin)
    return depenses
      .filter(d => d.statut === "payee")
      .reduce((total, d) => total + d.montant, 0)
  }

  /**
   * Calcule le budget utilisé par catégorie pour un mois
   */
  calculerBudgetUtilise(categorieId: string, annee: number, mois: number): number {
    const debut = new Date(annee, mois - 1, 1).toISOString()
    const fin = new Date(annee, mois, 0).toISOString()
    return this.calculerTotalParCategorie(categorieId, debut, fin)
  }
}

export const serviceDepenses = new ServiceDepenses()
