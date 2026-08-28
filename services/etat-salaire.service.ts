const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion des états de salaire
 */

import { servicePersonnel } from "./personnel.service"
import { servicePointage } from "./pointage.service"
import { serviceParametres } from "./parametres.service"
import { serviceEmploiDuTempsClasses } from "./emploi-du-temps-classes.service"
import { serviceComptabiliteCentralisee } from "./comptabilite-centralisee.service"
import { serviceComptabiliteFacade } from "./comptabilite-facade.service"

export interface EtatSalaire {
  id: string
  personnelId: string
  periodeDebut: string
  periodeFin: string
  salaireBase: number
  heuresSupplementaires: number
  tauxHeureSupp: number
  montantHeuresSupp: number
  primes: number
  deductions: number
  salaireNet: number
  dateGeneration: string
  statut: "brouillon" | "valide" | "paye"
  datePaiement?: string
  modeGeneration: "manuel" | "automatique"
}

class ServiceEtatSalaire {
  private readonly CLE_STOCKAGE = "etats_salaire"

  /**
   * Récupère tous les états de salaire
   */
  obtenirTousLesEtats(): EtatSalaire[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les états de salaire
   */
  private sauvegarderEtats(etats: EtatSalaire[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(etats))
  }

  /**
   * Récupère les états de salaire d'un membre du personnel
   */
  obtenirEtatsPersonnel(personnelId: string): EtatSalaire[] {
    const etats = this.obtenirTousLesEtats()
    return etats.filter(e => e.personnelId === personnelId)
  }

  /**
   * Récupère les états de salaire par statut
   */
  obtenirEtatsParStatut(statut: EtatSalaire["statut"]): EtatSalaire[] {
    const etats = this.obtenirTousLesEtats()
    return etats.filter(e => e.statut === statut)
  }

  /**
   * Crée un nouvel état de salaire
   */
  creerEtat(etat: Omit<EtatSalaire, "id" | "salaireNet" | "dateGeneration">): EtatSalaire {
    const etats = this.obtenirTousLesEtats()
    const salaireNet = etat.salaireBase + etat.montantHeuresSupp + etat.primes - etat.deductions
    
    const nouvelEtat: EtatSalaire = {
      ...etat,
      id: `etat-${Date.now()}`,
      salaireNet,
      dateGeneration: new Date().toISOString()
    }
    
    etats.push(nouvelEtat)
    this.sauvegarderEtats(etats)
    return nouvelEtat
  }

  /**
   * Génère automatiquement les états de salaire pour une période
   */
  genererEtatsAutomatiques(periodeDebut: string, periodeFin: string): EtatSalaire[] {
    const personnel = servicePersonnel.obtenirToutLePersonnel()
    const personnelActif = personnel.filter(p => p.statut === "actif")
    const nouveauxEtats: EtatSalaire[] = []
    const parametresPaiement = serviceParametres.obtenirParametresPaiement()

    personnelActif.forEach(membre => {
      let salaireBase = 0
      let heuresSupplementaires = 0
      let tauxHeureSupp = 0

      if (membre.modeRemuneration === "fixe" && membre.salaireFixe) {
        // Personnel avec salaire fixe
        salaireBase = membre.salaireFixe
      } else if (membre.modeRemuneration === "horaire") {
        // Personnel horaire (vacataire)
        const tauxHoraire = membre.tauxHoraire || parametresPaiement.tauxHoraireParDefaut
        const heuresPrevues = membre.heuresPrevues || 0
        
        // Calculer les heures travaillées via le pointage
        const heuresTravaillees = this.calculerHeuresTravaillees(membre.id, periodeDebut, periodeFin)
        
        // Calculer les heures conformes à l'emploi du temps
        const heuresConformes = servicePointage.calculerHeuresConformes(membre.id, periodeDebut, periodeFin)
        
        // Utiliser les heures conformes pour le salaire de base (validation)
        // Les heures non conformes peuvent être traitées différemment ou exclues
        salaireBase = heuresConformes * tauxHoraire
        
        // Si heures travaillées > heures prévues, calculer les heures supplémentaires
        if (heuresTravaillees > heuresPrevues) {
          heuresSupplementaires = heuresTravaillees - heuresPrevues
          tauxHeureSupp = tauxHoraire * 1.25 // Taux majoré de 25%
        }
      }

      const nouvelEtat = this.creerEtat({
        personnelId: membre.id,
        periodeDebut,
        periodeFin,
        salaireBase,
        heuresSupplementaires,
        tauxHeureSupp,
        montantHeuresSupp: heuresSupplementaires * tauxHeureSupp,
        primes: 0,
        deductions: 0,
        statut: "brouillon",
        modeGeneration: "automatique"
      })

      nouveauxEtats.push(nouvelEtat)
    })

    return nouveauxEtats
  }

  /**
   * Calcule les heures travaillées pour un membre du personnel sur une période
   */
  private calculerHeuresTravaillees(personnelId: string, debut: string, fin: string): number {
    const pointages = servicePointage.obtenirTousLesPointages()
    const periodeDebut = new Date(debut)
    const periodeFin = new Date(fin)

    let totalHeures = 0

    pointages.forEach(pointage => {
      if (pointage.personnelId === personnelId) {
        const datePointage = new Date(pointage.date)
        
        if (datePointage >= periodeDebut && datePointage <= periodeFin) {
          if (pointage.heureArrivee && pointage.heureDepart) {
            const arrivee = this.convertirHeureEnMinutes(pointage.heureArrivee)
            const depart = this.convertirHeureEnMinutes(pointage.heureDepart)
            const heuresJour = (depart - arrivee) / 60
            totalHeures += heuresJour
          }
        }
      }
    })

    return Math.round(totalHeures * 10) / 10 // Arrondir à 1 décimale
  }

  /**
   * Convertit une heure HH:MM en minutes depuis minuit
   */
  private convertirHeureEnMinutes(heure: string): number {
    const [heures, minutes] = heure.split(':').map(Number)
    return heures * 60 + minutes
  }

  /**
   * Valide un état de salaire
   */
  validerEtat(id: string): boolean {
    const etats = this.obtenirTousLesEtats()
    const index = etats.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    etats[index].statut = "valide"
    this.sauvegarderEtats(etats)
    return true
  }

  /**
   * Marque un état comme payé et enregistre la transaction
   */
  marquerPaye(id: string): boolean {
    const etats = this.obtenirTousLesEtats()
    const index = etats.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    const etat = etats[index]
    etat.statut = "paye"
    etat.datePaiement = new Date().toISOString()
    this.sauvegarderEtats(etats)
    
    // Enregistrer la transaction via le service centralisé
    const personnel = servicePersonnel.obtenirToutLePersonnel().find(p => p.id === etat.personnelId)
    if (personnel) {
      serviceComptabiliteCentralisee.enregistrerSalaire(
        `${personnel.prenom} ${personnel.nom}`,
        personnel.poste || "Personnel",
        etat.salaireNet,
        new Date().toISOString().split('T')[0],
        personnel.id
      )

      serviceComptabiliteFacade.enregistrerTransaction({
        type: "sortie",
        categorie: "Salaire",
        description: `Salaire ${personnel.prenom} ${personnel.nom}`,
        montant: etat.salaireNet,
        date: new Date().toISOString().split('T')[0],
        reference: `Salaire #${etat.id}`,
        statut: "payee",
        source: "salaire",
        contexte: {
          personnelId: personnel.id,
          personnelNom: `${personnel.prenom} ${personnel.nom}`,
          poste: personnel.poste || "Personnel",
        },
      })
    }
    
    return true
  }

  /**
   * Supprime un état de salaire
   */
  supprimerEtat(id: string): boolean {
    const etats = this.obtenirTousLesEtats()
    const nouveauxEtats = etats.filter(e => e.id !== id)
    
    if (nouveauxEtats.length === etats.length) return false
    
    this.sauvegarderEtats(nouveauxEtats)
    return true
  }

  /**
   * Calcule la masse salariale pour une période
   */
  calculerMasseSalariale(debut: string, fin: string): number {
    const etats = this.obtenirTousLesEtats()
    return etats
      .filter(e => {
        const etatDebut = new Date(e.periodeDebut)
        const etatFin = new Date(e.periodeFin)
        const periodeDebut = new Date(debut)
        const periodeFin = new Date(fin)
        return etatDebut >= periodeDebut && etatFin <= periodeFin
      })
      .reduce((sum, e) => sum + e.salaireNet, 0)
  }

  /**
   * Obtient les statistiques
   */
  obtenirStatistiques() {
    const etats = this.obtenirTousLesEtats()
    const total = etats.length
    const totalMasse = etats.reduce((sum, e) => sum + e.salaireNet, 0)
    const parStatut: Record<string, number> = {}
    
    etats.forEach(e => {
      parStatut[e.statut] = (parStatut[e.statut] || 0) + 1
    })
    
    return {
      total,
      totalMasse,
      parStatut
    }
  }
}

export const serviceEtatSalaire = new ServiceEtatSalaire()
