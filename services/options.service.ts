const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des options scolaires
 */

export interface OptionScolaire {
  id: string
  nom: string
  type: "cantine" | "transport" | "tenue" | "assurance" | "activite_parascolaire" | "cooperative"
  prix: number
  description?: string
  obligatoire: boolean
  actif: boolean
}

export interface OptionEleve {
  id: string
  eleveId: string
  optionId: string
  dateInscription: string
  statut: "actif" | "inactif" | "annule"
}

class ServiceOptions {
  private readonly CLE_STOCKAGE_OPTIONS = "options_scolaires"
  private readonly CLE_STOCKAGE_INSCRIPTIONS = "inscriptions_options"

  /**
   * Récupère toutes les options
   */
  obtenirToutesLesOptions(): OptionScolaire[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_OPTIONS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les options
   */
  private sauvegarderOptions(options: OptionScolaire[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_OPTIONS, JSON.stringify(options))
  }

  /**
   * Récupère les options par type
   */
  obtenirOptionsParType(type: OptionScolaire["type"]): OptionScolaire[] {
    const options = this.obtenirToutesLesOptions()
    return options.filter(o => o.type === type && o.actif)
  }

  /**
   * Crée une nouvelle option
   */
  creerOption(option: Omit<OptionScolaire, "id">): OptionScolaire {
    const options = this.obtenirToutesLesOptions()
    const nouvelleOption: OptionScolaire = {
      ...option,
      id: `opt-${Date.now()}`
    }
    
    options.push(nouvelleOption)
    this.sauvegarderOptions(options)
    return nouvelleOption
  }

  /**
   * Met à jour une option
   */
  mettreAJourOption(id: string, donneesModifiees: Partial<OptionScolaire>): boolean {
    const options = this.obtenirToutesLesOptions()
    const index = options.findIndex(o => o.id === id)
    
    if (index === -1) return false
    
    options[index] = { ...options[index], ...donneesModifiees }
    this.sauvegarderOptions(options)
    return true
  }

  /**
   * Supprime une option
   */
  supprimerOption(id: string): boolean {
    const options = this.obtenirToutesLesOptions()
    const nouvellesOptions = options.filter(o => o.id !== id)
    
    if (nouvellesOptions.length === options.length) return false
    
    this.sauvegarderOptions(nouvellesOptions)
    return true
  }

  /**
   * Récupère les inscriptions aux options d'un élève
   */
  obtenirInscriptionsEleve(eleveId: string): OptionEleve[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_INSCRIPTIONS)
      const inscriptions: OptionEleve[] = donnees ? JSON.parse(donnees) : []
      return inscriptions.filter(i => i.eleveId === eleveId && i.statut === "actif")
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les inscriptions
   */
  private sauvegarderInscriptions(inscriptions: OptionEleve[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_INSCRIPTIONS, JSON.stringify(inscriptions))
  }

  /**
   * Inscrit un élève à une option
   */
  inscrireEleve(eleveId: string, optionId: string): OptionEleve {
    const inscriptions = this.obtenirToutesLesInscriptions()
    
    // Vérifier si déjà inscrit
    if (inscriptions.some(i => i.eleveId === eleveId && i.optionId === optionId && i.statut === "actif")) {
      throw new Error("L'élève est déjà inscrit à cette option")
    }
    
    const nouvelleInscription: OptionEleve = {
      id: `ins-opt-${Date.now()}`,
      eleveId,
      optionId,
      dateInscription: new Date().toISOString(),
      statut: "actif"
    }
    
    inscriptions.push(nouvelleInscription)
    this.sauvegarderInscriptions(inscriptions)
    return nouvelleInscription
  }

  /**
   * Désinscrit un élève d'une option
   */
  desinscrireEleve(eleveId: string, optionId: string): boolean {
    const inscriptions = this.obtenirToutesLesInscriptions()
    const index = inscriptions.findIndex(i => i.eleveId === eleveId && i.optionId === optionId && i.statut === "actif")
    
    if (index === -1) return false
    
    inscriptions[index].statut = "annule"
    this.sauvegarderInscriptions(inscriptions)
    return true
  }

  /**
   * Récupère toutes les inscriptions
   */
  obtenirToutesLesInscriptions(): OptionEleve[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_INSCRIPTIONS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Calcule le coût total des options d'un élève
   */
  calculerCoutTotalEleve(eleveId: string): number {
    const inscriptions = this.obtenirInscriptionsEleve(eleveId)
    const options = this.obtenirToutesLesOptions()
    
    return inscriptions.reduce((total, inscription) => {
      const option = options.find(o => o.id === inscription.optionId)
      return total + (option?.prix || 0)
    }, 0)
  }

  /**
   * Initialise les options par défaut
   */
  initialiserOptionsParDefaut(): void {
    const options = this.obtenirToutesLesOptions()
    
    if (options.length === 0) {
      const optionsParDefaut: Omit<OptionScolaire, "id">[] = [
        {
          nom: "Cantine - Repas complet",
          type: "cantine",
          prix: 50000,
          description: "Repas du midi du lundi au vendredi",
          obligatoire: false,
          actif: true
        },
        {
          nom: "Transport - Bus scolaire",
          type: "transport",
          prix: 75000,
          description: "Transport aller-retour quotidien",
          obligatoire: false,
          actif: true
        },
        {
          nom: "Tenue scolaire",
          type: "tenue",
          prix: 45000,
          description: "2 tenues complètes",
          obligatoire: true,
          actif: true
        },
        {
          nom: "Assurance scolaire",
          type: "assurance",
          prix: 10000,
          description: "Assurance accidents scolaires",
          obligatoire: true,
          actif: true
        },
        {
          nom: "Coopérative",
          type: "cooperative",
          prix: 5000,
          description: "Participation aux activités coopératives",
          obligatoire: true,
          actif: true
        },
        {
          nom: "Football",
          type: "activite_parascolaire",
          prix: 25000,
          description: "Entraînement 2 fois par semaine",
          obligatoire: false,
          actif: true
        },
        {
          nom: "Musique",
          type: "activite_parascolaire",
          prix: 30000,
          description: "Cours de musique 1 fois par semaine",
          obligatoire: false,
          actif: true
        }
      ]
      
      optionsParDefaut.forEach(option => this.creerOption(option))
    }
  }
}

export const serviceOptions = new ServiceOptions()
