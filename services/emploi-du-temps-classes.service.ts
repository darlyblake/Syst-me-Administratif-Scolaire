const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des emplois du temps des classes
 * Permet d'attribuer des créneaux horaires, des classes et des enseignants
 */

export interface CreneauEmploiDuTemps {
  id: string
  classeId: string
  classeNom: string
  enseignantId: string
  enseignantNom: string
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"
  heureDebut: string
  heureFin: string
  matiere: string
  salle: string
  dateCreation: string
  dateModification: string
}

export interface EmploiDuTempsClasse {
  classeId: string
  classeNom: string
  creneaux: CreneauEmploiDuTemps[]
}

class ServiceEmploiDuTempsClasses {
  private readonly CLE_STOCKAGE = "emploi_du_temps_classes"

  /**
   * Récupère tous les créneaux d'emploi du temps
   */
  obtenirTousLesCreneaux(): CreneauEmploiDuTemps[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Récupère les créneaux pour une classe spécifique
   */
  obtenirCreneauxParClasse(classeId: string): CreneauEmploiDuTemps[] {
    const creneaux = this.obtenirTousLesCreneaux()
    return creneaux.filter(c => c.classeId === classeId)
  }

  /**
   * Récupère les créneaux pour un enseignant spécifique
   */
  obtenirCreneauxParEnseignant(enseignantId: string): CreneauEmploiDuTemps[] {
    const creneaux = this.obtenirTousLesCreneaux()
    return creneaux.filter(c => c.enseignantId === enseignantId)
  }

  /**
   * Récupère les créneaux pour un enseignant à une date spécifique
   */
  obtenirCreneauxPourEnseignantEtDate(enseignantId: string, date: string): CreneauEmploiDuTemps[] {
    const creneaux = this.obtenirTousLesCreneaux()
    const dateObj = new Date(date)
    const jourSemaine = this.obtenirJourSemaine(dateObj)
    
    return creneaux.filter(c => 
      c.enseignantId === enseignantId && c.jour === jourSemaine
    )
  }

  /**
   * Vérifie si un enseignant a un créneau à une date et heure spécifique
   */
  verifierCreneauEnseignant(enseignantId: string, date: string, heure: string): CreneauEmploiDuTemps | null {
    const creneaux = this.obtenirCreneauxPourEnseignantEtDate(enseignantId, date)
    const heureMinutes = this.convertirHeureEnMinutes(heure)
    
    for (const creneau of creneaux) {
      const debutMinutes = this.convertirHeureEnMinutes(creneau.heureDebut)
      const finMinutes = this.convertirHeureEnMinutes(creneau.heureFin)
      
      if (heureMinutes >= debutMinutes && heureMinutes <= finMinutes) {
        return creneau
      }
    }
    
    return null
  }

  /**
   * Calcule le nombre total d'heures prévues pour un enseignant dans une période
   */
  calculerHeuresPrevuesEnseignant(enseignantId: string, debut: string, fin: string): number {
    const creneaux = this.obtenirCreneauxParEnseignant(enseignantId)
    const debutDate = new Date(debut)
    const finDate = new Date(fin)
    
    let totalHeures = 0
    
    // Parcourir chaque jour de la période
    for (let date = new Date(debutDate); date <= finDate; date.setDate(date.getDate() + 1)) {
      const jourSemaine = this.obtenirJourSemaine(date)
      
      // Trouver les créneaux pour ce jour
      const creneauxJour = creneaux.filter(c => c.jour === jourSemaine)
      
      // Calculer les heures pour ce jour
      creneauxJour.forEach(creneau => {
        const debutMinutes = this.convertirHeureEnMinutes(creneau.heureDebut)
        const finMinutes = this.convertirHeureEnMinutes(creneau.heureFin)
        totalHeures += (finMinutes - debutMinutes) / 60
      })
    }
    
    return Math.round(totalHeures * 10) / 10 // Arrondir à 1 décimale
  }

  /**
   * Ajoute un nouveau créneau d'emploi du temps
   */
  ajouterCreneau(creneau: Omit<CreneauEmploiDuTemps, "id" | "dateCreation" | "dateModification">): CreneauEmploiDuTemps {
    const creneaux = this.obtenirTousLesCreneaux()
    const nouveauCreneau: CreneauEmploiDuTemps = {
      ...creneau,
      id: `creneau-${Date.now()}`,
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    }
    
    creneaux.push(nouveauCreneau)
    this.sauvegarderCreneaux(creneaux)
    return nouveauCreneau
  }

  /**
   * Met à jour un créneau existant
   */
  mettreAJourCreneau(id: string, donnees: Partial<CreneauEmploiDuTemps>): boolean {
    const creneaux = this.obtenirTousLesCreneaux()
    const index = creneaux.findIndex(c => c.id === id)
    
    if (index === -1) return false
    
    creneaux[index] = {
      ...creneaux[index],
      ...donnees,
      dateModification: new Date().toISOString()
    }
    
    this.sauvegarderCreneaux(creneaux)
    return true
  }

  /**
   * Supprime un créneau
   */
  supprimerCreneau(id: string): boolean {
    const creneaux = this.obtenirTousLesCreneaux()
    const nouveauxCreneaux = creneaux.filter(c => c.id !== id)
    
    if (nouveauxCreneaux.length === creneaux.length) return false
    
    this.sauvegarderCreneaux(nouveauxCreneaux)
    return true
  }

  /**
   * Sauvegarde les créneaux dans le localStorage
   */
  private sauvegarderCreneaux(creneaux: CreneauEmploiDuTemps[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(creneaux))
  }

  /**
   * Convertit une date en jour de la semaine
   */
  private obtenirJourSemaine(date: Date): CreneauEmploiDuTemps["jour"] {
    const jours: CreneauEmploiDuTemps["jour"][] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
    const dayIndex = date.getDay()
    // Dimanche (0) est traité comme lundi pour les emplois du temps scolaires
    return jours[dayIndex === 0 ? 0 : dayIndex - 1] || "lundi"
  }

  /**
   * Convertit une heure HH:MM en minutes depuis minuit
   */
  private convertirHeureEnMinutes(heure: string): number {
    const [heures, minutes] = heure.split(':').map(Number)
    return heures * 60 + minutes
  }

  /**
   * Génère les statistiques des emplois du temps
   */
  genererStatistiques(): {
    totalCreneaux: number
    totalClasses: number
    totalEnseignants: number
    heuresTotales: number
  } {
    const creneaux = this.obtenirTousLesCreneaux()
    const classesUniques = new Set(creneaux.map(c => c.classeId))
    const enseignantsUniques = new Set(creneaux.map(c => c.enseignantId))
    
    let heuresTotales = 0
    creneaux.forEach(creneau => {
      const debutMinutes = this.convertirHeureEnMinutes(creneau.heureDebut)
      const finMinutes = this.convertirHeureEnMinutes(creneau.heureFin)
      heuresTotales += (finMinutes - debutMinutes) / 60
    })
    
    return {
      totalCreneaux: creneaux.length,
      totalClasses: classesUniques.size,
      totalEnseignants: enseignantsUniques.size,
      heuresTotales: Math.round(heuresTotales * 10) / 10
    }
  }
}

// Instance singleton du service
export const serviceEmploiDuTempsClasses = new ServiceEmploiDuTempsClasses()
