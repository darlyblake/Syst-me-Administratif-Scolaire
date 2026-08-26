import { serviceComptabiliteFacade } from "@/services/comptabilite-facade.service"
import { serviceComptabilite } from "@/services/comptabilite.service"
import { serviceDepenses } from "@/services/depenses.service"
import { serviceEtatSalaire } from "@/services/etat-salaire.service"
import { serviceHeuresVacataires } from "@/services/heures-vacataires.service"
import { serviceMouvements } from "@/services/mouvements.service"

describe("serviceComptabiliteFacade", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("retourne un plan comptable par défaut lorsque l'accès au localStorage échoue", () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage indisponible")
    })

    try {
      expect(() => serviceComptabilite.obtenirDonnees()).not.toThrow()
      expect(serviceComptabilite.obtenirDonnees().comptes.length).toBeGreaterThan(0)
    } finally {
      getItemSpy.mockRestore()
    }
  })

  it("rehydrate les mouvements financiers depuis le localStorage au moment de la lecture", () => {
    localStorage.setItem(
      "mouvements_financiers",
      JSON.stringify([
        {
          id: "mvt-1",
          type: "entree",
          categorie: "Scolarité",
          description: "Paiement scolarité",
          montant: 25000,
          date: "2026-07-12",
          reference: "SCOL-001",
          statut: "valide",
          creeLe: "2026-07-12T08:00:00.000Z",
        },
      ])
    )

    const mouvements = serviceMouvements.obtenirTousLesMouvements()

    expect(mouvements).toHaveLength(1)
    expect(mouvements[0].categorie).toBe("Scolarité")
    expect(mouvements[0].montant).toBe(25000)
  })

  it("centralise les transactions financières dans un journal local", () => {
    const id = serviceComptabiliteFacade.enregistrerTransaction({
      type: "entree",
      categorie: "Scolarité",
      description: "Paiement scolarité",
      montant: 25000,
      date: "2026-07-12",
      reference: "SCOL-001",
      statut: "valide",
      source: "paiement",
      contexte: {
        eleveId: "eleve-1",
        eleveNom: "Amina Diop",
      },
    })

    const journal = serviceComptabiliteFacade.obtenirJournal()

    expect(journal).toHaveLength(1)
    expect(journal[0].id).toBe(id)
    expect(journal[0].type).toBe("entree")
    expect(journal[0].montant).toBe(25000)
    expect(journal[0].reference).toBe("SCOL-001")
    expect(journal[0].source).toBe("paiement")
  })

  it("exporte le journal local au format CSV", () => {
    serviceComptabiliteFacade.enregistrerTransaction({
      type: "entree",
      categorie: "Scolarité",
      description: "Paiement scolarité",
      montant: 25000,
      date: "2026-07-12",
      reference: "SCOL-001",
      statut: "valide",
      source: "paiement",
    })

    serviceComptabiliteFacade.enregistrerTransaction({
      type: "sortie",
      categorie: "Salaire",
      description: "Salaire enseignant",
      montant: 18000,
      date: "2026-07-13",
      reference: "SAL-001",
      statut: "payee",
      source: "salaire",
    })

    const csv = serviceComptabiliteFacade.exporterJournalCSV()

    expect(csv).toContain("type,categorie,description,montant,date,reference,statut,source")
    expect(csv).toContain("SCOL-001")
    expect(csv).toContain("SAL-001")
  })

  it("calcule le résumé mensuel du journal local", () => {
    serviceComptabiliteFacade.enregistrerTransaction({
      type: "entree",
      categorie: "Scolarité",
      description: "Paiement scolarité",
      montant: 25000,
      date: "2026-07-12",
      reference: "SCOL-001",
      statut: "valide",
      source: "paiement",
    })

    serviceComptabiliteFacade.enregistrerTransaction({
      type: "sortie",
      categorie: "Salaire",
      description: "Salaire enseignant",
      montant: 18000,
      date: "2026-07-13",
      reference: "SAL-001",
      statut: "payee",
      source: "salaire",
    })

    const statistiques = serviceComptabiliteFacade.obtenirStatistiquesMensuelles(2026)

    expect(statistiques.find(item => item.mois === "Juillet")?.entrees).toBe(25000)
    expect(statistiques.find(item => item.mois === "Juillet")?.sorties).toBe(18000)
    expect(statistiques.find(item => item.mois === "Juillet")?.solde).toBe(7000)
  })

  it("permet de valider une transaction depuis le journal comptable", () => {
    serviceComptabiliteFacade.enregistrerTransaction({
      type: "sortie",
      categorie: "Salaire",
      description: "Salaire enseignant",
      montant: 18000,
      date: "2026-07-13",
      reference: "SAL-001",
      statut: "brouillon",
      source: "salaire",
    })

    const miseAJour = serviceComptabiliteFacade.mettreAJourStatutTransaction("SAL-001", "valide")
    const journal = serviceComptabiliteFacade.obtenirJournal()

    expect(miseAJour).toBe(true)
    expect(journal[0].statut).toBe("valide")
  })

  it("calcule le reporting financier par catégorie", () => {
    serviceComptabiliteFacade.enregistrerTransaction({
      type: "entree",
      categorie: "Scolarité",
      description: "Paiement scolarité",
      montant: 25000,
      date: "2026-07-12",
      reference: "SCOL-001",
      statut: "valide",
      source: "paiement",
    })

    serviceComptabiliteFacade.enregistrerTransaction({
      type: "sortie",
      categorie: "Salaire",
      description: "Salaire enseignant",
      montant: 18000,
      date: "2026-07-13",
      reference: "SAL-001",
      statut: "payee",
      source: "salaire",
    })

    const statistiques = serviceComptabiliteFacade.obtenirStatistiquesParCategorie()

    expect(statistiques.find(item => item.categorie === "Scolarité")?.solde).toBe(25000)
    expect(statistiques.find(item => item.categorie === "Salaire")?.solde).toBe(-18000)
  })

  it("enregistre les paiements d'état de salaire dans le journal comptable principal", () => {
    localStorage.setItem(
      "personnel_administratif",
      JSON.stringify([
        {
          id: "pers-1",
          prenom: "Awa",
          nom: "Diop",
          poste: "Professeur",
          statut: "actif",
        },
      ])
    )

    localStorage.setItem(
      "etats_salaire",
      JSON.stringify([
        {
          id: "etat-1",
          personnelId: "pers-1",
          periodeDebut: "2026-07-01",
          periodeFin: "2026-07-31",
          salaireBase: 50000,
          heuresSupplementaires: 0,
          tauxHeureSupp: 0,
          montantHeuresSupp: 0,
          primes: 0,
          deductions: 0,
          salaireNet: 50000,
          dateGeneration: "2026-07-01",
          statut: "valide",
          modeGeneration: "manuel",
        },
      ])
    )

    serviceEtatSalaire.marquerPaye("etat-1")

    const journal = serviceComptabiliteFacade.obtenirJournal()

    expect(journal.some(entry => entry.source === "salaire" && entry.type === "sortie" && entry.montant === 50000)).toBe(true)
  })

  it("enregistre les paiements de vacataires dans le journal comptable principal", () => {
    localStorage.setItem(
      "personnel_administratif",
      JSON.stringify([
        {
          id: "pers-2",
          prenom: "Moussa",
          nom: "Ndiaye",
          poste: "Vacataire",
          statut: "actif",
        },
      ])
    )

    localStorage.setItem(
      "heures_vacataires",
      JSON.stringify([
        {
          id: "heure-1",
          vacataireId: "pers-2",
          date: "2026-07-12",
          heuresTravaillees: 5,
          tauxHoraire: 2000,
          montant: 10000,
          statut: "valide",
        },
      ])
    )

    serviceHeuresVacataires.marquerPaye("heure-1")

    const journal = serviceComptabiliteFacade.obtenirJournal()

    expect(journal.some(entry => entry.source === "vacataire" && entry.type === "sortie" && entry.montant === 10000)).toBe(true)
  })

  it("n'enregistre pas plusieurs fois la même dépense payée dans le journal comptable", () => {
    serviceDepenses.ajouterDepense({
      categorieId: "cat-fournitures",
      nom: "Achat papier",
      description: "Papier pour bureau",
      montant: 5000,
      date: "2026-07-12",
      statut: "en_attente",
      fournisseur: "Fournisseur A",
      reference: "DEP-001",
    })

    const depense = serviceDepenses.obtenirToutesLesDepenses()[0]

    serviceDepenses.marquerCommePayee(depense.id)
    serviceDepenses.marquerCommePayee(depense.id)

    const journal = serviceComptabiliteFacade.obtenirJournal()
    const depensesJournal = journal.filter(entry => entry.reference === `Depense #${depense.id}`)

    expect(depensesJournal).toHaveLength(1)
  })

  it("n'expose pas un compte de stock dans le plan comptable d'un établissement scolaire", () => {
    const comptes = serviceComptabilite.obtenirTousLesComptes()

    expect(comptes.some(compte => compte.nom === "Stocks")).toBe(false)
  })
})
