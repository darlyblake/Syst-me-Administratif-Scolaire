/**
 * Modèles de données pour l'application de gestion scolaire
 */

import { ReactNode } from "react";

// Modèle pour les données d'un élève
export interface DonneesEleve {
  fraisScolarite: number;
  fraisInscription: number;
  adresse: string;
  contactParent: string;
  nomParent: string;
  classeAncienne?: string;
 typeInscription: "inscription" | "reinscription"
  id: string;
  identifiant: string;
  motDePasse: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  classe: string;
  lieuNaissance: string
  totalAPayer: number;
  informationsContact: {
    telephone: string;
    email: string;
    adresse: string;
  };
  dateInscription: string;
  statut: string;
  photo?: string; // Added the 'photo' property

  // Nouvelles propriétés pour les options et paiement
  modePaiement: "mensuel" | "tranches";
  nombreTranches?: number;
  moisPaiement?: string[];
  optionsSupplementaires: {
    tenueScolaire: boolean;
    carteScolaire: boolean;
    cooperative: boolean;
    tenueEPS: boolean;
    assurance: boolean;
  };
  fraisOptionsSupplementaires: {
    tenueScolaire: number;
    carteScolaire: number;
    cooperative: number;
    tenueEPS: number;
    assurance: number;
  };

}

export interface DonneesEnseignant {
  id: string
  nom: string
  prenom: string
  dateNaissance: string
  email: string
  telephone: string
  adresse?: string
  dateEmbauche: string
  statut: "actif" | "inactif" | "conge" | "suspendu"
  // Identifiants de connexion
  identifiant: string
  motDePasse: string
  // Matières enseignées
  matieres: string[]
  // Classes assignées
  classes: string[]
  // Informations professionnelles
  salaire?: number
  numeroSecuriteSociale?: string
}

export interface CreneauEmploiDuTemps {
  id: string
  enseignantId: string
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"
  heureDebut: string // Format HH:MM
  heureFin: string // Format HH:MM
  matiere: string
  classe: string
  salle?: string
}

export interface Pointage {
  id: string
  enseignantId: string
  date: string // Format YYYY-MM-DD
  heureArrivee?: string // Format HH:MM
  heureDepart?: string // Format HH:MM
  statut: "present" | "absent" | "retard" | "conge"
  methodePoinatge: "telephone" | "manuel" | "qr_code"
  commentaire?: string
}

// Modèle pour les paiements
export interface Paiement {
  id: string
  eleveId: string
  montant: number
  datePaiement: string
  typePaiement: "inscription" | "scolarite" | "autre"
  methodePaiement: "especes" | "cheque" | "virement"
  description?: string
}

export interface StatistiquesTableauBord {
  totalEleves: number
  totalEnseignants: number
  totalRecettes: number
  classesActives: number
  elevesImpayes: number
  enseignantsPresents: number
  tauxPresenceEnseignants: number
}

export interface Utilisateur {
  id: string
  nomUtilisateur: string
  role: "administrateur" | "enseignant" | "eleve"
  dernierConnexion?: string
  // Données spécifiques selon le rôle
  donneesEleve?: DonneesEleve
  donneesEnseignant?: DonneesEnseignant
}

// Modèle pour les classes
export interface Classe {
  id: string
  nom: string
  niveau: string
  fraisScolarite: number
  nombreEleves: number
  enseignantPrincipalId?: string
}

export interface Matiere {
  id: string
  nom: string
  code: string
  coefficient: number
  niveau: string[] // Niveaux où cette matière est enseignée
}

export interface SessionPointageTelephone {
  id: string
  enseignantId: string
  codeVerification: string
  dateExpiration: string
  utilise: boolean
  dateCreation: string
}

export interface Notification {
  id: string
  titre: string
  message: string
  dateCreation: string
  dateEnvoi?: string
  statut: "brouillon" | "envoye" | "programme"
  // Destinataires
  destinataireType: "eleve" | "enseignant" | "classe" | "tous_eleves" | "tous_enseignants"
  destinataireIds: string[] // IDs des destinataires spécifiques
  classeId?: string // Pour les notifications à une classe
  // Métadonnées
  creePar: string // ID de l'administrateur
  priorite: "normale" | "importante" | "urgente"
  typeNotification: "information" | "rappel" | "alerte" | "evenement"
}

export interface HistoriqueNotification {
  id: string
  notificationId: string
  destinataireId: string
  destinataireType: "eleve" | "enseignant"
  dateReception: string
  statut: "non_lu" | "lu" | "archive"
}

export interface Absence {
  id: string
  eleveId: string
  date: string // Format YYYY-MM-DD
  statut: "absent" | "retard" | "justifie" | "non_justifie"
  heureArrivee?: string // Pour les retards
  motif?: string
  justificatif?: string // Chemin vers le document
  saisiePar: string // ID de l'enseignant ou admin
  dateCreation: string
}

export interface EvenementCalendrier {
  id: string
  titre: string
  description?: string
  dateDebut: string // Format YYYY-MM-DD
  dateFin: string // Format YYYY-MM-DD
  type: "vacances" | "examen" | "reunion" | "evenement" | "fermeture"
  couleur?: string
  concerne: "tous" | "enseignants" | "eleves" | "classe"
  classeId?: string
  creePar: string
}

export interface HorairesGeneraux {
  id: string
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi"
  heureOuverture: string // Format HH:MM
  heureFermeture: string // Format HH:MM
  pauseDebutMatin?: string
  pauseFinMatin?: string
  pauseDebutApresMidi?: string
  pauseFinApresMidi?: string
  actif: boolean
}
