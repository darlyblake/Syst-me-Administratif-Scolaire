import type { DonneesEleve } from "@/types/models"

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
  private readonly CLE_PARAMETRES = "parametres_ecole"
  private readonly CLE_TARIFICATION = "tarification_classes"
  private readonly CLE_OPTIONS_SUPP = "options_supplementaires"

  // Paramètres par défaut
  private parametresDefaut: ParametresEcole = {
    anneeAcademique: "2024-2025",
    dateDebut: "2024-09-01",
    dateFin: "2025-07-31",
    nomEcole: "COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO",
    adresseEcole: "B.P: 16109 Estuaire, Owendo",
    telephoneEcole: "077947410",
    nomDirecteur: "M. DIRECTEUR",
    modePaiement: "les_deux",
  }

  // Tarification par défaut
  private tarificationDefaut: TarificationClasse[] = [
    { classe: "Maternelle", fraisInscription: 25000, fraisScolarite: 150000 },
    { classe: "CP1", fraisInscription: 30000, fraisScolarite: 180000 },
    { classe: "CP2", fraisInscription: 30000, fraisScolarite: 180000 },
    { classe: "CE1", fraisInscription: 35000, fraisScolarite: 200000 },
    { classe: "CE2", fraisInscription: 35000, fraisScolarite: 200000 },
    { classe: "CM1", fraisInscription: 40000, fraisScolarite: 220000 },
    { classe: "CM2", fraisInscription: 40000, fraisScolarite: 220000 },
    { classe: "6ème", fraisInscription: 50000, fraisScolarite: 300000 },
    { classe: "5ème", fraisInscription: 50000, fraisScolarite: 300000 },
    { classe: "4ème", fraisInscription: 55000, fraisScolarite: 320000 },
    { classe: "3ème", fraisInscription: 55000, fraisScolarite: 320000 },
    { classe: "2nde L", fraisInscription: 60000, fraisScolarite: 350000 },
    { classe: "2nde S", fraisInscription: 60000, fraisScolarite: 350000 },
    { classe: "1ère A1", fraisInscription: 65000, fraisScolarite: 380000 },
    { classe: "1ère A2", fraisInscription: 65000, fraisScolarite: 380000 },
    { classe: "1ère B", fraisInscription: 65000, fraisScolarite: 380000 },
    { classe: "Terminale A1", fraisInscription: 70000, fraisScolarite: 400000 },
    { classe: "Terminale B", fraisInscription: 70000, fraisScolarite: 400000 },
    { classe: "Terminale D", fraisInscription: 70000, fraisScolarite: 400000 },
    { classe: "Terminale S", fraisInscription: 70000, fraisScolarite: 400000 },
  ]

  // Options supplémentaires par défaut
  private optionsSupplementairesDefaut: OptionsSupplementaires = {
    tenueScolaire: 15000,
    carteScolaire: 5000,
    cooperative: 10000,
    tenueEPS: 8000,
    assurance: 12000,
  }

  // Obtenir les paramètres de l'école
  obtenirParametres(): ParametresEcole {
    try {
      const parametresStockes = localStorage.getItem(this.CLE_PARAMETRES)
      if (parametresStockes) {
        return { ...this.parametresDefaut, ...JSON.parse(parametresStockes) }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres:", error)
    }
    return this.parametresDefaut
  }

  // Sauvegarder les paramètres de l'école
  sauvegarderParametres(parametres: ParametresEcole): void {
    try {
      localStorage.setItem(this.CLE_PARAMETRES, JSON.stringify(parametres))
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres:", error)
      throw new Error("Impossible de sauvegarder les paramètres")
    }
  }

  // Obtenir la tarification par classe
  obtenirTarification(): TarificationClasse[] {
    try {
      const tarificationStockee = localStorage.getItem(this.CLE_TARIFICATION)
      if (tarificationStockee) {
        return JSON.parse(tarificationStockee)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la tarification:", error)
    }
    return this.tarificationDefaut
  }

  // Sauvegarder la tarification par classe
  sauvegarderTarification(tarification: TarificationClasse[]): void {
    try {
      localStorage.setItem(this.CLE_TARIFICATION, JSON.stringify(tarification))
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la tarification:", error)
      throw new Error("Impossible de sauvegarder la tarification")
    }
  }

  // Obtenir les frais pour une classe spécifique
  obtenirFraisClasse(classe: string): TarificationClasse | undefined {
    const tarification = this.obtenirTarification()
    return tarification.find(t => t.classe === classe)
  }

  // Calculer le total à payer pour un élève
  calculerTotalAPayer(eleve: DonneesEleve): number {
    const fraisClasse = this.obtenirFraisClasse(eleve.classe)
    if (!fraisClasse) return 0

    const fraisInscription = eleve.typeInscription === "reinscription"
      ? fraisClasse.fraisInscription * 0.5 // Réduction de 50% pour réinscription
      : fraisClasse.fraisInscription

    return fraisInscription + fraisClasse.fraisScolarite
  }

  // Obtenir les options supplémentaires
  obtenirOptionsSupplementaires(): OptionsSupplementaires {
    try {
      const optionsStockees = localStorage.getItem(this.CLE_OPTIONS_SUPP)
      if (optionsStockees) {
        return JSON.parse(optionsStockees)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des options supplémentaires:", error)
    }
    return this.optionsSupplementairesDefaut
  }

  // Sauvegarder les options supplémentaires
  sauvegarderOptionsSupplementaires(options: OptionsSupplementaires): void {
    try {
      localStorage.setItem(this.CLE_OPTIONS_SUPP, JSON.stringify(options))
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des options supplémentaires:", error)
      throw new Error("Impossible de sauvegarder les options supplémentaires")
    }
  }

  // Réinitialiser tous les paramètres
  reinitialiserParametres(): void {
    try {
      localStorage.removeItem(this.CLE_PARAMETRES)
      localStorage.removeItem(this.CLE_TARIFICATION)
      localStorage.removeItem(this.CLE_OPTIONS_SUPP)
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error)
      throw new Error("Impossible de réinitialiser les paramètres")
    }
  }
}

export const serviceParametres = new ServiceParametres()
