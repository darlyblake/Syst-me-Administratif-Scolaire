const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des paramètres système
 * Contient la logique pour gérer les horaires généraux et autres paramètres
 */

import type { HorairesGeneraux, ParametresEcole } from "@/types/models"

export interface TarificationNiveau {
  niveau: string
  fraisInscription: number
  fraisScolariteAnnuelle: number
  planPaiementId?: string
}

export interface TarificationTypeEcole {
  typeEcole: string
  niveaux: TarificationNiveau[]
}

export interface TarificationClasse {
  classe: string
  fraisInscription: number
  fraisScolariteAnnuelle: number
}

export interface OptionSupplementaire {
  id: string
  nom: string
  prix: number
}

export interface OptionsSupplementaires {
  tenueScolaire: number
  carteScolaire: number
  cooperative: number
  tenueEPS: number
  assurance: number
}

class ServiceParametres {
  private readonly CLE_STOCKAGE_HORAIRES_GENERAUX = "horairesGeneraux"

  /**
   * Récupère tous les horaires généraux
   */
  obtenirHorairesGeneraux(): HorairesGeneraux[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_HORAIRES_GENERAUX)
      return donnees ? JSON.parse(donnees) : this.getHorairesParDefaut()
    } catch {
      return this.getHorairesParDefaut()
    }
  }

  /**
   * Met à jour les horaires généraux
   */
  mettreAJourHorairesGeneraux(horaires: HorairesGeneraux[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_HORAIRES_GENERAUX, JSON.stringify(horaires))
  }

  /**
   * Récupère les horaires pour un jour spécifique
   */
  obtenirHorairesPourJour(jour: HorairesGeneraux["jour"]): HorairesGeneraux | null {
    const horaires = this.obtenirHorairesGeneraux()
    return horaires.find(h => h.jour === jour && h.actif) || null
  }

  /**
   * Génère les créneaux horaires pour un jour donné
   * @param jour Le jour de la semaine
   * @param intervalMinutes Interval entre les créneaux (par défaut 30 minutes)
   */
  genererCreneauxHoraires(
    jour: HorairesGeneraux["jour"],
    intervalMinutes: number = 30
  ): string[] {
    const horairesJour = this.obtenirHorairesPourJour(jour)

    if (!horairesJour) {
      // Si pas d'horaires configurés, retourner les horaires par défaut
      return this.genererCreneauxEntre("07:00", "18:00", intervalMinutes)
    }

    const creneaux: string[] = []

    // Matinée
    const creneauxMatin = this.genererCreneauxEntre(
      horairesJour.heureOuverture,
      horairesJour.pauseDebutMatin || horairesJour.heureFermeture,
      intervalMinutes
    )
    creneaux.push(...creneauxMatin)

    // Après-midi (si pas de pause ou après la pause)
    if (horairesJour.pauseFinApresMidi) {
      const creneauxApresMidi = this.genererCreneauxEntre(
        horairesJour.pauseFinApresMidi,
        horairesJour.heureFermeture,
        intervalMinutes
      )
      creneaux.push(...creneauxApresMidi)
    }

    return creneaux
  }

  /**
   * Génère tous les créneaux horaires pour tous les jours actifs
   */
  genererTousLesCreneaux(intervalMinutes: number = 30): Record<string, string[]> {
    const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const
    const tousLesCreneaux: Record<string, string[]> = {}

    jours.forEach(jour => {
      tousLesCreneaux[jour] = this.genererCreneauxHoraires(jour, intervalMinutes)
    })

    return tousLesCreneaux
  }

  /**
   * Génère les créneaux horaires entre deux heures
   */
  private genererCreneauxEntre(heureDebut: string, heureFin: string, intervalMinutes: number): string[] {
    const creneaux: string[] = []
    const debut = this.convertirHeureEnMinutes(heureDebut)
    const fin = this.convertirHeureEnMinutes(heureFin)

    for (let minutes = debut; minutes < fin; minutes += intervalMinutes) {
      creneaux.push(this.convertirMinutesEnHeure(minutes))
    }

    return creneaux
  }

  /**
   * Convertit une heure HH:MM en minutes depuis minuit
   */
  private convertirHeureEnMinutes(heure: string): number {
    const [heures, minutes] = heure.split(':').map(Number)
    return heures * 60 + minutes
  }

  /**
   * Convertit des minutes depuis minuit en format HH:MM
   */
  private convertirMinutesEnHeure(minutes: number): string {
    const heures = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${heures.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  /**
   * Horaires par défaut (07:00 - 18:00 avec pause déjeuner)
   */
  getHorairesParDefaut(): HorairesGeneraux[] {
    return [
      {
        id: "lundi-default",
        jour: "lundi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "mardi-default",
        jour: "mardi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "mercredi-default",
        jour: "mercredi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "jeudi-default",
        jour: "jeudi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "vendredi-default",
        jour: "vendredi",
        heureOuverture: "07:00",
        heureFermeture: "18:00",
        pauseDebutMatin: "12:00",
        pauseFinMatin: "13:00",
        pauseDebutApresMidi: "13:00",
        pauseFinApresMidi: "14:00",
        actif: true
      },
      {
        id: "samedi-default",
        jour: "samedi",
        heureOuverture: "08:00",
        heureFermeture: "12:00",
        actif: true
      }
    ]
  }

  /**
   * Initialise les horaires par défaut si aucun n'existe
   */
  initialiserHorairesParDefaut(): void {
    const horairesExistants = this.obtenirHorairesGeneraux()
    if (horairesExistants.length === 0) {
      this.mettreAJourHorairesGeneraux(this.getHorairesParDefaut())
    }
  }

  /**
   * Récupère la tarification par type d'école depuis le localStorage
   */
  obtenirTarificationParTypeEcole(): TarificationTypeEcole[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = safeLocalStorage.getItem("tarificationTypesEcole")
        if (stored) {
          return JSON.parse(stored)
        }
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération de la tarification par type d'école:", error)
    }

    // Retourner des données par défaut
    return [
      {
        typeEcole: "Primaire",
        niveaux: [
          { niveau: "1ère année", fraisInscription: 50000, fraisScolariteAnnuelle: 200000 },
          { niveau: "2ème année", fraisInscription: 50000, fraisScolariteAnnuelle: 200000 },
          { niveau: "3ème année", fraisInscription: 50000, fraisScolariteAnnuelle: 250000 },
          { niveau: "4ème année", fraisInscription: 50000, fraisScolariteAnnuelle: 300000 },
          { niveau: "5ème année", fraisInscription: 50000, fraisScolariteAnnuelle: 350000 },
        ]
      },
      {
        typeEcole: "Collège",
        niveaux: [
          { niveau: "6ème", fraisInscription: 75000, fraisScolariteAnnuelle: 400000 },
          { niveau: "5ème", fraisInscription: 75000, fraisScolariteAnnuelle: 400000 },
          { niveau: "4ème", fraisInscription: 75000, fraisScolariteAnnuelle: 450000 },
          { niveau: "3ème", fraisInscription: 75000, fraisScolariteAnnuelle: 450000 },
        ]
      },
      {
        typeEcole: "Lycée",
        niveaux: [
          { niveau: "2nde", fraisInscription: 100000, fraisScolariteAnnuelle: 500000 },
          { niveau: "1ère", fraisInscription: 100000, fraisScolariteAnnuelle: 550000 },
          { niveau: "Terminale", fraisInscription: 100000, fraisScolariteAnnuelle: 600000 },
        ]
      },
      {
        typeEcole: "Université",
        niveaux: [
          { niveau: "L1", fraisInscription: 150000, fraisScolariteAnnuelle: 800000 },
          { niveau: "L2", fraisInscription: 150000, fraisScolariteAnnuelle: 800000 },
          { niveau: "L3", fraisInscription: 150000, fraisScolariteAnnuelle: 800000 },
          { niveau: "M1", fraisInscription: 200000, fraisScolariteAnnuelle: 1000000 },
          { niveau: "M2", fraisInscription: 200000, fraisScolariteAnnuelle: 1000000 },
        ]
      },
      {
        typeEcole: "Centre Professionnel",
        niveaux: [
          { niveau: "CAP1", fraisInscription: 75000, fraisScolariteAnnuelle: 350000 },
          { niveau: "CAP2", fraisInscription: 75000, fraisScolariteAnnuelle: 350000 },
          { niveau: "BEP1", fraisInscription: 75000, fraisScolariteAnnuelle: 400000 },
          { niveau: "BEP2", fraisInscription: 75000, fraisScolariteAnnuelle: 400000 },
          { niveau: "BTS1", fraisInscription: 100000, fraisScolariteAnnuelle: 500000 },
          { niveau: "BTS2", fraisInscription: 100000, fraisScolariteAnnuelle: 500000 },
        ]
      }
    ]
  }

  /**
   * Sauvegarde la tarification par type d'école
   */
  sauvegarderTarificationParTypeEcole(tarification: TarificationTypeEcole[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        safeLocalStorage.setItem("tarificationTypesEcole", JSON.stringify(tarification))
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la tarification par type d'école:", error)
    }
  }

  /**
   * Récupère la tarification par niveau (nom historique conservé pour compatibilité).
   * Les consommateurs existants utilisent encore la propriété `classe`, mais elle
   * contient désormais le nom du niveau sélectionné à l'inscription.
   */
  obtenirTarification(): Array<{ classe: string; fraisInscription: number; fraisScolariteAnnuelle: number }> {
    return this.obtenirTarificationParTypeEcole().flatMap((typeEcole) =>
      typeEcole.niveaux.map((niveau) => ({
        classe: niveau.niveau,
        fraisInscription: niveau.fraisInscription,
        fraisScolariteAnnuelle: niveau.fraisScolariteAnnuelle,
      })),
    )
  }

  /**
   * Récupère les frais pour une classe spécifique
   */
  obtenirFraisClasse(classe: string): { fraisInscription: number; fraisScolariteAnnuelle: number } | null {
    const tarification = this.obtenirTarification()
    const classeTrouvee = tarification.find(t => t.classe === classe)
    return classeTrouvee ? {
      fraisInscription: classeTrouvee.fraisInscription,
      fraisScolariteAnnuelle: classeTrouvee.fraisScolariteAnnuelle
    } : null
  }

  /**
   * Calcule le montant mensuel de scolarité pour une classe
   */
  calculerMontantMensuel(classe: string): number {
    const frais = this.obtenirFraisClasse(classe)
    if (!frais) return 0

    // Diviser par 10 mois (septembre à juin)
    return Math.round(frais.fraisScolariteAnnuelle / 10)
  }

  /**
   * Calcule le montant par tranche pour une classe
   */
  calculerMontantParTranche(classe: string, pourcentage: number): number {
    const frais = this.obtenirFraisClasse(classe)
    if (!frais) return 0

    return Math.round((frais.fraisScolariteAnnuelle * pourcentage) / 100)
  }

  /**
   * Récupère les options supplémentaires depuis le localStorage
   */
  obtenirOptionsSupplementaires(): {
    tenueScolaire: number;
    carteScolaire: number;
    cooperative: number;
    tenueEPS: number;
    assurance: number;
  } {
    try {
      const stored = safeLocalStorage.getItem("optionsSupplementaires")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des options:", error)
    }

    // Retourner des valeurs par défaut vides
    return {
      tenueScolaire: 0,
      carteScolaire: 0,
      cooperative: 0,
      tenueEPS: 0,
      assurance: 0
    }
  }

  /**
   * Récupère les options supplémentaires personnalisées depuis le localStorage
   */
  obtenirOptionsSupplementairesPersonnalisees(): OptionSupplementaire[] {
    try {
      const stored = safeLocalStorage.getItem("optionsSupplementairesPersonnalisees")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des options personnalisées:", error)
    }

    // Retourner un tableau vide si rien n'est stocké
    return []
  }

  /**
   * Sauvegarde les options supplémentaires personnalisées dans le localStorage
   */
  sauvegarderOptionsSupplementairesPersonnalisees(options: OptionSupplementaire[]): void {
    safeLocalStorage.setItem("optionsSupplementairesPersonnalisees", JSON.stringify(options))
  }

  /**
   * Ajoute une nouvelle option supplémentaire personnalisée
   */
  ajouterOptionSupplementaire(nom: string, prix: number): OptionSupplementaire {
    const options = this.obtenirOptionsSupplementairesPersonnalisees()
    const nouvelleOption: OptionSupplementaire = {
      id: `option-${Date.now()}`,
      nom: nom.trim(),
      prix: prix
    }
    options.push(nouvelleOption)
    this.sauvegarderOptionsSupplementairesPersonnalisees(options)
    return nouvelleOption
  }

  /**
   * Supprime une option supplémentaire personnalisée
   */
  supprimerOptionSupplementaire(id: string): void {
    const options = this.obtenirOptionsSupplementairesPersonnalisees()
    const optionsFiltrees = options.filter(option => option.id !== id)
    this.sauvegarderOptionsSupplementairesPersonnalisees(optionsFiltrees)
  }

  /**
   * Met à jour une option supplémentaire personnalisée
   */
  mettreAJourOptionSupplementaire(id: string, nom: string, prix: number): void {
    const options = this.obtenirOptionsSupplementairesPersonnalisees()
    const optionIndex = options.findIndex(option => option.id === id)
    if (optionIndex !== -1) {
      options[optionIndex] = { ...options[optionIndex], nom: nom.trim(), prix: prix }
      this.sauvegarderOptionsSupplementairesPersonnalisees(options)
    }
  }

  /**
   * Récupère les paramètres de l'année académique depuis le localStorage
   */
  obtenirParametres(): ParametresEcole {
    // Essayer de récupérer depuis le localStorage d'abord
    try {
      const stored = safeLocalStorage.getItem("parametresEcole")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des paramètres:", error)
    }

    // Retourner les valeurs par défaut vides
    return {
      anneeAcademique: "",
      dateDebut: "",
      dateFin: "",
      nomEcole: "",
      adresseEcole: "",
      telephoneEcole: "",
      nomDirecteur: "",
      logoUrl: "",
      cachetUrl: "",
      modePaiement: "les_deux"
    }
  }

  /**
   * Sauvegarde les paramètres de l'école dans le localStorage
   */
  sauvegarderParametres(parametres: ParametresEcole): void {
    safeLocalStorage.setItem("parametresEcole", JSON.stringify(parametres))
  }

  /**
   * Sauvegarde la tarification dans le localStorage
   */
  sauvegarderTarification(tarification: TarificationClasse[]): void {
    safeLocalStorage.setItem("tarificationClasses", JSON.stringify(tarification))
  }

  /**
   * Sauvegarde les options supplémentaires dans le localStorage
   */
  sauvegarderOptionsSupplementaires(options: OptionsSupplementaires): void {
    safeLocalStorage.setItem("optionsSupplementaires", JSON.stringify(options))
  }

  /**
   * Récupère les paramètres de paiement depuis le localStorage
   */
  obtenirParametresPaiement(): { datePaiementMensuel: number; tranchesPaiement: any[]; tauxHoraireParDefaut: number } {
    try {
      const stored = safeLocalStorage.getItem("parametresPaiement")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des paramètres de paiement:", error)
    }

    // Retourner les valeurs par défaut vides
    return {
      datePaiementMensuel: 5,
      tranchesPaiement: [],
      tauxHoraireParDefaut: 5000
    }
  }

  /**
   * Sauvegarde les paramètres de paiement dans le localStorage
   */
  sauvegarderParametresPaiement(parametres: { datePaiementMensuel: number; tranchesPaiement: any[]; tauxHoraireParDefaut: number }): void {
    safeLocalStorage.setItem("parametresPaiement", JSON.stringify(parametres))
  }

  /**
   * Récupère les frais d'inscription global de l'établissement
   */
  obtenirFraisInscriptionEtablissement(): number {
    try {
      const stored = safeLocalStorage.getItem("fraisInscriptionEtablissement")
      return stored ? Number(stored) : 0
    } catch (error) {
      console.warn("Erreur lors de la récupération des frais d'inscription:", error)
      return 0
    }
  }

  /**
   * Récupère les frais de réinscription global de l'établissement
   */
  obtenirFraisReinscriptionEtablissement(): number {
    try {
      const stored = safeLocalStorage.getItem("fraisReinscriptionEtablissement")
      return stored ? Number(stored) : 0
    } catch (error) {
      console.warn("Erreur lors de la récupération des frais de réinscription:", error)
      return 0
    }
  }

  /**
   * Sauvegarde les frais d'inscription global de l'établissement
   */
  sauvegarderFraisInscriptionEtablissement(montant: number): void {
    safeLocalStorage.setItem("fraisInscriptionEtablissement", String(montant))
  }

  /**
   * Sauvegarde les frais de réinscription global de l'établissement
   */
  sauvegarderFraisReinscriptionEtablissement(montant: number): void {
    safeLocalStorage.setItem("fraisReinscriptionEtablissement", String(montant))
  }

  /**
   * Réinitialise les paramètres aux valeurs par défaut
   */
  reinitialiserParametres(): void {
    safeLocalStorage.removeItem("parametresEcole")
    safeLocalStorage.removeItem("tarificationClasses")
    safeLocalStorage.removeItem("optionsSupplementaires")
    safeLocalStorage.removeItem("optionsSupplementairesPersonnalisees")
    safeLocalStorage.removeItem("parametresPaiement")
    safeLocalStorage.removeItem("fraisInscriptionEtablissement")
    safeLocalStorage.removeItem("fraisReinscriptionEtablissement")
  }
}

// Instance singleton du service
export const serviceParametres = new ServiceParametres()
