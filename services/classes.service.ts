const safeLocalStorage = typeof window !== 'undefined' ? window.localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as Storage

import type { Classe, DonneesEleve, DonneesEnseignant } from "../types/models"

class ServiceClasses {
  private readonly CLE_STOCKAGE = "classes"

  obtenirToutesLesClasses(): Classe[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch (erreur) {
      console.error("Erreur lors de la récupération des classes:", erreur)
      return []
    }
  }

  obtenirClasseParId(id: string): Classe | undefined {
    return this.obtenirToutesLesClasses().find(classe => classe.id === id)
  }

  ajouterClasse(donneesClasse: Omit<Classe, "id">): Classe {
    const classes = this.obtenirToutesLesClasses()
    const nouvelleClasse: Classe = { ...donneesClasse, id: `classe_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` }
    classes.push(nouvelleClasse)
    this.sauvegarderClasses(classes)
    return nouvelleClasse
  }

  modifierClasse(id: string, donneesModifiees: Partial<Classe>): Classe | null {
    const classes = this.obtenirToutesLesClasses()
    const index = classes.findIndex(classe => classe.id === id)
    if (index === -1) return null
    classes[index] = { ...classes[index], ...donneesModifiees }
    this.sauvegarderClasses(classes)
    return classes[index]
  }

  supprimerClasse(id: string): boolean {
    const classes = this.obtenirToutesLesClasses()
    const index = classes.findIndex(classe => classe.id === id)
    if (index === -1) return false
    classes.splice(index, 1)
    this.sauvegarderClasses(classes)
    return true
  }

  obtenirElevesDeClasse(classeId: string): DonneesEleve[] {
    try {
      const data = safeLocalStorage.getItem("eleves")
      if (!data) return []
      const eleves: DonneesEleve[] = JSON.parse(data)
      return eleves.filter(eleve => eleve.classe === classeId && eleve.statut === "actif")
    } catch (erreur) {
      console.error("Erreur lors de la récupération des élèves:", erreur)
      return []
    }
  }

  compterElevesParClasse(classeId: string): number {
    return this.obtenirElevesDeClasse(classeId).length
  }

  obtenirEnseignantsDeClasse(classeId: string): DonneesEnseignant[] {
    try {
      const data = safeLocalStorage.getItem("enseignants")
      if (!data) return []
      const enseignants: DonneesEnseignant[] = JSON.parse(data)
      return enseignants.filter(enseignant => enseignant.classes.includes(classeId) && enseignant.statut === "actif")
    } catch (erreur) {
      console.error("Erreur lors de la récupération des enseignants:", erreur)
      return []
    }
  }

  assignerEnseignantAClasse(classeId: string, enseignantId: string): boolean {
    try {
      const data = safeLocalStorage.getItem("enseignants")
      if (!data) return false
      const enseignants: DonneesEnseignant[] = JSON.parse(data)
      const enseignant = enseignants.find(item => item.id === enseignantId)
      if (!enseignant) return false
      if (!enseignant.classes.includes(classeId)) enseignant.classes.push(classeId)
      safeLocalStorage.setItem("enseignants", JSON.stringify(enseignants))
      return true
    } catch (erreur) {
      console.error("Erreur lors de l'assignation:", erreur)
      return false
    }
  }

  retirerEnseignantDeClasse(classeId: string, enseignantId: string): boolean {
    try {
      const data = safeLocalStorage.getItem("enseignants")
      if (!data) return false
      const enseignants: DonneesEnseignant[] = JSON.parse(data)
      const enseignant = enseignants.find(item => item.id === enseignantId)
      if (!enseignant) return false
      enseignant.classes = enseignant.classes.filter(id => id !== classeId)
      safeLocalStorage.setItem("enseignants", JSON.stringify(enseignants))
      return true
    } catch (erreur) {
      console.error("Erreur lors du retrait:", erreur)
      return false
    }
  }

  obtenirStatistiquesClasses() {
    const classes = this.obtenirToutesLesClasses()
    const totalEleves = classes.reduce((total, classe) => total + this.compterElevesParClasse(classe.id), 0)
    return {
      totalClasses: classes.length,
      classesActives: classes.length,
      totalEleves,
      moyenneElevesParClasse: classes.length ? totalEleves / classes.length : 0,
      recettesTotales: classes.reduce((total, classe) => total + classe.fraisScolarite * this.compterElevesParClasse(classe.id), 0),
    }
  }

  private sauvegarderClasses(classes: Classe[]) {
    try { safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(classes)) }
    catch (erreur) { console.error("Erreur lors de la sauvegarde des classes:", erreur); throw new Error("Impossible de sauvegarder les classes") }
  }
}

export const serviceClasses = new ServiceClasses()
