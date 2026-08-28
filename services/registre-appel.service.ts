const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion du registre d'appel pour les élèves
 */

export interface AppelEleve {
  id: string
  eleveId: string
  classeId: string
  date: string
  statut: "present" | "absent" | "retard" | "excuse"
  motif?: string
  heureArrivee?: string
  heureDepart?: string
  note?: string
}

class ServiceRegistreAppel {
  private readonly CLE_STOCKAGE = "registre_appel"

  /**
   * Récupère tous les appels
   */
  obtenirTousLesAppels(): AppelEleve[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les appels
   */
  private sauvegarderAppels(appels: AppelEleve[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(appels))
  }

  /**
   * Récupère les appels d'un élève
   */
  obtenirAppelsEleve(eleveId: string): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    return appels.filter(a => a.eleveId === eleveId)
  }

  /**
   * Récupère les appels d'une classe
   */
  obtenirAppelsClasse(classeId: string): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    return appels.filter(a => a.classeId === classeId)
  }

  /**
   * Récupère les appels par date
   */
  obtenirAppelsParDate(date: string): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    return appels.filter(a => a.date === date)
  }

  /**
   * Récupère les appels par période
   */
  obtenirAppelsParPeriode(debut: string, fin: string): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    return appels.filter(a => {
      const date = new Date(a.date)
      return date >= new Date(debut) && date <= new Date(fin)
    })
  }

  /**
   * Récupère les appels par statut
   */
  obtenirAppelsParStatut(statut: AppelEleve["statut"]): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    return appels.filter(a => a.statut === statut)
  }

  /**
   * Crée un nouvel appel
   */
  creerAppel(appel: Omit<AppelEleve, "id">): AppelEleve {
    const appels = this.obtenirTousLesAppels()
    const nouvelAppel: AppelEleve = {
      ...appel,
      id: `appel-${Date.now()}`
    }
    
    appels.push(nouvelAppel)
    this.sauvegarderAppels(appels)
    return nouvelAppel
  }

  /**
   * Met à jour un appel
   */
  mettreAJourAppel(id: string, donneesModifiees: Partial<AppelEleve>): boolean {
    const appels = this.obtenirTousLesAppels()
    const index = appels.findIndex(a => a.id === id)
    
    if (index === -1) return false
    
    appels[index] = { ...appels[index], ...donneesModifiees }
    this.sauvegarderAppels(appels)
    return true
  }

  /**
   * Supprime un appel
   */
  supprimerAppel(id: string): boolean {
    const appels = this.obtenirTousLesAppels()
    const nouveauxAppels = appels.filter(a => a.id !== id)
    
    if (nouveauxAppels.length === appels.length) return false
    
    this.sauvegarderAppels(nouveauxAppels)
    return true
  }

  /**
   * Effectue l'appel pour une classe entière
   */
  effectuerAppelClasse(classeId: string, date: string, eleves: { eleveId: string; statut: AppelEleve["statut"]; motif?: string }[]): AppelEleve[] {
    const appels = this.obtenirTousLesAppels()
    const nouveauxAppels: AppelEleve[] = []
    
    eleves.forEach(eleve => {
      const nouvelAppel: AppelEleve = {
        id: `appel-${Date.now()}-${Math.random()}`,
        eleveId: eleve.eleveId,
        classeId,
        date,
        statut: eleve.statut,
        motif: eleve.motif
      }
      appels.push(nouvelAppel)
      nouveauxAppels.push(nouvelAppel)
    })
    
    this.sauvegarderAppels(appels)
    return nouveauxAppels
  }

  /**
   * Calcule le taux de présence d'un élève
   */
  calculerTauxPresence(eleveId: string): number {
    const appels = this.obtenirAppelsEleve(eleveId)
    if (appels.length === 0) return 0
    
    const presents = appels.filter(a => a.statut === "present").length
    return Math.round((presents / appels.length) * 100)
  }

  /**
   * Calcule le taux de présence d'une classe
   */
  calculerTauxPresenceClasse(classeId: string): number {
    const appels = this.obtenirAppelsClasse(classeId)
    if (appels.length === 0) return 0
    
    const presents = appels.filter(a => a.statut === "present").length
    return Math.round((presents / appels.length) * 100)
  }

  /**
   * Obtient les statistiques
   */
  obtenirStatistiques() {
    const appels = this.obtenirTousLesAppels()
    const total = appels.length
    const parStatut: Record<string, number> = {}
    
    appels.forEach(a => {
      parStatut[a.statut] = (parStatut[a.statut] || 0) + 1
    })
    
    return {
      total,
      parStatut
    }
  }
}

export const serviceRegistreAppel = new ServiceRegistreAppel()
