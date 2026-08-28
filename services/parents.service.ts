/**
 * Service espace parent
 * Données de démo + helpers pour lier un parent à ses enfants
 * et agréger notes, absences, paiements, notifications, messages, événements.
 */

import type { DonneesEleve, Absence, Paiement, Notification } from "@/types/models"

export interface EnfantParent extends DonneesEleve {
  moyenneGenerale?: number
  absencesMois?: number
  resteAPayer?: number
}

export interface NoteEleve {
  id: string
  eleveId: string
  matiere: string
  note: number
  coefficient: number
  appreciation?: string
  trimestre: 1 | 2 | 3
  date: string
  type: "devoir" | "controle" | "oral" | "composition"
}

export interface MessageParent {
  id: string
  conversationId: string
  expediteur: "parent" | "ecole" | "enseignant"
  auteur: string
  contenu: string
  date: string
  lu: boolean
}

export interface ConversationParent {
  id: string
  sujet: string
  eleveId?: string
  eleveNom?: string
  dernierMessage: string
  dateDernier: string
  nonLus: number
  messages: MessageParent[]
}

export interface EvenementParent {
  id: string
  titre: string
  description: string
  type: "reunion" | "examen" | "fete" | "conference" | "sport" | "autre"
  date: string
  heureDebut?: string
  heureFin?: string
  lieu?: string
  classe?: string
}

const DEMO_ENFANTS: EnfantParent[] = [
  {
    id: "eleve-parent-1",
    identifiant: "kamara.aicha",
    motDePasse: "eleve123",
    nom: "Kamara",
    prenom: "Aïcha",
    dateNaissance: "2015-03-12",
    lieuNaissance: "Abidjan",
    sexe: "F",
    classe: "CM1",
    nomParent: "Kamara Moussa",
    contactParent: "+225 07 00 11 22 33",
    adresse: "Cocody, Abidjan",
    dateInscription: "2024-09-01T00:00:00.000Z",
    statut: "actif",
    totalAPayer: 450000,
    typeInscription: "reinscription",
    informationsContact: {
      telephone: "+225 07 00 11 22 33",
      email: "moussa.kamara@email.com",
      adresse: "Cocody, Abidjan",
    },
    modePaiement: "tranches",
    nombreTranches: 3,
    moisPaiement: ["Septembre", "Janvier", "Avril"],
    optionsSupplementaires: {
      tenueScolaire: true,
      carteScolaire: true,
      cooperative: true,
      tenueEPS: false,
      assurance: true,
    },
    fraisOptionsSupplementaires: {
      tenueScolaire: 25000,
      carteScolaire: 5000,
      cooperative: 10000,
      tenueEPS: 15000,
      assurance: 8000,
    },
    moyenneGenerale: 14.2,
    absencesMois: 1,
    resteAPayer: 150000,
  },
  {
    id: "eleve-parent-2",
    identifiant: "kamara.ibrahim",
    motDePasse: "eleve123",
    nom: "Kamara",
    prenom: "Ibrahim",
    dateNaissance: "2018-07-22",
    lieuNaissance: "Abidjan",
    sexe: "M",
    classe: "CP",
    nomParent: "Kamara Moussa",
    contactParent: "+225 07 00 11 22 33",
    adresse: "Cocody, Abidjan",
    dateInscription: "2024-09-01T00:00:00.000Z",
    statut: "actif",
    totalAPayer: 380000,
    typeInscription: "inscription",
    informationsContact: {
      telephone: "+225 07 00 11 22 33",
      email: "moussa.kamara@email.com",
      adresse: "Cocody, Abidjan",
    },
    modePaiement: "mensuel",
    moisPaiement: ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai"],
    optionsSupplementaires: {
      tenueScolaire: true,
      carteScolaire: true,
      cooperative: false,
      tenueEPS: true,
      assurance: true,
    },
    fraisOptionsSupplementaires: {
      tenueScolaire: 25000,
      carteScolaire: 5000,
      cooperative: 10000,
      tenueEPS: 15000,
      assurance: 8000,
    },
    moyenneGenerale: 15.8,
    absencesMois: 0,
    resteAPayer: 80000,
  },
]

const DEMO_NOTES: NoteEleve[] = [
  { id: "n1", eleveId: "eleve-parent-1", matiere: "Français", note: 15, coefficient: 2, appreciation: "Très bon travail", trimestre: 1, date: "2025-10-15", type: "controle" },
  { id: "n2", eleveId: "eleve-parent-1", matiere: "Mathématiques", note: 13.5, coefficient: 2, appreciation: "Peut mieux faire en géométrie", trimestre: 1, date: "2025-10-18", type: "controle" },
  { id: "n3", eleveId: "eleve-parent-1", matiere: "Histoire-Géographie", note: 16, coefficient: 1, appreciation: "Excellent", trimestre: 1, date: "2025-10-20", type: "devoir" },
  { id: "n4", eleveId: "eleve-parent-1", matiere: "Sciences", note: 12, coefficient: 1, appreciation: "À renforcer", trimestre: 1, date: "2025-10-22", type: "controle" },
  { id: "n5", eleveId: "eleve-parent-1", matiere: "Anglais", note: 14, coefficient: 1, trimestre: 1, date: "2025-10-25", type: "oral" },
  { id: "n6", eleveId: "eleve-parent-1", matiere: "Français", note: 14, coefficient: 3, appreciation: "Bonne composition", trimestre: 1, date: "2025-11-10", type: "composition" },
  { id: "n7", eleveId: "eleve-parent-2", matiere: "Français", note: 16, coefficient: 2, appreciation: "Lecture fluide", trimestre: 1, date: "2025-10-14", type: "controle" },
  { id: "n8", eleveId: "eleve-parent-2", matiere: "Mathématiques", note: 17, coefficient: 2, appreciation: "Très à l'aise", trimestre: 1, date: "2025-10-16", type: "controle" },
  { id: "n9", eleveId: "eleve-parent-2", matiere: "Écriture", note: 15, coefficient: 1, trimestre: 1, date: "2025-10-21", type: "devoir" },
  { id: "n10", eleveId: "eleve-parent-2", matiere: "EPS", note: 18, coefficient: 1, appreciation: "Excellent esprit d'équipe", trimestre: 1, date: "2025-10-28", type: "controle" },
]

const DEMO_ABSENCES: Absence[] = [
  {
    id: "abs1",
    eleveId: "eleve-parent-1",
    date: "2025-11-05",
    statut: "justifie",
    motif: "Rendez-vous médical",
    justificatif: "Certificat médical",
    dateCreation: "2025-11-05T08:00:00.000Z",
  },
  {
    id: "abs2",
    eleveId: "eleve-parent-1",
    date: "2025-10-12",
    statut: "retard",
    motif: "Embouteillage",
    dateCreation: "2025-10-12T08:15:00.000Z",
  },
  {
    id: "abs3",
    eleveId: "eleve-parent-2",
    date: "2025-09-20",
    statut: "justifie",
    motif: "Fièvre",
    justificatif: "Message parent",
    dateCreation: "2025-09-20T07:30:00.000Z",
  },
]

const DEMO_PAIEMENTS: Paiement[] = [
  {
    id: "pay1",
    eleveId: "eleve-parent-1",
    montant: 150000,
    datePaiement: "2024-09-05T10:00:00.000Z",
    typePaiement: "scolarite",
    methodePaiement: "mobile",
    description: "1ère tranche scolarité",
    moisPaiement: ["Septembre"],
  },
  {
    id: "pay2",
    eleveId: "eleve-parent-1",
    montant: 150000,
    datePaiement: "2025-01-10T11:00:00.000Z",
    typePaiement: "scolarite",
    methodePaiement: "especes",
    description: "2ème tranche scolarité",
    moisPaiement: ["Janvier"],
  },
  {
    id: "pay3",
    eleveId: "eleve-parent-1",
    montant: 48000,
    datePaiement: "2024-09-05T10:05:00.000Z",
    typePaiement: "autre",
    methodePaiement: "mobile",
    description: "Options (tenue, carte, coopérative, assurance)",
  },
  {
    id: "pay4",
    eleveId: "eleve-parent-2",
    montant: 200000,
    datePaiement: "2024-09-05T10:10:00.000Z",
    typePaiement: "scolarite",
    methodePaiement: "virement",
    description: "Acompte scolarité + inscription",
  },
  {
    id: "pay5",
    eleveId: "eleve-parent-2",
    montant: 100000,
    datePaiement: "2025-01-08T09:00:00.000Z",
    typePaiement: "scolarite",
    methodePaiement: "mobile",
    description: "Mensualités Oct–Déc",
  },
]

const DEMO_NOTIFICATIONS: (Notification & { lu?: boolean })[] = [
  {
    id: "notif1",
    titre: "Réunion parents-professeurs",
    message: "Réunion prévue le 15 décembre 2025 de 14h à 17h. Présence souhaitée pour les parents de CM1 et CP.",
    destinataireType: "tous_eleves",
    destinataireIds: [],
    creePar: "direction",
    priorite: "importante",
    typeNotification: "rappel",
    dateEnvoi: "2025-11-20T09:00:00.000Z",
    dateCreation: "2025-11-20T09:00:00.000Z",
    statut: "envoye",
    lu: false,
  },
  {
    id: "notif2",
    titre: "Bulletin 1er trimestre disponible",
    message: "Les bulletins du 1er trimestre sont disponibles. Vous pouvez les consulter dans l'onglet Notes.",
    destinataireType: "eleve",
    destinataireIds: ["eleve-parent-1", "eleve-parent-2"],
    creePar: "secretariat",
    priorite: "normale",
    typeNotification: "information",
    dateEnvoi: "2025-11-18T14:00:00.000Z",
    dateCreation: "2025-11-18T14:00:00.000Z",
    statut: "envoye",
    lu: false,
  },
  {
    id: "notif3",
    titre: "Rappel de paiement",
    message: "La 3ème tranche de scolarité pour Aïcha Kamara est due avant le 15 avril 2026.",
    destinataireType: "eleve",
    destinataireIds: ["eleve-parent-1"],
    creePar: "comptabilite",
    priorite: "importante",
    typeNotification: "alerte",
    dateEnvoi: "2025-11-10T08:00:00.000Z",
    dateCreation: "2025-11-10T08:00:00.000Z",
    statut: "envoye",
    lu: true,
  },
  {
    id: "notif4",
    titre: "Journée portes ouvertes",
    message: "Journée portes ouvertes le 6 décembre 2025 de 9h à 13h. Venez découvrir les projets des classes.",
    destinataireType: "tous_eleves",
    destinataireIds: [],
    creePar: "direction",
    priorite: "normale",
    typeNotification: "information",
    dateEnvoi: "2025-11-01T10:00:00.000Z",
    dateCreation: "2025-11-01T10:00:00.000Z",
    statut: "envoye",
    lu: true,
  },
]

const DEMO_CONVERSATIONS: ConversationParent[] = [
  {
    id: "conv1",
    sujet: "Suivi scolaire Aïcha",
    eleveId: "eleve-parent-1",
    eleveNom: "Aïcha Kamara",
    dernierMessage: "Merci, nous allons travailler les sciences à la maison.",
    dateDernier: "2025-11-12T16:30:00.000Z",
    nonLus: 0,
    messages: [
      {
        id: "m1",
        conversationId: "conv1",
        expediteur: "enseignant",
        auteur: "Mme Diallo (Sciences)",
        contenu: "Bonjour, Aïcha a des difficultés en sciences ce trimestre. Un renforcement à la maison serait utile.",
        date: "2025-11-12T15:00:00.000Z",
        lu: true,
      },
      {
        id: "m2",
        conversationId: "conv1",
        expediteur: "parent",
        auteur: "Vous",
        contenu: "Merci, nous allons travailler les sciences à la maison.",
        date: "2025-11-12T16:30:00.000Z",
        lu: true,
      },
    ],
  },
  {
    id: "conv2",
    sujet: "Justificatif d'absence",
    eleveId: "eleve-parent-1",
    eleveNom: "Aïcha Kamara",
    dernierMessage: "Le justificatif a bien été enregistré. Merci.",
    dateDernier: "2025-11-06T10:00:00.000Z",
    nonLus: 1,
    messages: [
      {
        id: "m3",
        conversationId: "conv2",
        expediteur: "parent",
        auteur: "Vous",
        contenu: "Bonjour, Aïcha était absente le 5 novembre pour un rendez-vous médical. Voici le certificat.",
        date: "2025-11-05T18:00:00.000Z",
        lu: true,
      },
      {
        id: "m4",
        conversationId: "conv2",
        expediteur: "ecole",
        auteur: "Secrétariat",
        contenu: "Le justificatif a bien été enregistré. Merci.",
        date: "2025-11-06T10:00:00.000Z",
        lu: false,
      },
    ],
  },
]

const DEMO_EVENEMENTS: EvenementParent[] = [
  {
    id: "evt1",
    titre: "Réunion parents-professeurs",
    description: "Entretiens individuels avec les enseignants. Prenez rendez-vous auprès du secrétariat.",
    type: "reunion",
    date: "2025-12-15",
    heureDebut: "14:00",
    heureFin: "17:00",
    lieu: "Salle polyvalente",
  },
  {
    id: "evt2",
    titre: "Journée portes ouvertes",
    description: "Découverte des projets de classe et ateliers.",
    type: "fete",
    date: "2025-12-06",
    heureDebut: "09:00",
    heureFin: "13:00",
    lieu: "Cour principale",
  },
  {
    id: "evt3",
    titre: "Composition 1er trimestre — CM1",
    description: "Compositions de fin de trimestre pour la classe de CM1.",
    type: "examen",
    date: "2025-11-25",
    heureDebut: "08:00",
    heureFin: "12:00",
    lieu: "Salles de classe",
    classe: "CM1",
  },
  {
    id: "evt4",
    titre: "Tournoi de football inter-classes",
    description: "Tournoi sportif ouvert aux élèves du CP au CM2.",
    type: "sport",
    date: "2025-12-20",
    heureDebut: "09:00",
    heureFin: "12:00",
    lieu: "Terrain de sport",
  },
]

class ServiceParents {
  /** IDs des enfants liés au compte parent de démo */
  private readonly ELEVE_IDS_DEMO = ["eleve-parent-1", "eleve-parent-2"]

  obtenirEnfants(_parentId?: string): EnfantParent[] {
    return DEMO_ENFANTS
  }

  obtenirEnfantParId(id: string): EnfantParent | null {
    return DEMO_ENFANTS.find((e) => e.id === id) || null
  }

  obtenirNotes(eleveId?: string, trimestre?: 1 | 2 | 3): NoteEleve[] {
    let notes = DEMO_NOTES
    if (eleveId) notes = notes.filter((n) => n.eleveId === eleveId)
    if (trimestre) notes = notes.filter((n) => n.trimestre === trimestre)
    return notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  calculerMoyenne(eleveId: string, trimestre?: 1 | 2 | 3): number {
    const notes = this.obtenirNotes(eleveId, trimestre)
    if (notes.length === 0) return 0
    const totalCoef = notes.reduce((s, n) => s + n.coefficient, 0)
    const total = notes.reduce((s, n) => s + n.note * n.coefficient, 0)
    return Math.round((total / totalCoef) * 10) / 10
  }

  obtenirAbsences(eleveId?: string): Absence[] {
    let absences = DEMO_ABSENCES
    if (eleveId) absences = absences.filter((a) => a.eleveId === eleveId)
    return absences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  obtenirPaiements(eleveId?: string): Paiement[] {
    let paiements = DEMO_PAIEMENTS
    if (eleveId) paiements = paiements.filter((p) => p.eleveId === eleveId)
    return paiements.sort(
      (a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime(),
    )
  }

  totalPaye(eleveId: string): number {
    return this.obtenirPaiements(eleveId).reduce((s, p) => s + p.montant, 0)
  }

  resteAPayer(eleveId: string): number {
    const enfant = this.obtenirEnfantParId(eleveId)
    if (!enfant) return 0
    const options =
      (enfant.optionsSupplementaires.tenueScolaire ? enfant.fraisOptionsSupplementaires.tenueScolaire : 0) +
      (enfant.optionsSupplementaires.carteScolaire ? enfant.fraisOptionsSupplementaires.carteScolaire : 0) +
      (enfant.optionsSupplementaires.cooperative ? enfant.fraisOptionsSupplementaires.cooperative : 0) +
      (enfant.optionsSupplementaires.tenueEPS ? enfant.fraisOptionsSupplementaires.tenueEPS : 0) +
      (enfant.optionsSupplementaires.assurance ? enfant.fraisOptionsSupplementaires.assurance : 0)
    const totalDu = enfant.totalAPayer + options
    return Math.max(0, totalDu - this.totalPaye(eleveId))
  }

  obtenirNotifications(): (Notification & { lu?: boolean })[] {
    return [...DEMO_NOTIFICATIONS].sort(
      (a, b) =>
        new Date(b.dateEnvoi || b.dateCreation).getTime() -
        new Date(a.dateEnvoi || a.dateCreation).getTime(),
    )
  }

  compterNotificationsNonLues(): number {
    return this.obtenirNotifications().filter((n) => !n.lu).length
  }

  obtenirConversations(): ConversationParent[] {
    return DEMO_CONVERSATIONS
  }

  compterMessagesNonLus(): number {
    return DEMO_CONVERSATIONS.reduce((s, c) => s + c.nonLus, 0)
  }

  obtenirEvenements(): EvenementParent[] {
    return [...DEMO_EVENEMENTS].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }

  /** Résumé pour le tableau de bord */
  obtenirResumeTableauBord() {
    const enfants = this.obtenirEnfants()
    const totalReste = enfants.reduce((s, e) => s + this.resteAPayer(e.id), 0)
    const absencesRecentes = this.obtenirAbsences().filter((a) => {
      const d = new Date(a.date)
      const ilYa30j = new Date()
      ilYa30j.setDate(ilYa30j.getDate() - 30)
      return d >= ilYa30j
    }).length

    return {
      nombreEnfants: enfants.length,
      notificationsNonLues: this.compterNotificationsNonLues(),
      messagesNonLus: this.compterMessagesNonLus(),
      totalResteAPayer: totalReste,
      absencesRecentes,
      evenementsAVenir: this.obtenirEvenements().filter((e) => new Date(e.date) >= new Date()).length,
      enfants,
    }
  }
}

export const serviceParents = new ServiceParents()
