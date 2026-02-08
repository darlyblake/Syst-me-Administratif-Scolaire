/**
 * Service d'authentification
 * Gère la connexion et la déconnexion des utilisateurs avec gestion de session robuste
 */

import type { Utilisateur, DonneesEleve, DonneesEnseignant } from "@/types/models"
import { serviceEleves } from "./eleves.service"
import { serviceEnseignants } from "./enseignants.service"

interface SessionData {
  utilisateur: Utilisateur
  timestamp: number
  expiresAt: number
}

class ServiceAuthentification {
  private readonly CLE_UTILISATEUR_STOCKAGE = "utilisateur_connecte"
  private readonly CLE_SAUVEGARDE_STOCKAGE = "sauvegarde_session"
  private readonly DUREE_SESSION_HEURES = 24 // 24 heures
  private readonly MARGE_TOLERANCE_MINUTES = 5 // 5 minutes de tolérance

  private readonly utilisateursAutorises = [
    {
      id: "1",
      nomUtilisateur: "freid",
      motDePasse: "123456",
      role: "administrateur" as const,
    },
  ]

  /**
   * Calcule la date d'expiration d'une session
   */
  private calculerExpiration(): number {
    return Date.now() + (this.DUREE_SESSION_HEURES * 60 * 60 * 1000)
  }

  /**
   * Vérifie si une session est expirée
   */
  private estSessionExpiree(expiresAt: number): boolean {
    return Date.now() > (expiresAt + (this.MARGE_TOLERANCE_MINUTES * 60 * 1000))
  }

  /**
   * Sauvegarde les données de session de manière sécurisée
   */
  private sauvegarderSession(utilisateur: Utilisateur): void {
    const sessionData: SessionData = {
      utilisateur,
      timestamp: Date.now(),
      expiresAt: this.calculerExpiration()
    }

    try {
      localStorage.setItem(this.CLE_UTILISATEUR_STOCKAGE, JSON.stringify(sessionData))
      // Créer une sauvegarde pour récupération
      localStorage.setItem(this.CLE_SAUVEGARDE_STOCKAGE, JSON.stringify(sessionData))
    } catch (error) {
      console.warn("Erreur lors de la sauvegarde de session:", error)
    }
  }

  /**
   * Récupère les données de session avec vérification
   */
  private recupererSession(): SessionData | null {
    try {
      // Essayer d'abord la session principale
      const donnees = localStorage.getItem(this.CLE_UTILISATEUR_STOCKAGE)
      if (donnees) {
        const sessionData: SessionData = JSON.parse(donnees)

        // Vérifier si la session n'est pas expirée
        if (!this.estSessionExpiree(sessionData.expiresAt)) {
          return sessionData
        } else {
          // Session expirée, la supprimer
          this.nettoyerSession()
        }
      }

      // Si pas de session valide, essayer la sauvegarde
      const sauvegarde = localStorage.getItem(this.CLE_SAUVEGARDE_STOCKAGE)
      if (sauvegarde) {
        const sessionData: SessionData = JSON.parse(sauvegarde)

        // Vérifier si la sauvegarde n'est pas expirée
        if (!this.estSessionExpiree(sessionData.expiresAt)) {
          // Restaurer la session principale
          this.sauvegarderSession(sessionData.utilisateur)
          return sessionData
        }
      }

      return null
    } catch (error) {
      console.warn("Erreur lors de la récupération de session:", error)
      // En cas d'erreur, essayer de nettoyer et retourner null
      this.nettoyerSession()
      return null
    }
  }

  /**
   * Nettoie toutes les données de session
   */
  private nettoyerSession(): void {
    try {
      localStorage.removeItem(this.CLE_UTILISATEUR_STOCKAGE)
      localStorage.removeItem(this.CLE_SAUVEGARDE_STOCKAGE)
    } catch (error) {
      console.warn("Erreur lors du nettoyage de session:", error)
    }
  }

  /**
   * Connecte un utilisateur avec ses identifiants
   * Modification pour gérer les trois types d'utilisateurs : admin, enseignant, élève
   */
  async connecter(
    nomUtilisateur: string,
    motDePasse: string,
  ): Promise<{ succes: boolean; utilisateur?: Utilisateur; erreur?: string }> {
    try {
      // Simulation d'un délai d'API
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Vérifier d'abord l'administrateur principal
      const adminTrouve = this.utilisateursAutorises.find(
        (u) => u.nomUtilisateur === nomUtilisateur && u.motDePasse === motDePasse,
      )

      if (adminTrouve) {
        const utilisateur: Utilisateur = {
          id: adminTrouve.id,
          nomUtilisateur: adminTrouve.nomUtilisateur,
          role: adminTrouve.role,
          dernierConnexion: new Date().toISOString(),
        }

        this.sauvegarderSession(utilisateur)
        return { succes: true, utilisateur }
      }

      const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
      const enseignantTrouve = enseignants.find(
        (e) => e.identifiant === nomUtilisateur && e.motDePasse === motDePasse && e.statut === "actif",
      )

      if (enseignantTrouve) {
        const utilisateur: Utilisateur = {
          id: enseignantTrouve.id,
          nomUtilisateur: enseignantTrouve.identifiant,
          role: "enseignant",
          dernierConnexion: new Date().toISOString(),
          donneesEnseignant: enseignantTrouve,
        }

        this.sauvegarderSession(utilisateur)
        return { succes: true, utilisateur }
      }

      const eleves = serviceEleves.obtenirTousLesEleves()
      const eleveTrouve = eleves.find(
        (e) => e.identifiant === nomUtilisateur && e.motDePasse === motDePasse && e.statut === "actif",
      )

      if (eleveTrouve) {
        const utilisateur: Utilisateur = {
          id: eleveTrouve.id,
          nomUtilisateur: eleveTrouve.identifiant,
          role: "eleve",
          dernierConnexion: new Date().toISOString(),
          donneesEleve: eleveTrouve,
        }

        this.sauvegarderSession(utilisateur)
        return { succes: true, utilisateur }
      }

      return {
        succes: false,
        erreur: "Identifiant ou mot de passe incorrect",
      }
    } catch (error) {
      return {
        succes: false,
        erreur: "Erreur lors de la connexion",
      }
    }
  }

  /**
   * Déconnecte l'utilisateur actuel
   */
  deconnecter(): void {
    this.nettoyerSession()
  }

  /**
   * Récupère l'utilisateur actuellement connecté avec vérification de session
   */
  obtenirUtilisateurConnecte(): Utilisateur | null {
    const sessionData = this.recupererSession()
    return sessionData ? sessionData.utilisateur : null
  }

  /**
   * Vérifie si une session est active et valide
   */
  estSessionActive(): boolean {
    const sessionData = this.recupererSession()
    return sessionData !== null
  }

  /**
   * Prolonge la session actuelle si elle est valide
   */
  prolongerSession(): boolean {
    const sessionData = this.recupererSession()
    if (sessionData) {
      // Prolonger la session de 24h supplémentaires
      const nouvelleSessionData: SessionData = {
        ...sessionData,
        timestamp: Date.now(),
        expiresAt: this.calculerExpiration()
      }

      try {
        localStorage.setItem(this.CLE_UTILISATEUR_STOCKAGE, JSON.stringify(nouvelleSessionData))
        localStorage.setItem(this.CLE_SAUVEGARDE_STOCKAGE, JSON.stringify(nouvelleSessionData))
        return true
      } catch (error) {
        console.warn("Erreur lors de la prolongation de session:", error)
        return false
      }
    }
    return false
  }

  /**
   * Obtient le temps restant avant expiration (en minutes)
   */
  obtenirTempsRestant(): number {
    const sessionData = this.recupererSession()
    if (sessionData) {
      const tempsRestant = sessionData.expiresAt - Date.now()
      return Math.max(0, Math.floor(tempsRestant / (60 * 1000)))
    }
    return 0
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  estConnecte(): boolean {
    return this.obtenirUtilisateurConnecte() !== null
  }

  /**
   * Nouvelle méthode pour vérifier les permissions selon le rôle
   */
  aLesPermissions(action: string): boolean {
    const utilisateur = this.obtenirUtilisateurConnecte()
    if (!utilisateur) return false

    switch (utilisateur.role) {
      case "administrateur":
        return true // L'admin a tous les droits
      case "enseignant":
        // Les enseignants peuvent voir leur emploi du temps et faire leur pointage
        return ["voir_emploi_du_temps", "pointage", "voir_profil"].includes(action)
      case "eleve":
        // Les élèves peuvent seulement voir leur profil et leurs informations
        return ["voir_profil", "voir_paiements"].includes(action)
      default:
        return false
    }
  }

  /**
   * Méthode pour obtenir les données spécifiques selon le rôle
   */
  obtenirDonneesUtilisateur(): DonneesEleve | DonneesEnseignant | null {
    const utilisateur = this.obtenirUtilisateurConnecte()
    if (!utilisateur) return null

    if (utilisateur.role === "eleve" && utilisateur.donneesEleve) {
      return utilisateur.donneesEleve
    }
    if (utilisateur.role === "enseignant" && utilisateur.donneesEnseignant) {
      return utilisateur.donneesEnseignant
    }

    return null
  }
}

// Instance singleton du service
export const serviceAuthentification = new ServiceAuthentification()
