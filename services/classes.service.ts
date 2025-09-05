/**
 * Service de gestion des classes
 * Gère toutes les opérations CRUD pour les classes scolaires
 */

import type { Classe, DonneesEleve, DonneesEnseignant } from "../types/models"

class ServiceClasses {
  private readonly CLE_STOCKAGE = "classes"

  /**
   * Récupère toutes les classes depuis le localStorage
   * @returns Liste de toutes les classes
   */
  obtenirToutesLesClasses(): Classe[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch (erreur) {
      console.error("Erreur lors de la récupération des classes:", erreur)
      return []
    }
  }

  /**
   * Récupère une classe par son ID
   * @param id - Identifiant unique de la classe
   * @returns La classe trouvée ou undefined
   */
  obtenirClasseParId(id: string): Classe | undefined {
    const classes = this.obtenirToutesLesClasses()
    return classes.find((classe) => classe.id === id)
  }

  /**
   * Ajoute une nouvelle classe
   * @param donneesClasse - Données de la classe à ajouter
   * @returns La classe créée avec un ID généré
   */
  ajouterClasse(donneesClasse: Omit<Classe, "id">): Classe {
    const classes = this.obtenirToutesLesClasses()

    // Génération d'un ID unique basé sur le nom et le timestamp
    const nouvelleClasse: Classe = {
      ...donneesClasse,
      id: `classe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    classes.push(nouvelleClasse)
    this.sauvegarderClasses(classes)

    return nouvelleClasse
  }

  /**
   * Met à jour une classe existante
   * @param id - ID de la classe à modifier
   * @param donneesModifiees - Nouvelles données de la classe
   * @returns La classe mise à jour ou null si non trouvée
   */
  modifierClasse(id: string, donneesModifiees: Partial<Classe>): Classe | null {
    const classes = this.obtenirToutesLesClasses()
    const index = classes.findIndex((classe) => classe.id === id)

    if (index === -1) {
      return null
    }

    // Mise à jour de la classe
    classes[index] = { ...classes[index], ...donneesModifiees }
    this.sauvegarderClasses(classes)

    return classes[index]
  }

  /**
   * Supprime une classe
   * @param id - ID de la classe à supprimer
   * @returns true si supprimée, false si non trouvée
   */
  supprimerClasse(id: string): boolean {
    const classes = this.obtenirToutesLesClasses()
    const index = classes.findIndex((classe) => classe.id === id)

    if (index === -1) {
      return false
    }

    classes.splice(index, 1)
    this.sauvegarderClasses(classes)

    return true
  }

  /**
   * Compte le nombre d'élèves dans une classe
   * @param classeId - ID de la classe
   * @returns Nombre d'élèves dans la classe
   */
  compterElevesParClasse(classeId: string): number {
    try {
      const donneesEleves = localStorage.getItem("eleves")
      if (!donneesEleves) return 0

      const eleves: DonneesEleve[] = JSON.parse(donneesEleves)
      return eleves.filter((eleve) => eleve.classe === classeId && eleve.statut === "actif").length
    } catch (erreur) {
      console.error("Erreur lors du comptage des élèves:", erreur)
      return 0
    }
  }

  /**
   * Obtient les enseignants assignés à une classe
   * @param classeId - ID de la classe
   * @returns Liste des enseignants de la classe
   */
  obtenirEnseignantsDeClasse(classeId: string): DonneesEnseignant[] {
    try {
      const donneesEnseignants = localStorage.getItem("enseignants")
      if (!donneesEnseignants) return []

      const enseignants: DonneesEnseignant[] = JSON.parse(donneesEnseignants)
      return enseignants.filter((enseignant) => enseignant.classes.includes(classeId) && enseignant.statut === "actif")
    } catch (erreur) {
      console.error("Erreur lors de la récupération des enseignants:", erreur)
      return []
    }
  }

  /**
   * Assigne un enseignant à une classe
   * @param classeId - ID de la classe
   * @param enseignantId - ID de l'enseignant
   * @returns true si assigné avec succès
   */
  assignerEnseignantAClasse(classeId: string, enseignantId: string): boolean {
    try {
      const donneesEnseignants = localStorage.getItem("enseignants")
      if (!donneesEnseignants) return false

      const enseignants: DonneesEnseignant[] = JSON.parse(donneesEnseignants)
      const enseignant = enseignants.find((e) => e.id === enseignantId)

      if (!enseignant) return false

      // Ajouter la classe si pas déjà assignée
      if (!enseignant.classes.includes(classeId)) {
        enseignant.classes.push(classeId)
        localStorage.setItem("enseignants", JSON.stringify(enseignants))
      }

      return true
    } catch (erreur) {
      console.error("Erreur lors de l'assignation:", erreur)
      return false
    }
  }

  /**
   * Sauvegarde les classes dans le localStorage
   * @param classes - Liste des classes à sauvegarder
   */
  private sauvegarderClasses(classes: Classe[]): void {
    try {
      localStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(classes))
    } catch (erreur) {
      console.error("Erreur lors de la sauvegarde des classes:", erreur)
      throw new Error("Impossible de sauvegarder les classes")
    }
  }

  /**
   * Obtient les statistiques des classes
   * @returns Statistiques générales des classes
   */
  obtenirStatistiquesClasses() {
    const classes = this.obtenirToutesLesClasses()

    return {
      totalClasses: classes.length,
      classesActives: classes.length, // Toutes les classes sont considérées actives
      moyenneElevesParClasse:
        classes.length > 0
          ? classes.reduce((total, classe) => total + this.compterElevesParClasse(classe.id), 0) / classes.length
          : 0,
      recettesTotales: classes.reduce(
        (total, classe) => total + classe.fraisScolarite * this.compterElevesParClasse(classe.id),
        0,
      ),
    }
  }
}

// Export de l'instance unique du service
export const serviceClasses = new ServiceClasses()
