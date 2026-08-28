const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion de l'emploi du temps
 */

export interface Creneau {
  id: string
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"
  heureDebut: string
  heureFin: string
  matiere: string
  classeId: string
  enseignantId: string
  salle?: string
}

export interface EmploiDuTemps {
  id: string
  classeId: string
  nom: string
  creneaux: Creneau[]
  anneeScolaire: string
}

class ServiceEmploiDuTemps {
  private readonly CLE_STOCKAGE = "emploi_du_temps"

  /**
   * Récupère tous les emplois du temps
   */
  obtenirTousLesEmploisDuTemps(): EmploiDuTemps[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les emplois du temps
   */
  private sauvegarderEmploisDuTemps(emplois: EmploiDuTemps[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(emplois))
  }

  /**
   * Récupère l'emploi du temps d'une classe
   */
  obtenirEmploiDuTempsParClasse(classeId: string): EmploiDuTemps | null {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    return emplois.find(e => e.classeId === classeId) || null
  }

  /**
   * Récupère les créneaux d'un enseignant
   */
  obtenirCreneauxParEnseignant(enseignantId: string): Creneau[] {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const creneaux: Creneau[] = []
    
    emplois.forEach(emploi => {
      emploi.creneaux.forEach(creneau => {
        if (creneau.enseignantId === enseignantId) {
          creneaux.push(creneau)
        }
      })
    })
    
    return creneaux
  }

  /**
   * Crée un nouvel emploi du temps
   */
  creerEmploiDuTemps(emploi: Omit<EmploiDuTemps, "id">): EmploiDuTemps {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const nouvelEmploi: EmploiDuTemps = {
      ...emploi,
      id: `edt-${Date.now()}`
    }
    
    emplois.push(nouvelEmploi)
    this.sauvegarderEmploisDuTemps(emplois)
    return nouvelEmploi
  }

  /**
   * Met à jour un emploi du temps
   */
  mettreAJourEmploiDuTemps(id: string, donneesModifiees: Partial<EmploiDuTemps>): boolean {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const index = emplois.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    emplois[index] = { ...emplois[index], ...donneesModifiees }
    this.sauvegarderEmploisDuTemps(emplois)
    return true
  }

  /**
   * Supprime un emploi du temps
   */
  supprimerEmploiDuTemps(id: string): boolean {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const nouveauxEmplois = emplois.filter(e => e.id !== id)
    
    if (nouveauxEmplois.length === emplois.length) return false
    
    this.sauvegarderEmploisDuTemps(nouveauxEmplois)
    return true
  }

  /**
   * Ajoute un créneau à un emploi du temps
   */
  ajouterCreneau(emploiId: string, creneau: Omit<Creneau, "id">): Creneau | null {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const index = emplois.findIndex(e => e.id === emploiId)
    
    if (index === -1) return null
    
    const nouveauCreneau: Creneau = {
      ...creneau,
      id: `creneau-${Date.now()}`
    }
    
    emplois[index].creneaux.push(nouveauCreneau)
    this.sauvegarderEmploisDuTemps(emplois)
    return nouveauCreneau
  }

  /**
   * Supprime un créneau
   */
  supprimerCreneau(emploiId: string, creneauId: string): boolean {
    const emplois = this.obtenirTousLesEmploisDuTemps()
    const index = emplois.findIndex(e => e.id === emploiId)
    
    if (index === -1) return false
    
    const creneauxFiltres = emplois[index].creneaux.filter(c => c.id !== creneauId)
    
    if (creneauxFiltres.length === emplois[index].creneaux.length) return false
    
    emplois[index].creneaux = creneauxFiltres
    this.sauvegarderEmploisDuTemps(emplois)
    return true
  }

  /**
   * Vérifie les conflits de créneaux
   */
  verifierConflit(emploiId: string, jour: string, heureDebut: string, heureFin: string, enseignantId?: string): boolean {
    const emploi = this.obtenirTousLesEmploisDuTemps().find(e => e.id === emploiId)
    if (!emploi) return false
    
    return emploi.creneaux.some(c => {
      if (c.jour !== jour) return false
      
      // Vérifier le chevauchement horaire
      const debut1 = new Date(`2000-01-01T${heureDebut}`)
      const fin1 = new Date(`2000-01-01T${heureFin}`)
      const debut2 = new Date(`2000-01-01T${c.heureDebut}`)
      const fin2 = new Date(`2000-01-01T${c.heureFin}`)
      
      const chevauchement = debut1 < fin2 && fin1 > debut2
      
      if (!chevauchement) return false
      
      // Vérifier le conflit d'enseignant si spécifié
      if (enseignantId && c.enseignantId === enseignantId) return true
      
      // Vérifier le conflit de salle
      if (c.salle && emploi.creneaux.some(other => 
        other.salle === c.salle && 
        other.jour === jour && 
        debut1 < new Date(`2000-01-01T${other.heureFin}`) && 
        fin1 > new Date(`2000-01-01T${other.heureDebut}`)
      )) return true
      
      return false
    })
  }

  /**
   * Génère un emploi du temps par défaut pour une classe
   */
  genererEmploiDuTempsParDefaut(classeId: string, nomClasse: string): EmploiDuTemps {
    const jours: Array<"lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"> = 
      ["lundi", "mardi", "mercredi", "jeudi", "vendredi"]
    
    const creneaux: Creneau[] = []
    const horaires = [
      { debut: "08:00", fin: "09:00" },
      { debut: "09:00", fin: "10:00" },
      { debut: "10:15", fin: "11:15" },
      { debut: "11:15", fin: "12:15" },
      { debut: "14:00", fin: "15:00" },
      { debut: "15:00", fin: "16:00" }
    ]
    
    jours.forEach(jour => {
      horaires.forEach((horaire, index) => {
        creneaux.push({
          id: `creneau-${Date.now()}-${Math.random()}`,
          jour,
          heureDebut: horaire.debut,
          heureFin: horaire.fin,
          matiere: "À définir",
          classeId,
          enseignantId: "",
          salle: ""
        })
      })
    })
    
    return this.creerEmploiDuTemps({
      classeId,
      nom: `Emploi du temps - ${nomClasse}`,
      creneaux,
      anneeScolaire: new Date().getFullYear().toString()
    })
  }
}

export const serviceEmploiDuTemps = new ServiceEmploiDuTemps()
