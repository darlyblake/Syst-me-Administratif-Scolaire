/**
 * Service de gestion des matières
 * Gère toutes les opérations CRUD pour les matières scolaires
 */

import type { Matiere, DonneesEnseignant } from "../types/models"

class ServiceMatieres {
  private readonly CLE_STOCKAGE = "matieres"

  /**
   * Récupère toutes les matières depuis le localStorage
   * @returns Liste de toutes les matières
   */
  obtenirToutesLesMatieres(): Matiere[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch (erreur) {
      console.error("Erreur lors de la récupération des matières:", erreur)
      return []
    }
  }

  /**
   * Récupère une matière par son ID
   * @param id - Identifiant unique de la matière
   * @returns La matière trouvée ou undefined
   */
  obtenirMatiereParId(id: string): Matiere | undefined {
    const matieres = this.obtenirToutesLesMatieres()
    return matieres.find((matiere) => matiere.id === id)
  }

  /**
   * Récupère les matières par niveau
   * @param niveau - Niveau scolaire
   * @returns Liste des matières pour ce niveau
   */
  obtenirMatieresParNiveau(niveau: string): Matiere[] {
    const matieres = this.obtenirToutesLesMatieres()
    return matieres.filter((matiere) => matiere.niveau.includes(niveau))
  }

  /**
   * Ajoute une nouvelle matière
   * @param donneesMatiere - Données de la matière à ajouter
   * @returns La matière créée avec un ID généré
   */
  ajouterMatiere(donneesMatiere: Omit<Matiere, "id">): Matiere {
    const matieres = this.obtenirToutesLesMatieres()

    // Vérification de l'unicité du code
    const codeExiste = matieres.some((matiere) => matiere.code === donneesMatiere.code)
    if (codeExiste) {
      throw new Error(`Le code "${donneesMatiere.code}" existe déjà`)
    }

    // Génération d'un ID unique
    const nouvelleMatiere: Matiere = {
      ...donneesMatiere,
      id: `matiere_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    matieres.push(nouvelleMatiere)
    this.sauvegarderMatieres(matieres)

    return nouvelleMatiere
  }

  /**
   * Met à jour une matière existante
   * @param id - ID de la matière à modifier
   * @param donneesModifiees - Nouvelles données de la matière
   * @returns La matière mise à jour ou null si non trouvée
   */
  modifierMatiere(id: string, donneesModifiees: Partial<Matiere>): Matiere | null {
    const matieres = this.obtenirToutesLesMatieres()
    const index = matieres.findIndex((matiere) => matiere.id === id)

    if (index === -1) {
      return null
    }

    // Vérification de l'unicité du code si modifié
    if (donneesModifiees.code) {
      const codeExiste = matieres.some((matiere, i) => i !== index && matiere.code === donneesModifiees.code)
      if (codeExiste) {
        throw new Error(`Le code "${donneesModifiees.code}" existe déjà`)
      }
    }

    // Mise à jour de la matière
    matieres[index] = { ...matieres[index], ...donneesModifiees }
    this.sauvegarderMatieres(matieres)

    return matieres[index]
  }

  /**
   * Supprime une matière
   * @param id - ID de la matière à supprimer
   * @returns true si supprimée, false si non trouvée
   */
  supprimerMatiere(id: string): boolean {
    const matieres = this.obtenirToutesLesMatieres()
    const index = matieres.findIndex((matiere) => matiere.id === id)

    if (index === -1) {
      return false
    }

    // Vérifier si la matière est utilisée par des enseignants
    if (this.matiereEstUtilisee(id)) {
      throw new Error("Impossible de supprimer une matière assignée à des enseignants")
    }

    matieres.splice(index, 1)
    this.sauvegarderMatieres(matieres)

    return true
  }

  /**
   * Vérifie si une matière est assignée à des enseignants
   * @param matiereId - ID de la matière
   * @returns true si la matière est utilisée
   */
  private matiereEstUtilisee(matiereId: string): boolean {
    try {
      const donneesEnseignants = localStorage.getItem("enseignants")
      if (!donneesEnseignants) return false

      const enseignants: DonneesEnseignant[] = JSON.parse(donneesEnseignants)
      return enseignants.some((enseignant) => enseignant.matieres.includes(matiereId))
    } catch (erreur) {
      console.error("Erreur lors de la vérification:", erreur)
      return false
    }
  }

  /**
   * Obtient les enseignants qui enseignent une matière
   * @param matiereId - ID de la matière
   * @returns Liste des enseignants
   */
  obtenirEnseignantsParMatiere(matiereId: string): DonneesEnseignant[] {
    try {
      const donneesEnseignants = localStorage.getItem("enseignants")
      if (!donneesEnseignants) return []

      const enseignants: DonneesEnseignant[] = JSON.parse(donneesEnseignants)
      return enseignants.filter(
        (enseignant) => enseignant.matieres.includes(matiereId) && enseignant.statut === "actif",
      )
    } catch (erreur) {
      console.error("Erreur lors de la récupération des enseignants:", erreur)
      return []
    }
  }

  /**
   * Assigne une matière à un enseignant
   * @param matiereId - ID de la matière
   * @param enseignantId - ID de l'enseignant
   * @returns true si assigné avec succès
   */
  assignerMatiereAEnseignant(matiereId: string, enseignantId: string): boolean {
    try {
      const donneesEnseignants = localStorage.getItem("enseignants")
      if (!donneesEnseignants) return false

      const enseignants: DonneesEnseignant[] = JSON.parse(donneesEnseignants)
      const enseignant = enseignants.find((e) => e.id === enseignantId)

      if (!enseignant) return false

      // Ajouter la matière si pas déjà assignée
      if (!enseignant.matieres.includes(matiereId)) {
        enseignant.matieres.push(matiereId)
        localStorage.setItem("enseignants", JSON.stringify(enseignants))
      }

      return true
    } catch (erreur) {
      console.error("Erreur lors de l'assignation:", erreur)
      return false
    }
  }

  /**
   * Sauvegarde les matières dans le localStorage
   * @param matieres - Liste des matières à sauvegarder
   */
  private sauvegarderMatieres(matieres: Matiere[]): void {
    try {
      localStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(matieres))
    } catch (erreur) {
      console.error("Erreur lors de la sauvegarde des matières:", erreur)
      throw new Error("Impossible de sauvegarder les matières")
    }
  }

  /**
   * Obtient les statistiques des matières
   * @returns Statistiques générales des matières
   */
  obtenirStatistiquesMatieres() {
    const matieres = this.obtenirToutesLesMatieres()

    // Grouper par niveau
    const matieresParNiveau = matieres.reduce(
      (acc, matiere) => {
        matiere.niveau.forEach((niveau) => {
          if (!acc[niveau]) acc[niveau] = 0
          acc[niveau]++
        })
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalMatieres: matieres.length,
      matieresParNiveau,
      coefficientMoyen:
        matieres.length > 0 ? matieres.reduce((total, matiere) => total + matiere.coefficient, 0) / matieres.length : 0,
      niveauxCouverts: Object.keys(matieresParNiveau).length,
    }
  }
}

// Export de l'instance unique du service
export const serviceMatieres = new ServiceMatieres()
