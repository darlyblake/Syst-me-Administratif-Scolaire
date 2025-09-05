/**
 * Service de gestion des enseignants
 * Contient toute la logique métier liée aux enseignants
 */

import type { DonneesEnseignant, CreneauEmploiDuTemps, Pointage, SessionPointageTelephone } from "@/types/models"

class ServiceEnseignants {
  private readonly CLE_STOCKAGE_ENSEIGNANTS = "enseignants"
  private readonly CLE_STOCKAGE_EMPLOI_DU_TEMPS = "emploiDuTemps"
  private readonly CLE_STOCKAGE_POINTAGES = "pointages"
  private readonly CLE_STOCKAGE_SESSIONS_POINTAGE = "sessionsPointage"

  /**
   * Récupère tous les enseignants
   */
  obtenirTousLesEnseignants(): DonneesEnseignant[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_ENSEIGNANTS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Ajoute un nouvel enseignant avec identifiants générés automatiquement
   */
  ajouterEnseignant(enseignant: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): DonneesEnseignant {
    const nouvelEnseignant: DonneesEnseignant = {
      ...enseignant,
      id: this.genererIdUnique(),
      identifiant: this.genererIdentifiant(enseignant.nom, enseignant.prenom),
      motDePasse: this.genererMotDePasseUnique(),
      dateEmbauche: new Date().toISOString(),
      statut: "actif",
    }

    const enseignants = this.obtenirTousLesEnseignants()
    enseignants.push(nouvelEnseignant)
    this.sauvegarderEnseignants(enseignants)

    return nouvelEnseignant
  }

  /**
   * Met à jour un enseignant existant
   */
  mettreAJourEnseignant(id: string, donneesModifiees: Partial<DonneesEnseignant>): boolean {
    const enseignants = this.obtenirTousLesEnseignants()
    const index = enseignants.findIndex((e) => e.id === id)

    if (index === -1) return false

    enseignants[index] = { ...enseignants[index], ...donneesModifiees }
    this.sauvegarderEnseignants(enseignants)
    return true
  }

  /**
   * Supprime un enseignant
   */
  supprimerEnseignant(id: string): boolean {
    const enseignants = this.obtenirTousLesEnseignants()
    const enseignantsFiltrés = enseignants.filter((e) => e.id !== id)

    if (enseignantsFiltrés.length === enseignants.length) return false

    this.sauvegarderEnseignants(enseignantsFiltrés)
    return true
  }

  /**
   * Assigne des classes à un enseignant
   */
  assignerClasses(enseignantId: string, classes: string[]): boolean {
    return this.mettreAJourEnseignant(enseignantId, { classes })
  }

  /**
   * Assigne des matières à un enseignant
   */
  assignerMatieres(enseignantId: string, matieres: string[]): boolean {
    return this.mettreAJourEnseignant(enseignantId, { matieres })
  }

  // === GESTION DE L'EMPLOI DU TEMPS ===

  /**
   * Ajoute un créneau à l'emploi du temps
   */
  ajouterCreneauEmploiDuTemps(creneau: Omit<CreneauEmploiDuTemps, "id">): CreneauEmploiDuTemps {
    const nouveauCreneau: CreneauEmploiDuTemps = {
      ...creneau,
      id: this.genererIdUnique(),
    }

    const emploiDuTemps = this.obtenirEmploiDuTemps()
    emploiDuTemps.push(nouveauCreneau)
    this.sauvegarderEmploiDuTemps(emploiDuTemps)

    return nouveauCreneau
  }

  /**
   * Récupère l'emploi du temps d'un enseignant
   */
  obtenirEmploiDuTempsEnseignant(enseignantId: string): CreneauEmploiDuTemps[] {
    return this.obtenirEmploiDuTemps().filter((c) => c.enseignantId === enseignantId)
  }

  /**
   * Supprime un créneau de l'emploi du temps
   */
  supprimerCreneauEmploiDuTemps(creneauId: string): boolean {
    const emploiDuTemps = this.obtenirEmploiDuTemps()
    const nouveauEmploiDuTemps = emploiDuTemps.filter((c) => c.id !== creneauId)

    if (nouveauEmploiDuTemps.length === emploiDuTemps.length) return false

    this.sauvegarderEmploiDuTemps(nouveauEmploiDuTemps)
    return true
  }

  // === GESTION DU POINTAGE ===

  /**
   * Enregistre un pointage
   */
  enregistrerPointage(pointage: Omit<Pointage, "id">): Pointage {
    const nouveauPointage: Pointage = {
      ...pointage,
      id: this.genererIdUnique(),
    }

    const pointages = this.obtenirTousLesPointages()
    pointages.push(nouveauPointage)
    this.sauvegarderPointages(pointages)

    return nouveauPointage
  }

  /**
   * Récupère l'historique de pointage d'un enseignant
   */
  obtenirHistoriquePointage(enseignantId: string, dateDebut?: string, dateFin?: string): Pointage[] {
    let pointages = this.obtenirTousLesPointages().filter((p) => p.enseignantId === enseignantId)

    if (dateDebut) {
      pointages = pointages.filter((p) => p.date >= dateDebut)
    }
    if (dateFin) {
      pointages = pointages.filter((p) => p.date <= dateFin)
    }

    return pointages.sort((a, b) => b.date.localeCompare(a.date))
  }

  /**
   * Génère un code de vérification pour le pointage par téléphone
   */
  genererCodePointageTelephone(enseignantId: string): SessionPointageTelephone {
    const session: SessionPointageTelephone = {
      id: this.genererIdUnique(),
      enseignantId,
      codeVerification: this.genererCodeVerification(),
      dateExpiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      utilise: false,
      dateCreation: new Date().toISOString(),
    }

    const sessions = this.obtenirSessionsPointage()
    sessions.push(session)
    this.sauvegarderSessionsPointage(sessions)

    return session
  }

  /**
   * Valide un code de pointage par téléphone
   */
  validerCodePointageTelephone(code: string, enseignantId: string): boolean {
    const sessions = this.obtenirSessionsPointage()
    const session = sessions.find((s) => s.codeVerification === code && s.enseignantId === enseignantId && !s.utilise)

    if (!session || new Date(session.dateExpiration) < new Date()) {
      return false
    }

    // Marquer la session comme utilisée
    session.utilise = true
    this.sauvegarderSessionsPointage(sessions)

    // Enregistrer le pointage
    this.enregistrerPointage({
      enseignantId,
      date: new Date().toISOString().split("T")[0],
      heureArrivee: new Date().toTimeString().split(" ")[0].substring(0, 5),
      statut: "present",
      methodePoinatge: "telephone",
    })

    return true
  }

  // === MÉTHODES PRIVÉES ===

  private obtenirEmploiDuTemps(): CreneauEmploiDuTemps[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_EMPLOI_DU_TEMPS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private obtenirTousLesPointages(): Pointage[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_POINTAGES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private obtenirSessionsPointage(): SessionPointageTelephone[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_SESSIONS_POINTAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private sauvegarderEnseignants(enseignants: DonneesEnseignant[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_ENSEIGNANTS, JSON.stringify(enseignants))
  }

  private sauvegarderEmploiDuTemps(emploiDuTemps: CreneauEmploiDuTemps[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_EMPLOI_DU_TEMPS, JSON.stringify(emploiDuTemps))
  }

  private sauvegarderPointages(pointages: Pointage[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_POINTAGES, JSON.stringify(pointages))
  }

  private sauvegarderSessionsPointage(sessions: SessionPointageTelephone[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_SESSIONS_POINTAGE, JSON.stringify(sessions))
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

  private genererCodeVerification(): string {
    return Math.floor(100000 + Math.random() * 900000).toString() // Code à 6 chiffres
  }
}

// Instance singleton du service
export const serviceEnseignants = new ServiceEnseignants()
