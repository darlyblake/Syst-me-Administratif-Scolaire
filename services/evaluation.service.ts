const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion de l'évaluation du personnel
 */

export interface Evaluation {
  id: string
  personnelId: string
  type: "parent" | "administration"
  date: string
  note: number
  commentaire: string
  criteres: {
    pedagogie: number
    ponctualite: number
    communication: number
    discipline: number
  }
  evaluateur?: string
}

class ServiceEvaluation {
  private readonly CLE_STOCKAGE = "evaluations_personnel"

  /**
   * Récupère toutes les évaluations
   */
  obtenirToutesLesEvaluations(): Evaluation[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les évaluations
   */
  private sauvegarderEvaluations(evaluations: Evaluation[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(evaluations))
  }

  /**
   * Récupère les évaluations d'un membre du personnel
   */
  obtenirEvaluationsPersonnel(personnelId: string): Evaluation[] {
    const evaluations = this.obtenirToutesLesEvaluations()
    return evaluations.filter(e => e.personnelId === personnelId)
  }

  /**
   * Récupère les évaluations par type
   */
  obtenirEvaluationsParType(type: Evaluation["type"]): Evaluation[] {
    const evaluations = this.obtenirToutesLesEvaluations()
    return evaluations.filter(e => e.type === type)
  }

  /**
   * Crée une nouvelle évaluation
   */
  creerEvaluation(evaluation: Omit<Evaluation, "id">): Evaluation {
    const evaluations = this.obtenirToutesLesEvaluations()
    const nouvelleEvaluation: Evaluation = {
      ...evaluation,
      id: `eval-${Date.now()}`
    }
    
    evaluations.push(nouvelleEvaluation)
    this.sauvegarderEvaluations(evaluations)
    return nouvelleEvaluation
  }

  /**
   * Met à jour une évaluation
   */
  mettreAJourEvaluation(id: string, donneesModifiees: Partial<Evaluation>): boolean {
    const evaluations = this.obtenirToutesLesEvaluations()
    const index = evaluations.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    evaluations[index] = { ...evaluations[index], ...donneesModifiees }
    this.sauvegarderEvaluations(evaluations)
    return true
  }

  /**
   * Supprime une évaluation
   */
  supprimerEvaluation(id: string): boolean {
    const evaluations = this.obtenirToutesLesEvaluations()
    const nouvellesEvaluations = evaluations.filter(e => e.id !== id)
    
    if (nouvellesEvaluations.length === evaluations.length) return false
    
    this.sauvegarderEvaluations(nouvellesEvaluations)
    return true
  }

  /**
   * Calcule la moyenne des évaluations d'un membre du personnel
   */
  calculerMoyennePersonnel(personnelId: string): number {
    const evaluations = this.obtenirEvaluationsPersonnel(personnelId)
    if (evaluations.length === 0) return 0
    
    const total = evaluations.reduce((sum, e) => sum + e.note, 0)
    return Math.round(total / evaluations.length)
  }

  /**
   * Calcule les statistiques de performance d'un membre du personnel
   */
  calculerStatistiquesPersonnel(personnelId: string) {
    const evaluations = this.obtenirEvaluationsPersonnel(personnelId)
    if (evaluations.length === 0) {
      return {
        moyenne: 0,
        nombre: 0,
        criteres: { pedagogie: 0, ponctualite: 0, communication: 0, discipline: 0 }
      }
    }
    
    const criteres = {
      pedagogie: Math.round(evaluations.reduce((sum, e) => sum + e.criteres.pedagogie, 0) / evaluations.length),
      ponctualite: Math.round(evaluations.reduce((sum, e) => sum + e.criteres.ponctualite, 0) / evaluations.length),
      communication: Math.round(evaluations.reduce((sum, e) => sum + e.criteres.communication, 0) / evaluations.length),
      discipline: Math.round(evaluations.reduce((sum, e) => sum + e.criteres.discipline, 0) / evaluations.length)
    }
    
    return {
      moyenne: this.calculerMoyennePersonnel(personnelId),
      nombre: evaluations.length,
      criteres
    }
  }

  /**
   * Obtient les statistiques globales
   */
  obtenirStatistiquesGlobales() {
    const evaluations = this.obtenirToutesLesEvaluations()
    const total = evaluations.length
    const moyenneGenerale = total > 0 
      ? Math.round(evaluations.reduce((sum, e) => sum + e.note, 0) / total)
      : 0
    const parType: Record<string, number> = {}
    
    evaluations.forEach(e => {
      parType[e.type] = (parType[e.type] || 0) + 1
    })
    
    return {
      total,
      moyenneGenerale,
      parType
    }
  }
}

export const serviceEvaluation = new ServiceEvaluation()
