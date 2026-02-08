/**
 * Service de gestion des enseignants
 * Contient toute la logique métier liée aux enseignants
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

class ServiceEnseignants {
  private readonly CLE_STOCKAGE_ENSEIGNANTS = "enseignants"
  private readonly CLE_STOCKAGE_EMPLOI_DU_TEMPS = "emploiDuTemps"
  private readonly CLE_STOCKAGE_POINTAGES = "pointages"
  private readonly CLE_STOCKAGE_SESSIONS_POINTAGE = "sessionsPointage"
  private readonly CLE_STOCKAGE_HISTORIQUE_AFFECTATIONS = "historiqueAffectations"
  private readonly CLE_STOCKAGE_DOCUMENTS_ADMINISTRATIFS = "documentsAdministratifs"
  private readonly CLE_STOCKAGE_CONTACTS = "contacts"
  private readonly CLE_STOCKAGE_AFFECTATIONS_NOTIFICATIONS = "affectationsNotifications"

  /**
   * Récupère tous les enseignants
   */
  obtenirTousLesEnseignants(): DonneesEnseignant[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_ENSEIGNANTS)
      if (!donnees) {
        return []
      }

      const parsedData = JSON.parse(donnees)

      // S'assurer que les données analysées sont toujours un tableau
      if (!Array.isArray(parsedData)) {
        console.warn('Données enseignants corrompues dans localStorage, réinitialisation à un tableau vide')
        return []
      }

      return parsedData
    } catch (error) {
      console.error('Erreur lors de la récupération des enseignants:', error)
      return []
    }
  }

  /**
   * Récupère un enseignant par son identifiant
   */
  obtenirEnseignantParIdentifiant(identifiant: string): DonneesEnseignant | null {
    const enseignants = this.obtenirTousLesEnseignants()
    return enseignants.find(e => e.identifiant === identifiant) || null
  }

  /**
   * Ajoute un nouvel enseignant avec identifiants générés automatiquement
   */
  ajouterEnseignant(enseignant: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): DonneesEnseignant {
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

  // === GESTION DES SALAIRES ===

  /**
   * Calcule le nombre d'heures d'enseignement pour un enseignant dans une période donnée
   */
  calculerHeuresEnseignement(enseignantId: string, mois?: number, annee?: number): number {
    const creneaux = this.obtenirEmploiDuTempsEnseignant(enseignantId)
    let heuresTotales = 0

    creneaux.forEach(creneau => {
      // Si une période spécifique est demandée, filtrer par mois/année
      if (mois !== undefined && annee !== undefined) {
        const dateCreneau = new Date(creneau.id.split('-')[0]) // Approximation basée sur l'ID
        if (dateCreneau.getMonth() + 1 !== mois || dateCreneau.getFullYear() !== annee) {
          return
        }
      }

      // Calculer la durée du créneau
      const heureDebut = this.convertirHeureEnMinutes(creneau.heureDebut)
      const heureFin = this.convertirHeureEnMinutes(creneau.heureFin)
      const dureeMinutes = heureFin - heureDebut
      const dureeHeures = dureeMinutes / 60

      heuresTotales += dureeHeures
    })

    return Math.round(heuresTotales * 100) / 100 // Arrondi à 2 décimales
  }

  /**
   * Calcule le salaire d'un enseignant pour une période donnée
   */
  calculerSalaireEnseignant(enseignantId: string, mois?: number, annee?: number): {
    salaireBase: number
    heuresTravaillees: number
    typeContrat: string
    details: string
  } {
    const enseignant = this.obtenirTousLesEnseignants().find(e => e.id === enseignantId)
    if (!enseignant) {
      throw new Error("Enseignant non trouvé")
    }

    const heuresTravaillees = this.calculerHeuresEnseignement(enseignantId, mois, annee)

    let salaireBase = 0
    let details = ""

    switch (enseignant.typeContrat) {
      case "vacataire":
        if (enseignant.tauxHoraire) {
          salaireBase = heuresTravaillees * enseignant.tauxHoraire
          details = `${heuresTravaillees}h × ${enseignant.tauxHoraire}€/h = ${salaireBase}€`
        }
        break

      case "cdi":
        if (enseignant.salaireMensuel) {
          // Pour les CDI, le salaire est fixe mais on peut calculer les heures supplémentaires
          const heuresContractuelles = enseignant.heuresContractuelles || 160
          if (heuresTravaillees > heuresContractuelles) {
            const heuresSupplementaires = heuresTravaillees - heuresContractuelles
            const tauxHoraire = enseignant.salaireMensuel / heuresContractuelles
            const supplement = heuresSupplementaires * tauxHoraire * 1.25 // 25% de majoration
            salaireBase = enseignant.salaireMensuel + supplement
            details = `${enseignant.salaireMensuel}€ + ${heuresSupplementaires}h supp. = ${salaireBase}€`
          } else {
            salaireBase = enseignant.salaireMensuel
            details = `Salaire fixe: ${salaireBase}€`
          }
        }
        break

      default:
        details = "Type de contrat non supporté"
    }

    return {
      salaireBase: Math.round(salaireBase * 100) / 100,
      heuresTravaillees,
      typeContrat: enseignant.typeContrat,
      details
    }
  }

  /**
   * Met à jour les informations salariales d'un enseignant
   */
  mettreAJourInformationsSalariales(enseignantId: string, infosSalariales: {
    typeContrat?: "cdi" | "cdd" | "vacataire" | "consultant"
    salaireMensuel?: number
    tauxHoraire?: number
    heuresContractuelles?: number
  }): boolean {
    const enseignants = this.obtenirTousLesEnseignants()
    const index = enseignants.findIndex(e => e.id === enseignantId)

    if (index === -1) return false

    // Enregistrer l'ancienne valeur pour l'historique
    const ancienTypeContrat = enseignants[index].typeContrat

    // Mettre à jour l'enseignant manuellement pour éviter les conflits
    const updates: Partial<DonneesEnseignant> = {}
    if (infosSalariales.salaireMensuel !== undefined) {
      updates.salaireMensuel = infosSalariales.salaireMensuel
    }
    if (infosSalariales.tauxHoraire !== undefined) {
      updates.tauxHoraire = infosSalariales.tauxHoraire
    }
    if (infosSalariales.heuresContractuelles !== undefined) {
      updates.heuresContractuelles = infosSalariales.heuresContractuelles
    }
    if (infosSalariales.typeContrat !== undefined) {
      updates.typeContrat = infosSalariales.typeContrat
    }

    Object.assign(enseignants[index], updates)

    // Enregistrer dans l'historique des affectations
    const nouvelleValeurTypeContrat = infosSalariales.typeContrat !== null && infosSalariales.typeContrat !== undefined ? infosSalariales.typeContrat : ancienTypeContrat
    this.enregistrerAffectationHistorique({
      enseignantId,
      type: "salaire",
      ancienneValeur: ancienTypeContrat,
      nouvelleValeur: nouvelleValeurTypeContrat,
      motif: "Modification des informations salariales"
    })

    this.sauvegarderEnseignants(enseignants)
    return true
  }

  /**
   * Génère un rapport de salaire mensuel pour tous les enseignants
   */
  genererRapportSalaireMensuel(mois: number, annee: number): {
    enseignants: {
      id: string
      nom: string
      prenom: string
      typeContrat: string
      salaireBase: number
      heuresTravaillees: number
      details: string
    }[]
    totaux: {
      salaireTotal: number
      heuresTotales: number
      nombreEnseignants: number
    }
  } {
    const enseignants = this.obtenirTousLesEnseignants()
      .filter(e => e.statut === "actif")

    const rapport = enseignants.map(enseignant => {
      const calcul = this.calculerSalaireEnseignant(enseignant.id, mois, annee)
      return {
        id: enseignant.id,
        nom: enseignant.nom,
        prenom: enseignant.prenom,
        typeContrat: enseignant.typeContrat,
        ...calcul
      }
    })

    const totaux = rapport.reduce(
      (acc, e) => ({
        salaireTotal: acc.salaireTotal + e.salaireBase,
        heuresTotales: acc.heuresTotales + e.heuresTravaillees,
        nombreEnseignants: acc.nombreEnseignants + 1
      }),
      { salaireTotal: 0, heuresTotales: 0, nombreEnseignants: 0 }
    )

    return { enseignants: rapport, totaux }
  }

  // === MÉTHODES PRIVÉES UTILITAIRES ===

  /**
   * Convertit une heure au format HH:MM en minutes
   */
  private convertirHeureEnMinutes(heure: string): number {
    const [heures, minutes] = heure.split(':').map(Number)
    return heures * 60 + minutes
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

  // === NOUVELLES FONCTIONNALITÉS ===

  /**
   * Envoie un message à un enseignant
   */
  contacterEnseignant(contact: Omit<Contact, "id" | "dateEnvoi" | "envoyePar">): Contact {
    const nouveauContact: Contact = {
      ...contact,
      id: this.genererIdUnique(),
      dateEnvoi: new Date().toISOString(),
      envoyePar: "admin", // À remplacer par l'ID de l'administrateur connecté
    }

    const contacts = this.obtenirTousLesContacts()
    contacts.push(nouveauContact)
    this.sauvegarderContacts(contacts)

    return nouveauContact
  }

  /**
   * Récupère l'historique des affectations d'un enseignant
   */
  obtenirHistoriqueAffectations(enseignantId: string): HistoriqueAffectation[] {
    const historique = this.obtenirToutHistoriqueAffectations()
    return historique
      .filter(h => h.enseignantId === enseignantId)
      .sort((a, b) => b.dateModification.localeCompare(a.dateModification))
  }

  /**
   * Enregistre une nouvelle affectation dans l'historique
   */
  enregistrerAffectationHistorique(affectation: Omit<HistoriqueAffectation, "id" | "dateModification" | "modifiePar">): HistoriqueAffectation {
    const nouvelleAffectation: HistoriqueAffectation = {
      ...affectation,
      id: this.genererIdUnique(),
      dateModification: new Date().toISOString(),
      modifiePar: "admin", // À remplacer par l'ID de l'administrateur connecté
    }

    const historique = this.obtenirToutHistoriqueAffectations()
    historique.push(nouvelleAffectation)
    this.sauvegarderHistoriqueAffectations(historique)

    return nouvelleAffectation
  }

  /**
   * Gère les documents administratifs d'un enseignant
   */
  gererDocumentsAdministratifs(enseignantId: string): DocumentAdministratif[] {
    return this.obtenirTousLesDocumentsAdministratifs()
      .filter(doc => doc.enseignantId === enseignantId && doc.statut === "actif")
  }

  /**
   * Ajoute un document administratif
   */
  ajouterDocumentAdministratif(document: Omit<DocumentAdministratif, "id" | "dateAjout" | "ajoutePar">): DocumentAdministratif {
    const nouveauDocument: DocumentAdministratif = {
      ...document,
      id: this.genererIdUnique(),
      dateAjout: new Date().toISOString(),
      ajoutePar: "admin", // À remplacer par l'ID de l'administrateur connecté
    }

    const documents = this.obtenirTousLesDocumentsAdministratifs()
    documents.push(nouveauDocument)
    this.sauvegarderDocumentsAdministratifs(documents)

    return nouveauDocument
  }

  /**
   * Attribue une notification à un enseignant
   */
  attribuerNotification(affectation: Omit<AffectationNotification, "id" | "dateAffectation" | "affectePar">): AffectationNotification {
    const nouvelleAffectation: AffectationNotification = {
      ...affectation,
      id: this.genererIdUnique(),
      dateAffectation: new Date().toISOString(),
      affectePar: "admin", // À remplacer par l'ID de l'administrateur connecté
    }

    const affectations = this.obtenirToutesLesAffectationsNotifications()
    affectations.push(nouvelleAffectation)
    this.sauvegarderAffectationsNotifications(affectations)

    return nouvelleAffectation
  }

  /**
   * Récupère les notifications affectées à un enseignant
   */
  obtenirNotificationsEnseignant(enseignantId: string): AffectationNotification[] {
    const affectations = this.obtenirToutesLesAffectationsNotifications()
    return affectations
      .filter(a => a.enseignantId === enseignantId)
      .sort((a, b) => b.dateAffectation.localeCompare(a.dateAffectation))
  }



  // === MÉTHODES PRIVÉES POUR LES NOUVELLES FONCTIONNALITÉS ===

  private obtenirToutHistoriqueAffectations(): HistoriqueAffectation[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_HISTORIQUE_AFFECTATIONS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private obtenirTousLesDocumentsAdministratifs(): DocumentAdministratif[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_DOCUMENTS_ADMINISTRATIFS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private obtenirTousLesContacts(): Contact[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_CONTACTS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private obtenirToutesLesAffectationsNotifications(): AffectationNotification[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_AFFECTATIONS_NOTIFICATIONS)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  private sauvegarderHistoriqueAffectations(historique: HistoriqueAffectation[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_HISTORIQUE_AFFECTATIONS, JSON.stringify(historique))
  }

  private sauvegarderDocumentsAdministratifs(documents: DocumentAdministratif[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_DOCUMENTS_ADMINISTRATIFS, JSON.stringify(documents))
  }

  private sauvegarderContacts(contacts: Contact[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_CONTACTS, JSON.stringify(contacts))
  }

  private sauvegarderAffectationsNotifications(affectations: AffectationNotification[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_AFFECTATIONS_NOTIFICATIONS, JSON.stringify(affectations))
  }

  /**
   * Marque un document administratif comme envoyé
   */
  envoyerDocumentAdministratif(documentId: string): boolean {
    const documents = this.obtenirTousLesDocumentsAdministratifs()
    const index = documents.findIndex(doc => doc.id === documentId)
    if (index === -1) return false

    documents[index] = {
      ...documents[index],
      envoye: true,
      dateEnvoi: new Date().toISOString(),
    }
    this.sauvegarderDocumentsAdministratifs(documents)
    return true
  }
}

// Instance singleton du service
export const serviceEnseignants = new ServiceEnseignants()
