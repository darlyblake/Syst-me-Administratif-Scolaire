/**
 * Service de gestion des notifications
 * Permet d'envoyer des notifications aux élèves et enseignants
 */

import type { Notification, HistoriqueNotification } from "@/types/models"

class ServiceNotifications {
  private notifications: Notification[] = []
  private historiqueNotifications: HistoriqueNotification[] = []

  /**
   * Génère un ID unique pour les notifications
   */
  private genererIdNotification(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Crée une nouvelle notification
   */
  creerNotification(donneesNotification: Omit<Notification, "id" | "dateCreation" | "statut">): Notification {
    const nouvelleNotification: Notification = {
      ...donneesNotification,
      id: this.genererIdNotification(),
      dateCreation: new Date().toISOString(),
      statut: "brouillon",
    }

    this.notifications.push(nouvelleNotification)
    this.sauvegarderNotifications()
    return nouvelleNotification
  }

  /**
   * Envoie une notification à un élève spécifique
   */
  envoyerNotificationEleve(
    eleveId: string,
    titre: string,
    message: string,
    priorite: "normale" | "importante" | "urgente" = "normale",
  ): Notification {
    return this.creerNotification({
      titre,
      message,
      destinataireType: "eleve",
      destinataireIds: [eleveId],
      creePar: "admin",
      priorite,
      typeNotification: "information",
      dateEnvoi: new Date().toISOString(),
    })
  }

  /**
   * Envoie une notification à tous les élèves
   */
  envoyerNotificationTousEleves(
    titre: string,
    message: string,
    priorite: "normale" | "importante" | "urgente" = "normale",
  ): Notification {
    return this.creerNotification({
      titre,
      message,
      destinataireType: "tous_eleves",
      destinataireIds: [],
      creePar: "admin",
      priorite,
      typeNotification: "information",
      dateEnvoi: new Date().toISOString(),
    })
  }

  /**
   * Envoie une notification à une classe spécifique
   */
  envoyerNotificationClasse(
    classeId: string,
    titre: string,
    message: string,
    priorite: "normale" | "importante" | "urgente" = "normale",
  ): Notification {
    return this.creerNotification({
      titre,
      message,
      destinataireType: "classe",
      destinataireIds: [],
      classeId,
      creePar: "admin",
      priorite,
      typeNotification: "information",
      dateEnvoi: new Date().toISOString(),
    })
  }

  /**
   * Envoie une notification à un enseignant spécifique
   */
  envoyerNotificationEnseignant(
    enseignantId: string,
    titre: string,
    message: string,
    priorite: "normale" | "importante" | "urgente" = "normale",
  ): Notification {
    return this.creerNotification({
      titre,
      message,
      destinataireType: "enseignant",
      destinataireIds: [enseignantId],
      creePar: "admin",
      priorite,
      typeNotification: "information",
      dateEnvoi: new Date().toISOString(),
    })
  }

  /**
   * Envoie une notification à tous les enseignants
   */
  envoyerNotificationTousEnseignants(
    titre: string,
    message: string,
    priorite: "normale" | "importante" | "urgente" = "normale",
  ): Notification {
    return this.creerNotification({
      titre,
      message,
      destinataireType: "tous_enseignants",
      destinataireIds: [],
      creePar: "admin",
      priorite,
      typeNotification: "information",
      dateEnvoi: new Date().toISOString(),
    })
  }

  /**
   * Récupère toutes les notifications
   */
  obtenirToutesNotifications(): Notification[] {
    return [...this.notifications].sort(
      (a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime(),
    )
  }

  /**
   * Récupère les notifications par type de destinataire
   */
  obtenirNotificationsParType(type: Notification["destinataireType"]): Notification[] {
    return this.notifications.filter((notif) => notif.destinataireType === type)
  }

  /**
   * Supprime une notification
   */
  supprimerNotification(notificationId: string): boolean {
    const index = this.notifications.findIndex((notif) => notif.id === notificationId)
    if (index !== -1) {
      this.notifications.splice(index, 1)
      this.sauvegarderNotifications()
      return true
    }
    return false
  }

  /**
   * Marque une notification comme lue pour un destinataire
   */
  marquerCommeLue(notificationId: string, destinataireId: string, destinataireType: "eleve" | "enseignant"): void {
    const historique: HistoriqueNotification = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notificationId,
      destinataireId,
      destinataireType,
      dateReception: new Date().toISOString(),
      statut: "lu",
    }

    this.historiqueNotifications.push(historique)
    this.sauvegarderHistorique()
  }

  /**
   * Obtient les statistiques des notifications
   */
  obtenirStatistiquesNotifications() {
    const total = this.notifications.length
    const envoyees = this.notifications.filter((n) => n.statut === "envoye").length
    const brouillons = this.notifications.filter((n) => n.statut === "brouillon").length

    return {
      total,
      envoyees,
      brouillons,
      tauxEnvoi: total > 0 ? Math.round((envoyees / total) * 100) : 0,
    }
  }

  /**
   * Sauvegarde les notifications dans le localStorage
   */
  private sauvegarderNotifications(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("notifications_scolaires", JSON.stringify(this.notifications))
    }
  }

  /**
   * Sauvegarde l'historique dans le localStorage
   */
  private sauvegarderHistorique(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("historique_notifications", JSON.stringify(this.historiqueNotifications))
    }
  }

  /**
   * Charge les notifications depuis le localStorage
   */
  private chargerNotifications(): void {
    if (typeof window !== "undefined") {
      const donneesStockees = localStorage.getItem("notifications_scolaires")
      if (donneesStockees) {
        this.notifications = JSON.parse(donneesStockees)
      }
    }
  }

  /**
   * Charge l'historique depuis le localStorage
   */
  private chargerHistorique(): void {
    if (typeof window !== "undefined") {
      const historiqueStocke = localStorage.getItem("historique_notifications")
      if (historiqueStocke) {
        this.historiqueNotifications = JSON.parse(historiqueStocke)
      }
    }
  }

  /**
   * Initialise le service
   */
  initialiser(): void {
    this.chargerNotifications()
    this.chargerHistorique()
  }
}

// Instance unique du service
export const serviceNotifications = new ServiceNotifications()

// Initialiser le service au chargement
if (typeof window !== "undefined") {
  serviceNotifications.initialiser()
}
