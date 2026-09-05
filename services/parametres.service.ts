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
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirTarificationParTypeEcole(): TarificationTypeEcole[] {
    return []
  }

  /**
   * Sauvegarde la tarification par type d'école
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderTarificationParTypeEcole(_tarification: TarificationTypeEcole[]): void {
    // Ne fait rien - les données doivent être gérées via Supabase
  }

  /**
   * Récupère la tarification par niveau (nom historique conservé pour compatibilité).
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirTarification(): Array<{ classe: string; fraisInscription: number; fraisScolariteAnnuelle: number }> {
    return []
  }

  /**
   * Récupère les frais pour une classe spécifique
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirFraisClasse(_classe: string): { fraisInscription: number; fraisScolariteAnnuelle: number } | null {
    return null
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
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useAcademicYears) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirParametres(): ParametresEcole {
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
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useEstablishment) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderParametres(_parametres: ParametresEcole): void {
    // Ne fait rien - les données doivent être gérées via Supabase
  }

  /**
   * Sauvegarde la tarification dans le localStorage
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderTarification(_tarification: TarificationClasse[]): void {
    // Ne fait rien - les données doivent être gérées via Supabase
  }

  /**
   * Sauvegarde les options supplémentaires dans le localStorage
   */
  sauvegarderOptionsSupplementaires(options: OptionsSupplementaires): void {
    safeLocalStorage.setItem("optionsSupplementaires", JSON.stringify(options))
  }

  /**
   * Récupère les paramètres de paiement depuis le localStorage
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirParametresPaiement(): { datePaiementMensuel: number; tranchesPaiement: any[]; tauxHoraireParDefaut: number } {
    return {
      datePaiementMensuel: 5,
      tranchesPaiement: [],
      tauxHoraireParDefaut: 5000
    }
  }

  /**
   * Sauvegarde les paramètres de paiement dans le localStorage
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderParametresPaiement(_parametres: { datePaiementMensuel: number; tranchesPaiement: any[]; tauxHoraireParDefaut: number }): void {
    // Ne fait rien - les données doivent être gérées via Supabase
  }

  /**
   * Récupère les frais d'inscription global de l'établissement
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirFraisInscriptionEtablissement(): number {
    return 0
  }

  /**
   * Récupère les frais de réinscription global de l'établissement
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  obtenirFraisReinscriptionEtablissement(): number {
    return 0
  }

  /**
   * Sauvegarde les frais d'inscription global de l'établissement
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderFraisInscriptionEtablissement(_montant: number): void {
    // Ne fait rien - les données doivent être gérées via Supabase
  }

  /**
   * Sauvegarde les frais de réinscription global de l'établissement
   * NOTE: Cette fonction est obsolète. Utilisez Supabase (useTuitionPlans) comme source de vérité.
   * Conservée pour compatibilité uniquement.
   */
  sauvegarderFraisReinscriptionEtablissement(_montant: number): void {
    // Ne fait rien - les données doivent être gérées via Supabase
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
