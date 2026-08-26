const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des événements scolaires
 */

export interface Evenement {
  id: string
  titre: string
  description: string
  type: "reunion" | "examen" | "fete" | "conference" | "sport" | "autre"
  date: string
  heureDebut?: string
  heureFin?: string
  lieu?: string
  participants?: string[]
  classeId?: string
  statut: "planifie" | "en_cours" | "termine" | "annule"
  dateCreation: string
}

class ServiceEvenements {
  private readonly CLE_STOCKAGE = "evenements_scolaires"

  /**
   * Récupère tous les événements
   */
  obtenirTousLesEvenements(): Evenement[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les événements
   */
  private sauvegarderEvenements(evenements: Evenement[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(evenements))
  }

  /**
   * Récupère les événements par type
   */
  obtenirEvenementsParType(type: Evenement["type"]): Evenement[] {
    const evenements = this.obtenirTousLesEvenements()
    return evenements.filter(e => e.type === type)
  }

  /**
   * Récupère les événements par statut
   */
  obtenirEvenementsParStatut(statut: Evenement["statut"]): Evenement[] {
    const evenements = this.obtenirTousLesEvenements()
    return evenements.filter(e => e.statut === statut)
  }

  /**
   * Récupère les événements par classe
   */
  obtenirEvenementsParClasse(classeId: string): Evenement[] {
    const evenements = this.obtenirTousLesEvenements()
    return evenements.filter(e => e.classeId === classeId)
  }

  /**
   * Récupère les événements d'une période
   */
  obtenirEvenementsParPeriode(dateDebut: string, dateFin: string): Evenement[] {
    const evenements = this.obtenirTousLesEvenements()
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    return evenements.filter(e => {
      const date = new Date(e.date)
      return date >= debut && date <= fin
    })
  }

  /**
   * Récupère les événements à venir
   */
  obtenirEvenementsAVenir(): Evenement[] {
    const evenements = this.obtenirTousLesEvenements()
    const aujourdHui = new Date()
    aujourdHui.setHours(0, 0, 0, 0)
    
    return evenements
      .filter(e => {
        const date = new Date(e.date)
        return date >= aujourdHui && e.statut !== "annule"
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * Crée un nouvel événement
   */
  creerEvenement(evenement: Omit<Evenement, "id" | "dateCreation">): Evenement {
    const evenements = this.obtenirTousLesEvenements()
    const nouvelEvenement: Evenement = {
      ...evenement,
      id: `evt-${Date.now()}`,
      dateCreation: new Date().toISOString()
    }
    
    evenements.push(nouvelEvenement)
    this.sauvegarderEvenements(evenements)
    return nouvelEvenement
  }

  /**
   * Met à jour un événement
   */
  mettreAJourEvenement(id: string, donneesModifiees: Partial<Evenement>): boolean {
    const evenements = this.obtenirTousLesEvenements()
    const index = evenements.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    evenements[index] = { ...evenements[index], ...donneesModifiees }
    this.sauvegarderEvenements(evenements)
    return true
  }

  /**
   * Supprime un événement
   */
  supprimerEvenement(id: string): boolean {
    const evenements = this.obtenirTousLesEvenements()
    const nouveauxEvenements = evenements.filter(e => e.id !== id)
    
    if (nouveauxEvenements.length === evenements.length) return false
    
    this.sauvegarderEvenements(nouveauxEvenements)
    return true
  }

  /**
   * Met à jour le statut d'un événement
   */
  mettreAJourStatut(id: string, statut: Evenement["statut"]): boolean {
    return this.mettreAJourEvenement(id, { statut })
  }

  /**
   * Obtient les statistiques des événements
   */
  obtenirStatistiques() {
    const evenements = this.obtenirTousLesEvenements()
    const aVenir = evenements.filter(e => e.statut === "planifie").length
    const enCours = evenements.filter(e => e.statut === "en_cours").length
    const termines = evenements.filter(e => e.statut === "termine").length
    const annules = evenements.filter(e => e.statut === "annule").length
    
    return {
      total: evenements.length,
      aVenir,
      enCours,
      termines,
      annules
    }
  }
}

export const serviceEvenements = new ServiceEvenements()
