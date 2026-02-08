import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import { serviceParametres } from "@/services/parametres.service"
import type { DonneesEleve } from "@/types/models"

/**
 * Initialise des données de test pour les paiements
 * Crée des élèves, des paiements et configure la tarification
 * COMMENTÉ : Fonction désactivée pour éviter l'insertion de données codées en dur.
 * Les données doivent maintenant être saisies par l'utilisateur via les services.
 */
export function initialiserDonneesTestPaiements(): void {
  try {
    console.log("🚀 Initialisation des données de test pour les paiements...")

    // 1. Configurer la tarification des classes
    const tarification = [
      { classe: "CP1", fraisInscription: 50000, fraisScolariteAnnuelle: 300000 },
      { classe: "CP2", fraisInscription: 50000, fraisScolariteAnnuelle: 320000 },
      { classe: "CE1", fraisInscription: 55000, fraisScolariteAnnuelle: 350000 },
      { classe: "CE2", fraisInscription: 55000, fraisScolariteAnnuelle: 370000 },
      { classe: "CM1", fraisInscription: 60000, fraisScolariteAnnuelle: 400000 },
      { classe: "CM2", fraisInscription: 60000, fraisScolariteAnnuelle: 420000 },
    ]
    serviceParametres.sauvegarderTarification(tarification)

    // 2. Configurer les options supplémentaires
    const optionsSupplementaires = {
      tenueScolaire: 25000,
      carteScolaire: 15000,
      cooperative: 20000,
      tenueEPS: 30000,
      assurance: 10000,
    }
    serviceParametres.sauvegarderOptionsSupplementaires(optionsSupplementaires)

    // 3. Configurer les paramètres de l'école
    const parametresEcole = {
      anneeAcademique: "2024-2025",
      dateDebut: "2024-09-01",
      dateFin: "2025-06-30",
      nomEcole: "École Primaire Excellence",
      adresseEcole: "123 Rue de l'Éducation, Ville",
      telephoneEcole: "01-23-45-67-89",
      nomDirecteur: "M. Dupont",
      modePaiement: "les_deux" as const,
    }
    serviceParametres.sauvegarderParametres(parametresEcole)

    // 4. Créer des élèves de test
    const elevesTest: Omit<DonneesEleve, "id" | "identifiant" | "motDePasse">[] = [
      // CP1
      {
        nom: "DUPONT",
        prenom: "Jean",
        dateNaissance: "2018-05-15",
        classe: "CP1",
        lieuNaissance: "Paris",
        totalAPayer: 300000,
        adresse: "10 Rue des Écoles",
        contactParent: "Mme Dupont",
        nomParent: "Marie Dupont",
        typeInscription: "inscription",
        informationsContact: {
          telephone: "06-12-34-56-78",
          email: "marie.dupont@email.com",
          adresse: "10 Rue des Écoles",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: true,
          carteScolaire: true,
          cooperative: false,
          tenueEPS: true,
          assurance: true,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 25000,
          carteScolaire: 15000,
          cooperative: 0,
          tenueEPS: 30000,
          assurance: 10000,
        },
      },
      {
        nom: "MARTIN",
        prenom: "Sophie",
        dateNaissance: "2018-03-22",
        classe: "CP1",
        lieuNaissance: "Lyon",
        totalAPayer: 300000,
        adresse: "25 Avenue des Roses",
        contactParent: "M. Martin",
        nomParent: "Pierre Martin",
        typeInscription: "inscription",
        informationsContact: {
          telephone: "06-98-76-54-32",
          email: "pierre.martin@email.com",
          adresse: "25 Avenue des Roses",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: true,
          carteScolaire: true,
          cooperative: true,
          tenueEPS: false,
          assurance: true,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 25000,
          carteScolaire: 15000,
          cooperative: 20000,
          tenueEPS: 0,
          assurance: 10000,
        },
      },
      // CP2
      {
        nom: "BERNARD",
        prenom: "Lucas",
        dateNaissance: "2017-11-08",
        classe: "CP2",
        lieuNaissance: "Marseille",
        totalAPayer: 320000,
        adresse: "5 Boulevard du Soleil",
        contactParent: "Mme Bernard",
        nomParent: "Claire Bernard",
        typeInscription: "reinscription",
        informationsContact: {
          telephone: "06-55-44-33-22",
          email: "claire.bernard@email.com",
          adresse: "5 Boulevard du Soleil",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: false,
          carteScolaire: true,
          cooperative: true,
          tenueEPS: true,
          assurance: true,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 0,
          carteScolaire: 15000,
          cooperative: 20000,
          tenueEPS: 30000,
          assurance: 10000,
        },
      },
      // CE1
      {
        nom: "PETIT",
        prenom: "Emma",
        dateNaissance: "2017-07-12",
        classe: "CE1",
        lieuNaissance: "Toulouse",
        totalAPayer: 350000,
        adresse: "15 Rue des Lilas",
        contactParent: "M. Petit",
        nomParent: "Antoine Petit",
        typeInscription: "reinscription",
        informationsContact: {
          telephone: "06-77-88-99-00",
          email: "antoine.petit@email.com",
          adresse: "15 Rue des Lilas",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: true,
          carteScolaire: true,
          cooperative: false,
          tenueEPS: true,
          assurance: false,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 25000,
          carteScolaire: 15000,
          cooperative: 0,
          tenueEPS: 30000,
          assurance: 0,
        },
      },
      {
        nom: "ROBERT",
        prenom: "Louis",
        dateNaissance: "2017-01-30",
        classe: "CE1",
        lieuNaissance: "Nice",
        totalAPayer: 350000,
        adresse: "8 Place de la Gare",
        contactParent: "Mme Robert",
        nomParent: "Isabelle Robert",
        typeInscription: "reinscription",
        informationsContact: {
          telephone: "06-11-22-33-44",
          email: "isabelle.robert@email.com",
          adresse: "8 Place de la Gare",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: true,
          carteScolaire: false,
          cooperative: true,
          tenueEPS: true,
          assurance: true,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 25000,
          carteScolaire: 0,
          cooperative: 20000,
          tenueEPS: 30000,
          assurance: 10000,
        },
      },
      // CM1
      {
        nom: "DURAND",
        prenom: "Chloé",
        dateNaissance: "2016-09-05",
        classe: "CM1",
        lieuNaissance: "Bordeaux",
        totalAPayer: 400000,
        adresse: "12 Rue Victor Hugo",
        contactParent: "M. Durand",
        nomParent: "Michel Durand",
        typeInscription: "reinscription",
        informationsContact: {
          telephone: "06-66-77-88-99",
          email: "michel.durand@email.com",
          adresse: "12 Rue Victor Hugo",
        },
        dateInscription: new Date().toISOString(),
        statut: "actif",
        modePaiement: "mensuel",
        nombreTranches: 10,
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
        optionsSupplementaires: {
          tenueScolaire: false,
          carteScolaire: true,
          cooperative: true,
          tenueEPS: false,
          assurance: true,
        },
        fraisOptionsSupplementaires: {
          tenueScolaire: 0,
          carteScolaire: 15000,
          cooperative: 20000,
          tenueEPS: 0,
          assurance: 10000,
        },
      },
    ]

    // Ajouter les élèves
    const elevesCrees: DonneesEleve[] = []
    elevesTest.forEach(eleveData => {
      const eleve = serviceEleves.ajouterEleve(eleveData)
      elevesCrees.push(eleve)
    })

    // 5. Créer des paiements de test
    const paiementsTest = [
      // Paiements pour Jean DUPONT (CP1) - Quelques mois payés
      {
        eleveId: elevesCrees[0].id,
        montant: 30000, // Septembre
        datePaiement: "2024-09-05T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "especes" as const,
        description: "Paiement scolarité septembre",
        moisPaiement: ["septembre"],
      },
      {
        eleveId: elevesCrees[0].id,
        montant: 30000, // Octobre
        datePaiement: "2024-10-05T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "virement" as const,
        description: "Paiement scolarité octobre",
        moisPaiement: ["octobre"],
      },
      {
        eleveId: elevesCrees[0].id,
        montant: 50000, // Frais d'inscription + novembre
        datePaiement: "2024-09-01T10:00:00.000Z",
        typePaiement: "inscription" as const,
        methodePaiement: "cheque" as const,
        description: "Frais d'inscription + scolarité novembre",
        moisPaiement: ["novembre"],
      },

      // Paiements pour Sophie MARTIN (CP1) - À jour
      {
        eleveId: elevesCrees[1].id,
        montant: 320000, // Tout payé d'un coup
        datePaiement: "2024-09-01T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "virement" as const,
        description: "Paiement annuel complet",
        moisPaiement: ["septembre", "octobre", "novembre", "decembre", "janvier", "fevrier", "mars", "avril", "mai", "juin"],
      },

      // Paiements pour Lucas BERNARD (CP2) - En retard
      {
        eleveId: elevesCrees[2].id,
        montant: 32000, // Septembre
        datePaiement: "2024-09-15T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "especes" as const,
        description: "Paiement scolarité septembre",
        moisPaiement: ["septembre"],
      },

      // Paiements pour Emma PETIT (CE1) - Partiellement payé
      {
        eleveId: elevesCrees[3].id,
        montant: 35000, // Septembre
        datePaiement: "2024-09-05T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "virement" as const,
        description: "Paiement scolarité septembre",
        moisPaiement: ["septembre"],
      },
      {
        eleveId: elevesCrees[3].id,
        montant: 35000, // Octobre
        datePaiement: "2024-10-05T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "especes" as const,
        description: "Paiement scolarité octobre",
        moisPaiement: ["octobre"],
      },
      {
        eleveId: elevesCrees[3].id,
        montant: 35000, // Novembre
        datePaiement: "2024-11-05T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "virement" as const,
        description: "Paiement scolarité novembre",
        moisPaiement: ["novembre"],
      },

      // Paiements pour Louis ROBERT (CE1) - Rien payé
      // Aucun paiement pour Louis

      // Paiements pour Chloé DURAND (CM1) - Quelques paiements
      {
        eleveId: elevesCrees[5].id,
        montant: 40000, // Septembre
        datePaiement: "2024-09-10T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "cheque" as const,
        description: "Paiement scolarité septembre",
        moisPaiement: ["septembre"],
      },
      {
        eleveId: elevesCrees[5].id,
        montant: 40000, // Octobre
        datePaiement: "2024-10-10T10:00:00.000Z",
        typePaiement: "scolarite" as const,
        methodePaiement: "especes" as const,
        description: "Paiement scolarité octobre",
        moisPaiement: ["octobre"],
      },
    ]

    // Ajouter les paiements
    paiementsTest.forEach(paiementData => {
      servicePaiements.ajouterPaiement(paiementData)
    })

