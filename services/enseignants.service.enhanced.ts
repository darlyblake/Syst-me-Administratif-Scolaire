/**
 * Service de gestion des enseignants - Version améliorée avec gestion d'erreurs
 * Contient toute la logique métier liée aux enseignants avec logs et gestion d'erreurs robuste
 */

import type {
  DonneesEnseignant,
  CreneauEmploiDuTemps,
  Pointage,
  SessionPointageTelephone,
  HistoriqueAffectation,
  DocumentAdministratif,
  Contact,
  AffectationNotification
} from "@/types/models"

class ServiceEnseignantsEnhanced {
  private readonly CLE_STOCKAGE_ENSEIGNANTS = "enseignants"
  private readonly CLE_STOCKAGE_EMPLOI_DU_TEMPS = "emploiDuTemps"
  private readonly CLE_STOCKAGE_POINTAGES = "pointages"
  private readonly CLE_STOCKAGE_SESSIONS_POINTAGE = "sessionsPointage"
  private readonly CLE_STOCKAGE_HISTORIQUE_AFFECTATIONS = "historiqueAffectations"
  private readonly CLE_STOCKAGE_DOCUMENTS_ADMINISTRATIFS = "documentsAdministratifs"
  private readonly CLE_STOCKAGE_CONTACTS = "contacts"
  private readonly CLE_STOCKAGE_AFFECTATIONS_NOTIFICATIONS = "affectationsNotifications"

  /**
   * Récupère tous les enseignants avec gestion d'erreurs
   */
  obtenirTousLesEnseignants(): DonneesEnseignant[] {
    try {
      console.log('ServiceEnseignants: Récupération de tous les enseignants')
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_ENSEIGNANTS)
      if (!donnees) {
        console.log('ServiceEnseignants: Aucun enseignant trouvé dans le stockage')
        return []
      }

      const parsedData = JSON.parse(donnees)

      // S'assurer que les données analysées sont toujours un tableau
      if (!Array.isArray(parsedData)) {
        console.warn('ServiceEnseignants: Données enseignants corrompues dans localStorage, réinitialisation à un tableau vide')
        this.auditLog('error', 'Données enseignants corrompues', { dataType: typeof parsedData })
        return []
      }

      console.log(`ServiceEnseignants: ${parsedData.length} enseignants récupérés`)
      return parsedData
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de la récupération des enseignants:', error)
      this.auditLog('error', 'Erreur récupération enseignants', { error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  /**
   * Récupère un enseignant par son identifiant avec gestion d'erreurs
   */
  obtenirEnseignantParIdentifiant(identifiant: string): DonneesEnseignant | null {
    try {
      if (!identifiant) {
        console.warn('ServiceEnseignants: Identifiant vide fourni')
        return null
      }

      const enseignants = this.obtenirTousLesEnseignants()
      const enseignant = enseignants.find(e => e.identifiant === identifiant)

      if (enseignant) {
        console.log('ServiceEnseignants: Enseignant trouvé par identifiant', { identifiant, id: enseignant.id })
      } else {
        console.log('ServiceEnseignants: Aucun enseignant trouvé avec cet identifiant', { identifiant })
      }

      return enseignant || null
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de la recherche par identifiant:', error)
      this.auditLog('error', 'Erreur recherche enseignant par identifiant', { identifiant, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Ajoute un nouvel enseignant avec identifiants générés automatiquement et validation
   */
  ajouterEnseignant(enseignant: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): DonneesEnseignant {
    try {
      console.log('ServiceEnseignants: Ajout d\'un nouvel enseignant', { nom: enseignant.nom, prenom: enseignant.prenom })

      // Validation des données d'entrée
      if (!enseignant.nom || !enseignant.prenom || !enseignant.email) {
        throw new Error('Informations personnelles incomplètes')
      }

      if (!this.validerEmail(enseignant.email)) {
        throw new Error('Adresse email invalide')
      }

      // Préparer les valeurs salariales selon le type de contrat
      let salaireMensuel: number | undefined
      let tauxHoraire: number | undefined
      let heuresContractuelles: number | undefined

      switch (enseignant.typeContrat) {
        case "vacataire":
          salaireMensuel = undefined
          tauxHoraire = enseignant.tauxHoraire || 0
          heuresContractuelles = undefined
          break
        case "cdi":
          salaireMensuel = enseignant.salaireMensuel || 0
          tauxHoraire = undefined
          heuresContractuelles = enseignant.heuresContractuelles || 160 // 40h/semaine * 4
          break
        default:
          salaireMensuel = enseignant.salaireMensuel
          tauxHoraire = enseignant.tauxHoraire
          heuresContractuelles = enseignant.heuresContractuelles
      }

      const nouvelEnseignant = Object.assign({}, enseignant, {
        id: this.genererIdUnique(),
        identifiant: this.genererIdentifiant(enseignant.nom, enseignant.prenom),
        motDePasse: this.genererMotDePasseUnique(),
        dateEmbauche: new Date().toISOString(),
        statut: "actif",
        salaireMensuel,
        tauxHoraire,
        heuresContractuelles
      }) as DonneesEnseignant

      const enseignants = this.obtenirTousLesEnseignants()
      enseignants.push(nouvelEnseignant)
      this.sauvegarderEnseignants(enseignants)

      console.log('ServiceEnseignants: Enseignant ajouté avec succès', { id: nouvelEnseignant.id, identifiant: nouvelEnseignant.identifiant })
      this.auditLog('info', 'Enseignant ajouté', { id: nouvelEnseignant.id, identifiant: nouvelEnseignant.identifiant })

      return nouvelEnseignant
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de l\'ajout de l\'enseignant:', error)
      this.auditLog('error', 'Erreur ajout enseignant', { error: error instanceof Error ? error.message : String(error), nom: enseignant.nom, prenom: enseignant.prenom })
      throw new Error('Impossible d\'ajouter l\'enseignant. Veuillez réessayer.')
    }
  }

  /**
   * Met à jour un enseignant existant avec validation
   */
  mettreAJourEnseignant(id: string, donneesModifiees: Partial<DonneesEnseignant>): boolean {
    try {
      if (!id) {
        throw new Error('ID de l\'enseignant requis')
      }

      console.log('ServiceEnseignants: Mise à jour de l\'enseignant', { id, modifications: Object.keys(donneesModifiees) })

      const enseignants = this.obtenirTousLesEnseignants()
      const index = enseignants.findIndex((e) => e.id === id)

      if (index === -1) {
        console.warn('ServiceEnseignants: Enseignant non trouvé pour mise à jour', { id })
        return false
      }

      // Validation des données de mise à jour
      if (donneesModifiees.email && !this.validerEmail(donneesModifiees.email)) {
        throw new Error('Adresse email invalide')
      }

      enseignants[index] = { ...enseignants[index], ...donneesModifiees }
      this.sauvegarderEnseignants(enseignants)

      console.log('ServiceEnseignants: Enseignant mis à jour avec succès', { id })
      this.auditLog('info', 'Enseignant mis à jour', { id, modifications: Object.keys(donneesModifiees) })

      return true
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de la mise à jour de l\'enseignant:', error)
      this.auditLog('error', 'Erreur mise à jour enseignant', { id, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  /**
   * Supprime un enseignant avec confirmation
   */
  supprimerEnseignant(id: string): boolean {
    try {
      if (!id) {
        throw new Error('ID de l\'enseignant requis')
      }

      console.log('ServiceEnseignants: Suppression de l\'enseignant', { id })

      const enseignants = this.obtenirTousLesEnseignants()
      const enseignantsFiltrés = enseignants.filter((e) => e.id !== id)

      if (enseignantsFiltrés.length === enseignants.length) {
        console.warn('ServiceEnseignants: Enseignant non trouvé pour suppression', { id })
        return false
      }

      this.sauvegarderEnseignants(enseignantsFiltrés)

      console.log('ServiceEnseignants: Enseignant supprimé avec succès', { id })
      this.auditLog('warning', 'Enseignant supprimé', { id })

      return true
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de la suppression de l\'enseignant:', error)
      this.auditLog('error', 'Erreur suppression enseignant', { id, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  /**
   * Valide une adresse email
   */
  private validerEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Journal d'audit pour les opérations importantes
   */
  private auditLog(level: 'info' | 'warning' | 'error', action: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    }

    // Stockage des logs d'audit (derniers 1000 logs)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
      existingLogs.push(logEntry)
      if (existingLogs.length > 1000) {
        existingLogs.shift() // Supprimer le plus ancien
      }
      localStorage.setItem('audit_logs', JSON.stringify(existingLogs))
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du log d\'audit:', error)
    }

    // Log console selon le niveau
    switch (level) {
      case 'error':
        console.error(`[AUDIT ${level.toUpperCase()}] ${action}:`, details)
        break
      case 'warning':
        console.warn(`[AUDIT ${level.toUpperCase()}] ${action}:`, details)
        break
      default:
        console.log(`[AUDIT ${level.toUpperCase()}] ${action}:`, details)
    }
  }

  // === MÉTHODES EXISTANTES (avec gestion d'erreurs ajoutée) ===

  private sauvegarderEnseignants(enseignants: DonneesEnseignant[]): void {
    try {
      localStorage.setItem(this.CLE_STOCKAGE_ENSEIGNANTS, JSON.stringify(enseignants))
    } catch (error) {
      console.error('ServiceEnseignants: Erreur lors de la sauvegarde des enseignants:', error)
      this.auditLog('error', 'Erreur sauvegarde enseignants', { error: error instanceof Error ? error.message : String(error) })
      throw new Error('Erreur de sauvegarde. Vérifiez l\'espace de stockage disponible.')
    }
  }

  private genererIdUnique(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  private genererIdentifiant(nom: string, prenom: string): string {
    const nomNormalise = nom.toLowerCase().replace(/[^a-z]/g, "")
    const prenomNormalise = prenom.toLowerCase().replace(/[^a-z]/g, "")
    const suffixe = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `${prenomNormalise.substring(0, 3)}${nomNormalise.substring(0, 3)}${suffixe}`
  }

  private genererMotDePasseUnique(): string {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let motDePasse = ""
    for (let i = 0; i < 8; i++) {
      motDePasse += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
    }
    return motDePasse
  }

  // === PLACEHOLDER POUR LES AUTRES MÉTHODES ===
  // Les autres méthodes peuvent être ajoutées ici avec la même gestion d'erreurs

  assignerClasses(enseignantId: string, classes: string[]): boolean {
    return this.mettreAJourEnseignant(enseignantId, { classes })
  }

  assignerMatieres(enseignantId: string, matieres: string[]): boolean {
    return this.mettreAJourEnseignant(enseignantId, { matieres })
  }
}

// Instance singleton du service amélioré
export const serviceEnseignantsEnhanced = new ServiceEnseignantsEnhanced()
