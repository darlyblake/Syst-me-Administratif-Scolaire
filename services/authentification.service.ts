/**
 * Service d'authentification
 * Gère la connexion et la déconnexion des utilisateurs
 */

import type { Utilisateur, DonneesEleve, DonneesEnseignant } from "@/types/models"
import { serviceEleves } from "./eleves.service"
import { serviceEnseignants } from "./enseignants.service"

class ServiceAuthentification {
  private readonly CLE_UTILISATEUR_STOCKAGE = "utilisateur_connecte"

  private readonly utilisateursAutorises = [
    {
      id: "1",
      nomUtilisateur: "freid",
      motDePasse: "123456",
      role: "administrateur" as const,
    },
  ]

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

        localStorage.setItem(this.CLE_UTILISATEUR_STOCKAGE, JSON.stringify(utilisateur))
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

        localStorage.setItem(this.CLE_UTILISATEUR_STOCKAGE, JSON.stringify(utilisateur))
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

        localStorage.setItem(this.CLE_UTILISATEUR_STOCKAGE, JSON.stringify(utilisateur))
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
    localStorage.removeItem(this.CLE_UTILISATEUR_STOCKAGE)
  }

  /**
   * Récupère l'utilisateur actuellement connecté
   */
  obtenirUtilisateurConnecte(): Utilisateur | null {
    try {
      const donnees = localStorage.getItem(this.CLE_UTILISATEUR_STOCKAGE)
      return donnees ? JSON.parse(donnees) : null
    } catch {
      return null
    }
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
