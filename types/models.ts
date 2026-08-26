/**
 * Fichier central pour les définitions de types et d'interfaces du modèle de données.
 */

export type Role = 'admin' | 'ecole' | 'parent' | 'enseignant' | 'eleve'

export interface Utilisateur {
  id: string
  nomUtilisateur: string
  role: Role
  dernierConnexion?: string
  donneesEleve?: DonneesEleve
  donneesEnseignant?: DonneesEnseignant
  donneesParent?: DonneesParent
}

export interface DonneesParent {
  id: string
  nom: string
  prenom: string
  telephone: string
  email: string
  eleveIds: string[]
}

export interface DonneesEnseignant {
  id: string
  identifiant: string
  motDePasse: string
  nom: string
  prenom: string
  dateNaissance?: string
  lieuNaissance?: string
  sexe?: string
  telephone?: string
  email?: string
  adresse?: string
  matieres: string[]
  classes: string[]
  statut: "actif" | "inactif"
  typeContrat?: string
  dateEmbauche?: string
  salaireMensuel?: number
  tauxHoraire?: number
  heuresContractuelles?: number
  photo?: string
}

export interface DonneesEleve {
  id: string;
  identifiant: string;
  motDePasse: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  sexe?: string;
  classe: string;
  classeAncienne?: string;
  nomParent: string;
  contactParent: string;
  adresse: string;
  dateInscription: string;
  statut: "actif" | "inactif";
  photo?: string;
  totalAPayer: number;
  typeInscription: "inscription" | "reinscription";
  informationsContact: {
    telephone: string;
    email: string;
    adresse: string;
  };
  // Nouvelles propriétés pour paiement et options
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
  optionsPersonnalisees?: string[];
  fraisOptionsSupplementaires: {
    tenueScolaire: number;
    carteScolaire: number;
    cooperative: number;
    tenueEPS: number;
    assurance: number;
  };
  // Association avec un frère/sœur
  frereSoeurId?: string;
  lienParente?: string;
}

export interface Paiement {
  id: string;
  eleveId: string;
  montant: number;
  datePaiement: string;
  typePaiement: "scolarite" | "inscription" | "autre" | string; // string pour les options
  methodePaiement: "especes" | "cheque" | "virement" | "mobile";
  description?: string;
  moisPaiement?: string[];
}

export interface EleveAvecSuivi extends DonneesEleve {
  detteScolarite: number;
  detteTotaleGlobale: number;
  totalPayeScolarite: number;
  totalPayeGlobal: number;
  resteAPayerScolarite: number;
  resteAPayerGlobal: number;
  pourcentagePaye: number;
  moisRestants: string[];
  tranchesRestantes: any[];
  optionsRestantes: { nom: string; prix: number }[];
}

export interface Parametres {
  nomEcole: string;
  adresse: string;
  telephone: string;
  email: string;
  anneeAcademique: string;
  dateDebut: string;
  dateFin: string;
}

export interface Tarification {
  classe: string;
  fraisInscription: number;
  fraisScolariteAnnuelle: number;
}

export interface OptionsSupplementaires {
  tenueScolaire: number;
  carteScolaire: number;
  cooperative: number;
  tenueEPS: number;
  assurance: number;
}

export interface OptionPersonnalisee {
  id: string;
  nom: string;
  prix: number;
}

export interface ParametresPaiement {
  tranchesPaiement: {
    nombre: number;
    pourcentage: number;
    dateDebut: string;
    dateFin: string;
    numero: number;
  }[];
}

export interface StatistiquesTableauBord {
  totalEleves: number;
  totalEnseignants: number;
  totalRecettes: number;
  classesActives: number;
  elevesImpayes: number;
  enseignantsPresents: number;
  tauxPresenceEnseignants: number;
}

export interface Matiere {
  id: string;
  code: string;
  nom: string;
  niveau: string[];
  coefficient: number;
  couleur?: string;
  description?: string;
}

export interface Classe {
  id: string;
  nom: string;
  niveau: string;
  typeEcole?: string;
  capacite: number;
  fraisScolarite: number;
}

export interface Absence {
  id: string;
  eleveId: string;
  date: string; // format YYYY-MM-DD
  statut: "absent" | "justifie" | "non_justifie" | "retard";
  motif?: string;
  justificatif?: string;
  dateCreation: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  destinataireType: "eleve" | "tous_eleves" | "classe" | "enseignant" | "tous_enseignants";
  destinataireIds: string[];
  classeId?: string;
  creePar: string;
  priorite: "normale" | "importante" | "urgente";
  typeNotification: "information" | "alerte" | "rappel";
  dateEnvoi?: string;
  dateCreation: string;
  statut: "brouillon" | "envoye" | "archive";
}

export interface HistoriqueNotification {
  id: string;
  notificationId: string;
  destinataireId: string;
  destinataireType: "eleve" | "enseignant";
  dateReception: string;
  statut: "lu" | "non_lu";
}

export interface HorairesGeneraux {
  id: string;
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";
  heureOuverture: string;
  heureFermeture: string;
  pauseDebutMatin?: string;
  pauseFinMatin?: string;
  pauseDebutApresMidi?: string;
  pauseFinApresMidi?: string;
  actif: boolean;
}

export interface ParametresEcole {
  anneeAcademique: string;
  dateDebut: string;
  dateFin: string;
  nomEcole: string;
  adresseEcole: string;
  telephoneEcole: string;
  nomDirecteur: string;
  modePaiement: "mensuel" | "trimestriel" | "les_deux";
}

export interface CreneauEmploiDuTemps {
  id: string;
  classeId: string;
  classeNom: string;
  enseignantId: string;
  enseignantNom: string;
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";
  heureDebut: string;
  heureFin: string;
  matiere: string;
  salle: string;
  dateCreation: string;
  dateModification: string;
}

export interface Pointage {
  id: string;
  personnelId: string;
  date: string;
  heureArrivee?: string;
  heureDepart?: string;
  statut: "present" | "absent" | "retard" | "conge" | string;
  motifAbsence?: string;
  valide: boolean;
  conformeEmploiDuTemps?: boolean;
  creneauId?: string;
}

export interface SessionPointageTelephone {
  id: string;
  enseignantId: string;
  codeVerification: string;
  dateExpiration: string;
  utilise: boolean;
  dateCreation: string;
}

export interface HistoriqueAffectation {
  id: string;
  enseignantId: string;
  dateModification: string;
  modifiePar: string;
  type: "classe" | "matiere" | "statut" | "salaire" | string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  motif?: string;
}

export interface DocumentAdministratif {
  id: string;
  enseignantId: string;
  nom: string;
  type: "contrat" | "diplome" | "certificat" | "attestation" | "autre" | string;
  dateAjout: string;
  ajoutePar: string;
  statut: "actif" | "archive" | "supprime" | string;
  description?: string;
  url?: string;
}

export interface Contact {
  id: string;
  enseignantId: string;
  type: "email" | "telephone" | "sms" | "reunion" | string;
  statut: "envoye" | "lu" | "repondu" | "archive" | string;
  dateEnvoi: string;
  envoyePar: string;
  sujet?: string;
  message?: string;
}

export interface AffectationNotification {
  id: string;
  enseignantId: string;
  notificationId?: string;
  titre?: string;
  message?: string;
  dateAffectation: string;
  affectePar: string;
  statut: "active" | "inactive" | "traitee" | string;
  priorite?: "urgente" | "importante" | "normale" | string;
}