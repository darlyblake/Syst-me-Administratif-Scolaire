/**
 * Service de gestion du personnel administratif et technique
 */

import type { DonneesPersonnel, FiltresPersonnel, StatistiquesPersonnel, StatutPersonnel, TypeContrat, ModeRemuneration } from "@/types/personnel"

class ServicePersonnel {
  private readonly CLE_STOCKAGE_PERSONNEL = "personnel_administratif"

  /**
   * Récupère tous les membres du personnel
   */
  obtenirToutLePersonnel(): DonneesPersonnel[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_PERSONNEL)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Récupère un membre du personnel par son ID
   */
  obtenirPersonnelParId(id: string): DonneesPersonnel | null {
    const personnel = this.obtenirToutLePersonnel()
    return personnel.find(p => p.id === id) || null
  }

  /**
   * Ajoute un nouveau membre du personnel
   */
  ajouterPersonnel(personnel: Omit<DonneesPersonnel, "id" | "dateCreation" | "dateModification">): DonneesPersonnel {
    const nouveauPersonnel: DonneesPersonnel = {
      ...personnel,
      id: this.genererIdUnique(),
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString(),
    }

    const toutPersonnel = this.obtenirToutLePersonnel()
    toutPersonnel.push(nouveauPersonnel)
    this.sauvegarderPersonnel(toutPersonnel)

    return nouveauPersonnel
  }

  /**
   * Met à jour un membre du personnel
   */
  mettreAJourPersonnel(id: string, donneesModifiees: Partial<DonneesPersonnel>): boolean {
    const personnel = this.obtenirToutLePersonnel()
    const index = personnel.findIndex(p => p.id === id)

    if (index === -1) return false

    personnel[index] = {
      ...personnel[index],
      ...donneesModifiees,
      dateModification: new Date().toISOString()
    }
    this.sauvegarderPersonnel(personnel)
    return true
  }

  /**
   * Supprime un membre du personnel
   */
  supprimerPersonnel(id: string): boolean {
    const personnel = this.obtenirToutLePersonnel()
    const personnelFiltre = personnel.filter(p => p.id !== id)

    if (personnelFiltre.length === personnel.length) return false

    this.sauvegarderPersonnel(personnelFiltre)
    return true
  }

  /**
   * Recherche et filtre le personnel selon les critères
   */
  rechercherPersonnel(filtres: FiltresPersonnel): DonneesPersonnel[] {
    let personnel = this.obtenirToutLePersonnel()

    if (filtres.recherche) {
      const recherche = filtres.recherche.toLowerCase()
      personnel = personnel.filter(p =>
        p.nom.toLowerCase().includes(recherche) ||
        p.prenom.toLowerCase().includes(recherche) ||
        p.poste.toLowerCase().includes(recherche)
      )
    }

    if (filtres.poste) {
      personnel = personnel.filter(p => p.poste.toLowerCase().includes(filtres.poste.toLowerCase()))
    }

    if (filtres.statut) {
      personnel = personnel.filter(p => p.statut === filtres.statut)
    }

    return personnel
  }

  /**
   * Génère les statistiques du personnel
   */
  genererStatistiques(): StatistiquesPersonnel {
    const personnel = this.obtenirToutLePersonnel()

    const parStatut: Record<StatutPersonnel, number> = {
      actif: 0,
      inactif: 0,
      suspendu: 0,
      conge: 0
    }

    const parTypeContrat: Record<TypeContrat, number> = {
      cdi: 0,
      cdd: 0,
      vacataire: 0,
      consultant: 0
    }

    let masseSalarialeTotale = 0

    personnel.forEach(p => {
      parStatut[p.statut]++
      parTypeContrat[p.typeContrat]++

      // Calcul de la masse salariale
      if (p.modeRemuneration === "fixe" && p.salaireFixe) {
        masseSalarialeTotale += p.salaireFixe
      } else if (p.modeRemuneration === "horaire" && p.tauxHoraire && p.heuresPrevues) {
        masseSalarialeTotale += p.tauxHoraire * p.heuresPrevues
      }
    })

    return {
      totalPersonnel: personnel.length,
      parStatut,
      parTypeContrat,
      masseSalarialeTotale
    }
  }

  /**
   * Récupère la liste des postes uniques
   */
  obtenirPostesUniques(): string[] {
    const personnel = this.obtenirToutLePersonnel()
    return Array.from(new Set(personnel.map(p => p.poste)))
  }

  // === MÉTHODES PRIVÉES ===

  private sauvegarderPersonnel(personnel: DonneesPersonnel[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_PERSONNEL, JSON.stringify(personnel))
  }

  private genererIdUnique(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

// Instance singleton du service
export const servicePersonnel = new ServicePersonnel()
