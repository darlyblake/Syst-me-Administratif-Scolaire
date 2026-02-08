/**
 * Service de gestion des absences
 * Gère toutes les opérations CRUD pour les absences des élèves
 */

import type { Absence, DonneesEleve } from "../types/models"

class ServiceAbsences {
  private readonly CLE_STOCKAGE = "absences"

  /**
   * Récupère toutes les absences depuis le localStorage
   * @returns Liste de toutes les absences
   */
  obtenirToutesLesAbsences(): Absence[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch (erreur) {
      console.error("Erreur lors de la récupération des absences:", erreur)
      return []
    }
  }

  /**
   * Récupère les absences d'un élève
   * @param eleveId - ID de l'élève
   * @returns Liste des absences de l'élève
   */
  obtenirAbsencesParEleve(eleveId: string): Absence[] {
    const absences = this.obtenirToutesLesAbsences()
    return absences
      .filter((absence) => absence.eleveId === eleveId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Récupère les absences par date
   * @param date - Date au format YYYY-MM-DD
   * @returns Liste des absences pour cette date
   */
  obtenirAbsencesParDate(date: string): Absence[] {
    const absences = this.obtenirToutesLesAbsences()
    return absences.filter((absence) => absence.date === date)
  }

  /**
   * Récupère les absences par période
   * @param dateDebut - Date de début (YYYY-MM-DD)
   * @param dateFin - Date de fin (YYYY-MM-DD)
   * @returns Liste des absences dans la période
   */
  obtenirAbsencesParPeriode(dateDebut: string, dateFin: string): Absence[] {
    const absences = this.obtenirToutesLesAbsences()
    return absences
      .filter((absence) => absence.date >= dateDebut && absence.date <= dateFin)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Ajoute une nouvelle absence
   * @param donneesAbsence - Données de l'absence à ajouter
   * @returns L'absence créée avec un ID généré
   */
  ajouterAbsence(donneesAbsence: Omit<Absence, "id" | "dateCreation">): Absence {
    const absences = this.obtenirToutesLesAbsences()

    // Vérifier si l'élève existe
    if (!this.eleveExiste(donneesAbsence.eleveId)) {
      throw new Error("Élève non trouvé")
    }

    // Vérifier si une absence existe déjà pour cet élève à cette date
    const absenceExistante = absences.find(
      (absence) => absence.eleveId === donneesAbsence.eleveId && absence.date === donneesAbsence.date,
    )

    if (absenceExistante) {
      throw new Error("Une absence existe déjà pour cet élève à cette date")
    }

    // Génération d'un ID unique
    const nouvelleAbsence: Absence = {
      ...donneesAbsence,
      id: `absence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateCreation: new Date().toISOString(),
    }

    absences.push(nouvelleAbsence)
    this.sauvegarderAbsences(absences)

    return nouvelleAbsence
  }

  /**
   * Met à jour une absence existante
   * @param id - ID de l'absence à modifier
   * @param donneesModifiees - Nouvelles données de l'absence
   * @returns L'absence mise à jour ou null si non trouvée
   */
  modifierAbsence(id: string, donneesModifiees: Partial<Absence>): Absence | null {
    const absences = this.obtenirToutesLesAbsences()
    const index = absences.findIndex((absence) => absence.id === id)

    if (index === -1) {
      return null
    }

    // Mise à jour de l'absence
    absences[index] = { ...absences[index], ...donneesModifiees }
    this.sauvegarderAbsences(absences)

    return absences[index]
  }

  /**
   * Supprime une absence
   * @param id - ID de l'absence à supprimer
   * @returns true si supprimée, false si non trouvée
   */
  supprimerAbsence(id: string): boolean {
    const absences = this.obtenirToutesLesAbsences()
    const index = absences.findIndex((absence) => absence.id === id)

    if (index === -1) {
      return false
    }

    absences.splice(index, 1)
    this.sauvegarderAbsences(absences)

    return true
  }

  /**
   * Marque une absence comme justifiée
   * @param id - ID de l'absence
   * @param motif - Motif de justification
   * @param justificatif - Chemin vers le document justificatif
   * @returns true si mise à jour réussie
   */
  justifierAbsence(id: string, motif: string, justificatif?: string): boolean {
    const absence = this.obtenirAbsenceParId(id)
    if (!absence) return false

    return (
      this.modifierAbsence(id, {
        statut: "justifie",
        motif,
        justificatif,
      }) !== null
    )
  }

  /**
   * Récupère une absence par son ID
   * @param id - ID de l'absence
   * @returns L'absence trouvée ou undefined
   */
  private obtenirAbsenceParId(id: string): Absence | undefined {
    const absences = this.obtenirToutesLesAbsences()
    return absences.find((absence) => absence.id === id)
  }

  /**
   * Vérifie si un élève existe
   * @param eleveId - ID de l'élève
   * @returns true si l'élève existe
   */
  private eleveExiste(eleveId: string): boolean {
    try {
      const donneesEleves = localStorage.getItem("eleves")
      if (!donneesEleves) return false

      const eleves: DonneesEleve[] = JSON.parse(donneesEleves)
      return eleves.some((eleve) => eleve.id === eleveId)
    } catch (erreur) {
      console.error("Erreur lors de la vérification de l'élève:", erreur)
      return false
    }
  }

  /**
   * Sauvegarde les absences dans le localStorage
   * @param absences - Liste des absences à sauvegarder
   */
  private sauvegarderAbsences(absences: Absence[]): void {
    try {
      localStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(absences))
    } catch (erreur) {
      console.error("Erreur lors de la sauvegarde des absences:", erreur)
      throw new Error("Impossible de sauvegarder les absences")
    }
  }

  /**
   * Obtient les statistiques des absences
   * @returns Statistiques générales des absences
   */
  obtenirStatistiquesAbsences() {
    const absences = this.obtenirToutesLesAbsences()
    const aujourdHui = new Date().toISOString().split("T")[0]
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]

    const absencesMois = absences.filter((absence) => absence.date >= debutMois)
    const absencesAujourdhui = absences.filter(absence => absence.date === aujourdHui)

    return {
      totalAbsences: absences.length,
      absencesMoisCourant: absencesMois.length,
      absencesAujourdhui: absencesAujourdhui.length,
      absencesNonJustifiees: absences.filter(absence => absence.statut === 'non_justifie').length,
      tauxAbsenteisme: this.calculerTauxAbsenteisme(absencesMois),
      elevesAbsentsAujourdhui: new Set(absencesAujourdhui.map(absence => absence.eleveId)).size
    }
  }

  /**
   * Calcule le taux d'absentéisme
   * @param absences - Liste des absences à analyser
   * @returns Taux d'absentéisme en pourcentage
   */
  private calculerTauxAbsenteisme(absences: Absence[]): number {
    try {
      const donneesEleves = localStorage.getItem("eleves")
      if (!donneesEleves) return 0

      const eleves: DonneesEleve[] = JSON.parse(donneesEleves)
      const elevesActifs = eleves.filter((eleve) => eleve.statut === "actif").length

      if (elevesActifs === 0) return 0

      const joursOuvrables = this.calculerJoursOuvrables()
      const absencesTotales = absences.filter((absence) => absence.statut === "absent").length

      return (absencesTotales / (elevesActifs * joursOuvrables)) * 100
    } catch (erreur) {
      console.error("Erreur lors du calcul du taux d'absentéisme:", erreur)
      return 0
    }
  }

  /**
   * Calcule le nombre de jours ouvrables dans le mois courant
   * @returns Nombre de jours ouvrables
   */
  private calculerJoursOuvrables(): number {
    const maintenant = new Date()
    const annee = maintenant.getFullYear()
    const mois = maintenant.getMonth()
    const joursDansMois = new Date(annee, mois + 1, 0).getDate()

    let joursOuvrables = 0
    for (let jour = 1; jour <= joursDansMois; jour++) {
      const date = new Date(annee, mois, jour)
      const jourSemaine = date.getDay()
      // Exclure dimanche (0) et samedi (6) - ajuster selon vos besoins
      if (jourSemaine !== 0 && jourSemaine !== 6) {
        joursOuvrables++
      }
    }

    return joursOuvrables
  }
}

// Export de l'instance unique du service
export const serviceAbsences = new ServiceAbsences()
