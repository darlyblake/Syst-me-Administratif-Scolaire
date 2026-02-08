/**
 * Fichier central pour les définitions de types et d'interfaces du modèle de données.
 */

export interface DonneesEleve {
  id: string;
  identifiant: string;
  motDePasse: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
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