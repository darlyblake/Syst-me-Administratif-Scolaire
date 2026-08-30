const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion de la comptabilité
 * Contient toute la logique métier liée à la comptabilité
 */

export interface CompteComptable {
  id: string
  numero: string
  nom: string
  type: "actif" | "passif" | "charge" | "produit"
  categorie: string
  parentId?: string
  solde: number
  dateCreation: string
}

export interface MouvementComptable {
  id: string
  compteId: string
  type: "debit" | "credit"
  montant: number
  date: string
  description: string
  reference?: string
}

export interface PlanComptable {
  comptes: CompteComptable[]
  mouvements: MouvementComptable[]
}

class ServiceComptabilite {
  private readonly CLE_STOCKAGE = "comptabilite"

  /**
   * Récupère toutes les données comptables
   */
  obtenirDonnees(): PlanComptable {
    try {
      if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
        return this.obtenirPlanComptableParDefaut()
      }

      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      if (donnees) {
        const planCharge = JSON.parse(donnees) as PlanComptable
        const planNormalise = this.normaliserPlanComptable(planCharge)

        if (JSON.stringify(planCharge) !== JSON.stringify(planNormalise)) {
          this.sauvegarderDonnees(planNormalise)
        }

        return planNormalise
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données comptables:", error)
    }
    
    // Données par défaut avec plan comptable de base
    return this.obtenirPlanComptableParDefaut()
  }

  /**
   * Sauvegarde les données comptables
   */
  sauvegarderDonnees(donnees: PlanComptable): void {
    try {
      if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
        return
      }

      const donneesNormalisees = this.normaliserPlanComptable(donnees)
      safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(donneesNormalisees))
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des données comptables:", error)
    }
  }

  /**
   * Normalise le plan comptable pour l'adapter au contexte scolaire
   */
  private normaliserPlanComptable(donnees: PlanComptable): PlanComptable {
    const comptes = (donnees.comptes || [])
      .filter(compte => compte.nom !== "Stocks")
      .map(compte => {
        let nom = compte.nom

        if (nom === "Produits") {
          nom = "Recettes scolaires"
        }

        if (nom === "Options supplémentaires") {
          nom = "Options pédagogiques"
        }

        return {
          ...compte,
          nom,
          solde: typeof compte.solde === "number" ? compte.solde : 0,
        }
      })

    return {
      ...donnees,
      comptes,
      mouvements: Array.isArray(donnees.mouvements) ? donnees.mouvements : [],
    }
  }

  /**
   * Obtient le plan comptable par défaut
   */
  private obtenirPlanComptableParDefaut(): PlanComptable {
    const maintenant = new Date().toISOString()
    
    return {
      comptes: [
        // Comptes d'actif
        {
          id: "actif-1",
          numero: "1",
          nom: "Actif",
          type: "actif",
          categorie: "Classe 1",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "actif-11",
          numero: "11",
          nom: "Immobilisations",
          type: "actif",
          categorie: "Classe 1",
          parentId: "actif-1",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "actif-13",
          numero: "13",
          nom: "Créances",
          type: "actif",
          categorie: "Classe 1",
          parentId: "actif-1",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "actif-14",
          numero: "14",
          nom: "Trésorerie",
          type: "actif",
          categorie: "Classe 1",
          parentId: "actif-1",
          solde: 0,
          dateCreation: maintenant
        },
        
        // Comptes de passif
        {
          id: "passif-2",
          numero: "2",
          nom: "Passif",
          type: "passif",
          categorie: "Classe 2",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "passif-21",
          numero: "21",
          nom: "Capital",
          type: "passif",
          categorie: "Classe 2",
          parentId: "passif-2",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "passif-22",
          numero: "22",
          nom: "Dettes",
          type: "passif",
          categorie: "Classe 2",
          parentId: "passif-2",
          solde: 0,
          dateCreation: maintenant
        },
        
        // Comptes de charges
        {
          id: "charge-6",
          numero: "6",
          nom: "Charges",
          type: "charge",
          categorie: "Classe 6",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "charge-61",
          numero: "61",
          nom: "Charges de personnel",
          type: "charge",
          categorie: "Classe 6",
          parentId: "charge-6",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "charge-62",
          numero: "62",
          nom: "Charges d'exploitation",
          type: "charge",
          categorie: "Classe 6",
          parentId: "charge-6",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "charge-63",
          numero: "63",
          nom: "Charges financières",
          type: "charge",
          categorie: "Classe 6",
          parentId: "charge-6",
          solde: 0,
          dateCreation: maintenant
        },
        
        // Comptes de produits
        {
          id: "produit-7",
          numero: "7",
          nom: "Recettes scolaires",
          type: "produit",
          categorie: "Classe 7",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "produit-70",
          numero: "70",
          nom: "Frais d'inscription",
          type: "produit",
          categorie: "Classe 7",
          parentId: "produit-7",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "produit-71",
          numero: "71",
          nom: "Frais de scolarité",
          type: "produit",
          categorie: "Classe 7",
          parentId: "produit-7",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "produit-72",
          numero: "72",
          nom: "Options pédagogiques",
          type: "produit",
          categorie: "Classe 7",
          parentId: "produit-7",
          solde: 0,
          dateCreation: maintenant
        },
        {
          id: "produit-73",
          numero: "73",
          nom: "Autres recettes",
          type: "produit",
          categorie: "Classe 7",
          parentId: "produit-7",
          solde: 0,
          dateCreation: maintenant
        },
      ],
      mouvements: []
    }
  }

  /**
   * Récupère tous les comptes
   */
  obtenirTousLesComptes(): CompteComptable[] {
    const donnees = this.obtenirDonnees()
    return donnees.comptes
  }

  /**
   * Récupère les comptes par type
   */
  obtenirComptesParType(type: "actif" | "passif" | "charge" | "produit"): CompteComptable[] {
    const comptes = this.obtenirTousLesComptes()
    return comptes.filter(c => c.type === type)
  }

  /**
   * Récupère les comptes racines (sans parent)
   */
  obtenirComptesRacines(): CompteComptable[] {
    const comptes = this.obtenirTousLesComptes()
    return comptes.filter(c => !c.parentId)
  }

  /**
   * Récupère les sous-comptes d'un compte
   */
  obtenirSousComptes(parentId: string): CompteComptable[] {
    const comptes = this.obtenirTousLesComptes()
    return comptes.filter(c => c.parentId === parentId)
  }

  /**
   * Ajoute un nouveau compte
   */
  ajouterCompte(compte: Omit<CompteComptable, "id" | "dateCreation">): CompteComptable {
    const donnees = this.obtenirDonnees()
    const nouveauCompte: CompteComptable = {
      ...compte,
      id: `compte-${Date.now()}`,
      dateCreation: new Date().toISOString()
    }
    
    donnees.comptes.push(nouveauCompte)
    this.sauvegarderDonnees(donnees)
    
    return nouveauCompte
  }

  /**
   * Modifie un compte existant
   */
  modifierCompte(id: string, compteModifie: Partial<CompteComptable>): boolean {
    const donnees = this.obtenirDonnees()
    const index = donnees.comptes.findIndex(c => c.id === id)
    
    if (index === -1) return false
    
    donnees.comptes[index] = { ...donnees.comptes[index], ...compteModifie }
    this.sauvegarderDonnees(donnees)
    
    return true
  }

  /**
   * Supprime un compte
   */
  supprimerCompte(id: string): boolean {
    const donnees = this.obtenirDonnees()
    const compte = donnees.comptes.find(c => c.id === id)
    
    if (!compte) return false
    
    // Vérifier si le compte a des sous-comptes
    const aSousComptes = donnees.comptes.some(c => c.parentId === id)
    if (aSousComptes) return false
    
    // Vérifier si le compte a des mouvements
    const aMouvements = donnees.mouvements.some(m => m.compteId === id)
    if (aMouvements) return false
    
    donnees.comptes = donnees.comptes.filter(c => c.id !== id)
    this.sauvegarderDonnees(donnees)
    
    return true
  }

  /**
   * Enregistre un mouvement comptable
   */
  enregistrerMouvement(mouvement: Omit<MouvementComptable, "id" | "date">): MouvementComptable {
    const donnees = this.obtenirDonnees()
    const nouveauMouvement: MouvementComptable = {
      ...mouvement,
      id: `mvt-${Date.now()}`,
      date: new Date().toISOString()
    }
    
    donnees.mouvements.push(nouveauMouvement)
    
    // Mettre à jour le solde du compte
    const compte = donnees.comptes.find(c => c.id === mouvement.compteId)
    if (compte) {
      if (mouvement.type === "debit") {
        compte.solde += mouvement.montant
      } else {
        compte.solde -= mouvement.montant
      }
    }
    
    this.sauvegarderDonnees(donnees)
    
    return nouveauMouvement
  }

  /**
   * Récupère les mouvements d'un compte
   */
  obtenirMouvementsCompte(compteId: string): MouvementComptable[] {
    const donnees = this.obtenirDonnees()
    return donnees.mouvements.filter(m => m.compteId === compteId)
  }

  /**
   * Récupère tous les mouvements
   */
  obtenirTousLesMouvements(): MouvementComptable[] {
    const donnees = this.obtenirDonnees()
    return donnees.mouvements
  }

  /**
   * Calcule le solde total par type de compte
   */
  calculerSoldeParType(type: "actif" | "passif" | "charge" | "produit"): number {
    const comptes = this.obtenirComptesParType(type)
    return comptes.reduce((total, compte) => total + compte.solde, 0)
  }

  /**
   * Calcule le résultat net (Produits - Charges)
   */
  calculerResultatNet(): number {
    const produits = this.calculerSoldeParType("produit")
    const charges = this.calculerSoldeParType("charge")
    return produits - charges
  }
}

export const serviceComptabilite = new ServiceComptabilite()
