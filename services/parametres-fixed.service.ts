/**
 * Service de gestion des paramètres système
 * Contient la logique pour gérer les horaires généraux et autres paramètres
 */

import type { HorairesGeneraux } from "@/types/models"

// Types pour les paramètres de l'école
export interface ParametresEcole {
  anneeAcademique: string
  dateDebut: string
  dateFin: string
  nomEcole: string
  adresseEcole: string
  telephoneEcole: string
  nomDirecteur: string
  modePaiement: "mensuel" | "trimestriel" | "les_deux"
}

export interface TarificationClasse {
  classe: string
  fraisInscription: number
  fraisScolarite: number
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
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_HORAIRES_GENERAUX)
      return donnees ? JSON.parse(donnees) : this.getHorairesParDefaut()
    } catch {
      return this.getHorairesParDefaut()
    }
  }

  /**
   * Met à jour les horaires généraux
   */
  mettreAJourHorairesGeneraux(horaires: HorairesGeneraux[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_HORAIRES_GENERAUX, JSON.stringify(horaires))
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
   * Récupère la tarification par classe
   */
  obtenirTarification(): Array<{ classe: string; fraisInscription: number; fraisScolarite: number }> {
    return [
      { classe: "CP", fraisInscription: 50000, fraisScolarite: 150000 },
      { classe: "CE1", fraisInscription: 50000, fraisScolarite: 150000 },
      { classe: "CE2", fraisInscription: 50000, fraisScolarite: 150000 },
      { classe: "CM1", fraisInscription: 50000, fraisScolarite: 150000 },
      { classe: "CM2", fraisInscription: 50000, fraisScolarite: 150000 },
      { classe: "6ème", fraisInscription: 75000, fraisScolarite: 200000 },
      { classe: "5ème", fraisInscription: 75000, fraisScolarite: 200000 },
      { classe: "4ème", fraisInscription: 75000, fraisScolarite: 200000 },
      { classe: "3ème", fraisInscription: 75000, fraisScolarite: 200000 },
      { classe: "2nde", fraisInscription: 100000, fraisScolarite: 250000 },
      { classe: "1ère", fraisInscription: 100000, fraisScolarite: 250000 },
      { classe: "Terminale", fraisInscription: 100000, fraisScolarite: 250000 }
    ]
  }

  /**
   * Récupère les frais pour une classe spécifique
   */
  obtenirFraisClasse(classe: string): { fraisInscription: number; fraisScolarite: number } | null {
    const tarification = this.obtenirTarification()
    const classeTrouvee = tarification.find(t => t.classe === classe)
    return classeTrouvee ? {
      fraisInscription: classeTrouvee.fraisInscription,
      fraisScolarite: classeTrouvee.fraisScolarite
    } : null
  }

  /**
   * Récupère les options supplémentaires disponibles
   */
  obtenirOptionsSupplementaires(): {
    tenueScolaire: number;
    carteScolaire: number;
    cooperative: number;
    tenueEPS: number;
    assurance: number;
  } {
    return {
      tenueScolaire: 25000,
      carteScolaire: 5000,
      cooperative: 15000,
      tenueEPS: 20000,
      assurance: 10000
    }
  }

  /**
   * Récupère les paramètres de l'année académique
   */
  obtenirParametres(): ParametresEcole {
    // Essayer de récupérer depuis le localStorage d'abord
    try {
      const stored = localStorage.getItem("parametresEcole")
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn("Erreur lors de la récupération des paramètres:", error)
    }

    // Retourner les valeurs par défaut
    return {
      anneeAcademique: "2024-2025",
      dateDebut: "2024-09-01",
      dateFin: "2025-07-31",
      nomEcole: "COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO",
      adresseEcole: "B.P: 16109 Estuaire, Owendo",
      telephoneEcole: "077947410",
      nomDirecteur: "M. DIRECTEUR",
      modePaiement: "les_deux"
    }
  }

  /**
   * Sauvegarde les paramètres de l'école
   */
  sauvegarderParametres(parametres: ParametresEcole): void {
    localStorage.setItem("parametresEcole", JSON.stringify(parametres))
  }

  /**
   * Sauvegarde la tarification
   */
  sauvegarderTarification(tarification: TarificationClasse[]): void {
    localStorage.setItem("tarificationClasses", JSON.stringify(tarification))
  }

  /**
   * Sauvegarde les options supplémentaires
   */
  sauvegarderOptionsSupplementaires(options: OptionsSupplementaires): void {
    localStorage.setItem("optionsSupplementaires", JSON.stringify(options))
  }

  /**
   * Réinitialise les paramètres aux valeurs par défaut
   */
  reinitialiserParametres(): void {
    localStorage.removeItem("parametresEcole")
    localStorage.removeItem("tarificationClasses")
    localStorage.removeItem("optionsSupplementaires")
  }
}

// Instance singleton du service
export const serviceParametres = new ServiceParametres()
