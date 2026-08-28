const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion de la paie du personnel
 * Contient toute la logique métier liée à la paie
 */

import { serviceComptabiliteCentralisee } from "./comptabilite-centralisee.service"
import { serviceComptabiliteFacade } from "./comptabilite-facade.service"

export interface Employe {
  id: string
  nom: string
  prenom: string
  poste: string
  typeContrat: "permanent" | "horaire" | "journalier"
  typeRemuneration: "mensuel" | "horaire" | "journalier"
  tauxHoraire?: number
  tauxJournalier?: number
  salaireMensuel?: number
  dateEmbauche: string
  statut: "actif" | "inactif" | "conge" | "suspendu"
  informationsBancaires?: {
    banque: string
    numeroCompte: string
  }
}

export interface FichePaie {
  id: string
  employeId: string
  periodeDebut: string
  periodeFin: string
  salaireBase: number
  primes: number
  deductions: number
  heuresSupplementaires?: number
  tauxHeuresSup?: number
  montantHeuresSup?: number
  netAPayer: number
  dateGeneration: string
  statut: "brouillon" | "valide" | "paye"
}

export interface HeureSupplementaire {
  id: string
  employeId: string
  date: string
  heures: number
  taux: number // 1.25, 1.5, 2
  montant: number
  motif: string
  validee: boolean
}

export interface Conge {
  id: string
  employeId: string
  type: "paye" | "sans_solde" | "maladie"
  dateDebut: string
  dateFin: string
  jours: number
  statut: "en_attente" | "valide" | "refuse"
}

class ServicePaie {
  private readonly CLE_STOCKAGE_EMPLOYES = "employes"
  private readonly CLE_STOCKAGE_FICHES = "fiches_paie"
  private readonly CLE_STOCKAGE_HEURES_SUP = "heures_sup"
  private readonly CLE_STOCKAGE_CONGES = "conges"

  /**
   * Récupère tous les employés
   */
  obtenirTousLesEmployes(): Employe[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_EMPLOYES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les employés
   */
  private sauvegarderEmployes(employes: Employe[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_EMPLOYES, JSON.stringify(employes))
  }

  /**
   * Ajoute un employé
   */
  ajouterEmploye(employe: Omit<Employe, "id">): Employe {
    const employes = this.obtenirTousLesEmployes()
    const nouvelEmploye: Employe = {
      ...employe,
      id: `emp-${Date.now()}`
    }
    employes.push(nouvelEmploye)
    this.sauvegarderEmployes(employes)
    return nouvelEmploye
  }

  /**
   * Modifie un employé
   */
  modifierEmploye(id: string, employeModifie: Partial<Employe>): boolean {
    const employes = this.obtenirTousLesEmployes()
    const index = employes.findIndex(e => e.id === id)
    if (index === -1) return false
    
    employes[index] = { ...employes[index], ...employeModifie }
    this.sauvegarderEmployes(employes)
    return true
  }

  /**
   * Supprime un employé
   */
  supprimerEmploye(id: string): boolean {
    const employes = this.obtenirTousLesEmployes()
    const nouveauEmployes = employes.filter(e => e.id !== id)
    if (nouveauEmployes.length === employes.length) return false
    
    this.sauvegarderEmployes(nouveauEmployes)
    return true
  }

  /**
   * Récupère toutes les fiches de paie
   */
  obtenirToutesLesFiches(): FichePaie[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_FICHES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les fiches de paie
   */
  private sauvegarderFiches(fiches: FichePaie[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE_FICHES, JSON.stringify(fiches))
  }

  /**
   * Génère une fiche de paie pour un employé
   */
  genererFichePaie(employeId: string, periodeDebut: string, periodeFin: string): FichePaie {
    const employe = this.obtenirTousLesEmployes().find(e => e.id === employeId)
    if (!employe) {
      throw new Error("Employé non trouvé")
    }

    let salaireBase = 0
    
    if (employe.typeContrat === "permanent" && employe.salaireMensuel) {
      salaireBase = employe.salaireMensuel
    } else if (employe.typeContrat === "horaire" && employe.tauxHoraire) {
      // Pour les horaires, on suppose 160h par mois (40h/semaine * 4 semaines)
      salaireBase = employe.tauxHoraire * 160
    } else if (employe.typeContrat === "journalier" && employe.tauxJournalier) {
      // Pour les journaliers, on suppose 22 jours par mois
      salaireBase = employe.tauxJournalier * 22
    }

    // Calcul des heures supplémentaires
    const heuresSup = this.obtenirHeuresSupplementairesPeriode(employeId, periodeDebut, periodeFin)
    const montantHeuresSup = heuresSup.reduce((total: number, h: HeureSupplementaire) => total + h.montant, 0)

    // Primes par défaut (peuvent être personnalisées)
    const primes = 0

    // Déductions par défaut (peuvent être personnalisées)
    const deductions = 0

    const netAPayer = salaireBase + primes + montantHeuresSup - deductions

    const fiche: FichePaie = {
      id: `fiche-${Date.now()}`,
      employeId,
      periodeDebut,
      periodeFin,
      salaireBase,
      primes,
      deductions,
      heuresSupplementaires: heuresSup.reduce((total: number, h: HeureSupplementaire) => total + h.heures, 0),
      tauxHeuresSup: 1.25,
      montantHeuresSup,
      netAPayer,
      dateGeneration: new Date().toISOString(),
      statut: "brouillon"
    }

    const fiches = this.obtenirToutesLesFiches()
    fiches.push(fiche)
    this.sauvegarderFiches(fiches)

    return fiche
  }

  /**
   * Marque une fiche de paie comme payée et enregistre la transaction
   */
  marquerFicheCommePayee(ficheId: string): void {
    const fiches = this.obtenirToutesLesFiches()
    const fiche = fiches.find(f => f.id === ficheId)
    
    if (fiche) {
      fiche.statut = "paye"
      this.sauvegarderFiches(fiches)
      
      // Enregistrer la transaction via le service centralisé
      const employe = this.obtenirTousLesEmployes().find(e => e.id === fiche.employeId)
      if (employe) {
        serviceComptabiliteCentralisee.enregistrerSalaire(
          `${employe.prenom} ${employe.nom}`,
          employe.poste,
          fiche.netAPayer,
          new Date().toISOString().split('T')[0],
          employe.id
        )

        serviceComptabiliteFacade.enregistrerTransaction({
          type: "sortie",
          categorie: "Salaire",
          description: `Salaire ${employe.prenom} ${employe.nom}`,
          montant: fiche.netAPayer,
          date: new Date().toISOString().split('T')[0],
          reference: `Salaire #${fiche.id}`,
          statut: "payee",
          source: "salaire",
          contexte: {
            personnelId: employe.id,
            personnelNom: `${employe.prenom} ${employe.nom}`,
            poste: employe.poste,
          },
        })
      }
    }
  }

  /**
   * Valide une fiche de paie
   */
  validerFichePaie(id: string): boolean {
    const fiches = this.obtenirToutesLesFiches()
    const index = fiches.findIndex(f => f.id === id)
    if (index === -1) return false
    
    fiches[index].statut = "valide"
    this.sauvegarderFiches(fiches)
    return true
  }

  /**
   * Marque une fiche comme payée
   */
  marquerCommePaye(id: string): boolean {
    const fiches = this.obtenirToutesLesFiches()
    const index = fiches.findIndex(f => f.id === id)
    if (index === -1) return false
    
    fiches[index].statut = "paye"
    this.sauvegarderFiches(fiches)
    return true
  }

  /**
   * Récupère les heures supplémentaires
   */
  obtenirHeuresSupplementaires(): HeureSupplementaire[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_HEURES_SUP)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Récupère les heures supplémentaires d'un employé sur une période
   */
  obtenirHeuresSupplementairesPeriode(employeId: string, dateDebut: string, dateFin: string): HeureSupplementaire[] {
    const heures = this.obtenirHeuresSupplementaires()
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    
    return heures.filter(h => {
      const date = new Date(h.date)
      return h.employeId === employeId && date >= debut && date <= fin && h.validee
    })
  }

  /**
   * Ajoute des heures supplémentaires
   */
  ajouterHeuresSupplementaires(heures: Omit<HeureSupplementaire, "id">): HeureSupplementaire {
    const toutesHeures = this.obtenirHeuresSupplementaires()
    const nouvellesHeures: HeureSupplementaire = {
      ...heures,
      id: `hs-${Date.now()}`,
      montant: heures.heures * heures.taux * (heures.employeId ? 1000 : 0) // Taux de base à personnaliser
    }
    
    toutesHeures.push(nouvellesHeures)
    safeLocalStorage.setItem(this.CLE_STOCKAGE_HEURES_SUP, JSON.stringify(toutesHeures))
    
    return nouvellesHeures
  }

  /**
   * Valide des heures supplémentaires
   */
  validerHeuresSupplementaires(id: string): boolean {
    const heures = this.obtenirHeuresSupplementaires()
    const index = heures.findIndex(h => h.id === id)
    if (index === -1) return false
    
    heures[index].validee = true
    safeLocalStorage.setItem(this.CLE_STOCKAGE_HEURES_SUP, JSON.stringify(heures))
    return true
  }

  /**
   * Récupère les congés
   */
  obtenirConges(): Conge[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE_CONGES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Ajoute une demande de congé
   */
  ajouterConge(conge: Omit<Conge, "id">): Conge {
    const conges = this.obtenirConges()
    const nouveauConge: Conge = {
      ...conge,
      id: `conge-${Date.now()}`
    }
    
    conges.push(nouveauConge)
    safeLocalStorage.setItem(this.CLE_STOCKAGE_CONGES, JSON.stringify(conges))
    
    return nouveauConge
  }

  /**
   * Valide un congé
   */
  validerConge(id: string): boolean {
    const conges = this.obtenirConges()
    const index = conges.findIndex(c => c.id === id)
    if (index === -1) return false
    
    conges[index].statut = "valide"
    safeLocalStorage.setItem(this.CLE_STOCKAGE_CONGES, JSON.stringify(conges))
    return true
  }

  /**
   * Calcule la masse salariale totale pour une période
   */
  calculerMasseSalariale(periodeDebut: string, periodeFin: string): number {
    const fiches = this.obtenirToutesLesFiches()
    const debut = new Date(periodeDebut)
    const fin = new Date(periodeFin)
    
    return fiches
      .filter(f => {
        const date = new Date(f.periodeDebut)
        return date >= debut && date <= fin && f.statut === "valide"
      })
      .reduce((total, f) => total + f.netAPayer, 0)
  }
}

export const servicePaie = new ServicePaie()
