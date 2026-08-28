const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion du pointage du personnel
 */

import { serviceEmploiDuTempsClasses } from "./emploi-du-temps-classes.service"

export interface Pointage {
  id: string
  personnelId: string
  date: string
  heureArrivee?: string
  heureDepart?: string
  statut: "present" | "absent" | "retard" | "conge"
  motifAbsence?: string
  valide: boolean
  conformeEmploiDuTemps?: boolean
  creneauId?: string
}

class ServicePointage {
  private readonly CLE_STOCKAGE = "pointage_personnel"

  /**
   * Récupère tous les pointages
   */
  obtenirTousLesPointages(): Pointage[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les pointages
   */
  private sauvegarderPointages(pointages: Pointage[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(pointages))
  }

  /**
   * Récupère les pointages d'une date
   */
  obtenirPointagesParDate(date: string): Pointage[] {
    const pointages = this.obtenirTousLesPointages()
    return pointages.filter(p => p.date === date)
  }

  /**
   * Récupère les pointages d'un membre du personnel
   */
  obtenirPointagesParPersonnel(personnelId: string): Pointage[] {
    const pointages = this.obtenirTousLesPointages()
    return pointages.filter(p => p.personnelId === personnelId)
  }

  /**
   * Récupère le pointage d'un membre du personnel pour une date
   */
  obtenirPointage(personnelId: string, date: string): Pointage | null {
    const pointages = this.obtenirTousLesPointages()
    return pointages.find(p => p.personnelId === personnelId && p.date === date) || null
  }

  /**
   * Enregistre l'arrivée d'un membre du personnel
   */
  enregistrerArrivee(personnelId: string, date: string): Pointage {
    const pointages = this.obtenirTousLesPointages()
    const pointageExistant = pointages.find(p => p.personnelId === personnelId && p.date === date)
    
    const heureActuelle = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    
    // Vérifier si l'enseignant a un créneau à cette heure
    const creneau = serviceEmploiDuTempsClasses.verifierCreneauEnseignant(personnelId, date, heureActuelle)
    
    if (pointageExistant) {
      pointageExistant.heureArrivee = heureActuelle
      pointageExistant.statut = "present"
      pointageExistant.conformeEmploiDuTemps = !!creneau
      pointageExistant.creneauId = creneau?.id
      this.sauvegarderPointages(pointages)
      return pointageExistant
    }
    
    const nouveauPointage: Pointage = {
      id: `ptg-${Date.now()}`,
      personnelId,
      date,
      heureArrivee: heureActuelle,
      statut: "present",
      valide: false,
      conformeEmploiDuTemps: !!creneau,
      creneauId: creneau?.id
    }
    
    pointages.push(nouveauPointage)
    this.sauvegarderPointages(pointages)
    return nouveauPointage
  }

  /**
   * Enregistre le départ d'un membre du personnel
   */
  enregistrerDepart(personnelId: string, date: string): Pointage | null {
    const pointages = this.obtenirTousLesPointages()
    const pointage = pointages.find(p => p.personnelId === personnelId && p.date === date)
    
    if (!pointage) return null
    
    pointage.heureDepart = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    this.sauvegarderPointages(pointages)
    return pointage
  }

  /**
   * Enregistre une absence
   */
  enregistrerAbsence(personnelId: string, date: string, motif?: string): Pointage {
    const pointages = this.obtenirTousLesPointages()
    const pointageExistant = pointages.find(p => p.personnelId === personnelId && p.date === date)
    
    if (pointageExistant) {
      pointageExistant.statut = "absent"
      pointageExistant.motifAbsence = motif
      this.sauvegarderPointages(pointages)
      return pointageExistant
    }
    
    const nouveauPointage: Pointage = {
      id: `ptg-${Date.now()}`,
      personnelId,
      date,
      statut: "absent",
      motifAbsence: motif,
      valide: false
    }
    
    pointages.push(nouveauPointage)
    this.sauvegarderPointages(pointages)
    return nouveauPointage
  }

  /**
   * Valide un pointage
   */
  validerPointage(id: string): boolean {
    const pointages = this.obtenirTousLesPointages()
    const index = pointages.findIndex(p => p.id === id)
    if (index === -1) return false
    
    pointages[index].valide = true
    this.sauvegarderPointages(pointages)
    return true
  }

  /**
   * Calcule le taux de présence d'un membre du personnel sur une période
   */
  calculerTauxPresence(personnelId: string, dateDebut: string, dateFin: string): number {
    const pointages = this.obtenirPointagesParPersonnel(personnelId)
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    const pointagesPeriode = pointages.filter(p => {
      const date = new Date(p.date)
      return date >= debut && date <= fin
    })
    
    if (pointagesPeriode.length === 0) return 0
    
    const presents = pointagesPeriode.filter(p => p.statut === "present" || p.statut === "retard").length
    return (presents / pointagesPeriode.length) * 100
  }

  /**
   * Calcule le nombre d'heures travaillées pour une période
   */
  calculerHeuresTravaillees(personnelId: string, dateDebut: string, dateFin: string): number {
    const pointages = this.obtenirPointagesParPersonnel(personnelId)
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    let totalHeures = 0
    
    pointages.filter(p => {
      const date = new Date(p.date)
      return date >= debut && date <= fin && p.heureArrivee && p.heureDepart
    }).forEach(p => {
      if (p.heureArrivee && p.heureDepart) {
        const [hArr, mArr] = p.heureArrivee.split(':').map(Number)
        const [hDep, mDep] = p.heureDepart.split(':').map(Number)
        const minutes = (hDep * 60 + mDep) - (hArr * 60 + mArr)
        totalHeures += minutes / 60
      }
    })
    
    return totalHeures
  }

  /**
   * Calcule le nombre d'heures conformes à l'emploi du temps pour une période
   */
  calculerHeuresConformes(personnelId: string, dateDebut: string, dateFin: string): number {
    const pointages = this.obtenirPointagesParPersonnel(personnelId)
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    let totalHeures = 0
    
    pointages.filter(p => {
      const date = new Date(p.date)
      return date >= debut && date <= fin && p.heureArrivee && p.heureDepart && p.conformeEmploiDuTemps
    }).forEach(p => {
      if (p.heureArrivee && p.heureDepart) {
        const [hArr, mArr] = p.heureArrivee.split(':').map(Number)
        const [hDep, mDep] = p.heureDepart.split(':').map(Number)
        const minutes = (hDep * 60 + mDep) - (hArr * 60 + mArr)
        totalHeures += minutes / 60
      }
    })
    
    return totalHeures
  }

  /**
   * Calcule le nombre d'heures non conformes à l'emploi du temps pour une période
   */
  calculerHeuresNonConformes(personnelId: string, dateDebut: string, dateFin: string): number {
    const pointages = this.obtenirPointagesParPersonnel(personnelId)
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    let totalHeures = 0
    
    pointages.filter(p => {
      const date = new Date(p.date)
      return date >= debut && date <= fin && p.heureArrivee && p.heureDepart && !p.conformeEmploiDuTemps
    }).forEach(p => {
      if (p.heureArrivee && p.heureDepart) {
        const [hArr, mArr] = p.heureArrivee.split(':').map(Number)
        const [hDep, mDep] = p.heureDepart.split(':').map(Number)
        const minutes = (hDep * 60 + mDep) - (hArr * 60 + mArr)
        totalHeures += minutes / 60
      }
    })
    
    return totalHeures
  }

  /**
   * Compare les heures travaillées avec les heures prévues dans l'emploi du temps
   */
  comparerHeuresAvecEmploiDuTemps(personnelId: string, dateDebut: string, dateFin: string): {
    heuresTravaillees: number
    heuresPrevues: number
    heuresConformes: number
    heuresNonConformes: number
    tauxConformite: number
  } {
    const heuresTravaillees = this.calculerHeuresTravaillees(personnelId, dateDebut, dateFin)
    const heuresPrevues = serviceEmploiDuTempsClasses.calculerHeuresPrevuesEnseignant(personnelId, dateDebut, dateFin)
    const heuresConformes = this.calculerHeuresConformes(personnelId, dateDebut, dateFin)
    const heuresNonConformes = this.calculerHeuresNonConformes(personnelId, dateDebut, dateFin)
    
    const tauxConformite = heuresTravaillees > 0 ? (heuresConformes / heuresTravaillees) * 100 : 0
    
    return {
      heuresTravaillees: Math.round(heuresTravaillees * 10) / 10,
      heuresPrevues: Math.round(heuresPrevues * 10) / 10,
      heuresConformes: Math.round(heuresConformes * 10) / 10,
      heuresNonConformes: Math.round(heuresNonConformes * 10) / 10,
      tauxConformite: Math.round(tauxConformite * 10) / 10
    }
  }
}

export const servicePointage = new ServicePointage()
