const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
export type TypeJournalComptable = "entree" | "sortie"
export type SourceJournalComptable = "paiement" | "depense" | "salaire" | "vacataire" | "mouvement" | "autre"
export type StatutJournalComptable = "brouillon" | "valide" | "payee" | "annule"

export interface ContexteJournalComptable {
  eleveId?: string
  eleveNom?: string
  personnelId?: string
  personnelNom?: string
  classe?: string
  mois?: string[]
  fournisseur?: string
  poste?: string
  compteId?: string
}

export interface JournalComptableEntry {
  id: string
  type: TypeJournalComptable
  categorie: string
  description: string
  montant: number
  date: string
  reference?: string
  statut: StatutJournalComptable
  source: SourceJournalComptable
  contexte?: ContexteJournalComptable
  creeLe: string
}

class ServiceComptabiliteFacade {
  private readonly STORAGE_KEY = "journal_comptable"

  obtenirJournal(): JournalComptableEntry[] {
    try {
      if (typeof window === "undefined") return []

      const donnees = safeLocalStorage.getItem(this.STORAGE_KEY)
      const journal = donnees ? JSON.parse(donnees) as JournalComptableEntry[] : []

      return journal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } catch (error) {
      console.error("Erreur lors de la récupération du journal comptable local:", error)
      return []
    }
  }

  enregistrerTransaction(transaction: Omit<JournalComptableEntry, "id" | "creeLe">): string {
    if (typeof window === "undefined") {
      return ""
    }

    const journal = this.obtenirJournalBrut()
    const reference = transaction.reference?.trim() || undefined
    const id = reference || `jrn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const existingIndex = reference
      ? journal.findIndex(entry => entry.reference === reference)
      : -1

    const entree: JournalComptableEntry = {
      ...transaction,
      id,
      creeLe: existingIndex !== -1 ? journal[existingIndex].creeLe : new Date().toISOString(),
    }

    if (existingIndex !== -1) {
      journal[existingIndex] = {
        ...journal[existingIndex],
        ...entree,
      }
    } else {
      journal.push(entree)
    }

    this.sauvegarderJournal(journal)

    return entree.id
  }

  obtenirTotalEntrees(dateDebut?: string, dateFin?: string): number {
    return this.filtrerParPeriode(this.obtenirJournal().filter(entry => entry.type === "entree"), dateDebut, dateFin)
      .reduce((total, entry) => total + entry.montant, 0)
  }

  obtenirTotalSorties(dateDebut?: string, dateFin?: string): number {
    return this.filtrerParPeriode(this.obtenirJournal().filter(entry => entry.type === "sortie"), dateDebut, dateFin)
      .reduce((total, entry) => total + entry.montant, 0)
  }

  obtenirSolde(dateDebut?: string, dateFin?: string): number {
    return this.obtenirTotalEntrees(dateDebut, dateFin) - this.obtenirTotalSorties(dateDebut, dateFin)
  }

  mettreAJourStatutTransaction(idOuReference: string, statut: StatutJournalComptable): boolean {
    if (typeof window === "undefined") return false

    const journal = this.obtenirJournalBrut()
    const index = journal.findIndex(entry => entry.id === idOuReference || entry.reference === idOuReference)

    if (index === -1) {
      return false
    }

    journal[index].statut = statut
    this.sauvegarderJournal(journal)
    return true
  }

  obtenirStatistiquesParCategorie(dateDebut?: string, dateFin?: string): Array<{ categorie: string; entrees: number; sorties: number; solde: number }> {
    const journal = this.filtrerParPeriode(this.obtenirJournal(), dateDebut, dateFin)
    const categories = Array.from(new Set(journal.map(entry => entry.categorie)))

    return categories.map(categorie => {
      const entrees = journal
        .filter(entry => entry.categorie === categorie && entry.type === "entree")
        .reduce((total, entry) => total + entry.montant, 0)

      const sorties = journal
        .filter(entry => entry.categorie === categorie && entry.type === "sortie")
        .reduce((total, entry) => total + entry.montant, 0)

      return {
        categorie,
        entrees,
        sorties,
        solde: entrees - sorties,
      }
    }).sort((a, b) => b.solde - a.solde)
  }

  obtenirStatistiquesMensuelles(annee: number): Array<{ mois: string; entrees: number; sorties: number; solde: number }> {
    const moisNoms = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ]

    return moisNoms.map((mois, index) => {
      const dateDebut = new Date(annee, index, 1).toISOString().split("T")[0]
      const dateFin = new Date(annee, index + 1, 0).toISOString().split("T")[0]

      const entrees = this.obtenirTotalEntrees(dateDebut, dateFin)
      const sorties = this.obtenirTotalSorties(dateDebut, dateFin)

      return {
        mois,
        entrees,
        sorties,
        solde: entrees - sorties,
      }
    })
  }

  exporterJournalCSV(dateDebut?: string, dateFin?: string): string {
    const journal = this.filtrerParPeriode(this.obtenirJournal(), dateDebut, dateFin)

    const colonnes = [
      "type",
      "categorie",
      "description",
      "montant",
      "date",
      "reference",
      "statut",
      "source",
      "eleveId",
      "eleveNom",
      "personnelId",
      "personnelNom",
      "classe",
      "mois",
      "fournisseur",
      "poste",
      "compteId",
    ]

    const lignes = journal.map(entry => {
      const contexte = entry.contexte || {}
      const ligne = [
        entry.type,
        entry.categorie,
        entry.description,
        entry.montant,
        entry.date,
        entry.reference || "",
        entry.statut,
        entry.source,
        contexte.eleveId || "",
        contexte.eleveNom || "",
        contexte.personnelId || "",
        contexte.personnelNom || "",
        contexte.classe || "",
        (contexte.mois || []).join(" | "),
        contexte.fournisseur || "",
        contexte.poste || "",
        contexte.compteId || "",
      ]

      return ligne.map(valeur => this.escapeCsvValue(String(valeur))).join(",")
    })

    return [colonnes.join(","), ...lignes].join("\n")
  }

  supprimerTransaction(idOuReference: string): boolean {
    if (typeof window === "undefined") return false

    const journal = this.obtenirJournalBrut()
    const index = journal.findIndex(entry => entry.id === idOuReference || entry.reference === idOuReference)

    if (index === -1) {
      return false
    }

    journal.splice(index, 1)
    this.sauvegarderJournal(journal)
    return true
  }

  private obtenirJournalBrut(): JournalComptableEntry[] {
    try {
      if (typeof window === "undefined") return []

      const donnees = safeLocalStorage.getItem(this.STORAGE_KEY)
      return donnees ? JSON.parse(donnees) as JournalComptableEntry[] : []
    } catch (error) {
      console.error("Erreur lors de la lecture du journal comptable local:", error)
      return []
    }
  }

  private sauvegarderJournal(journal: JournalComptableEntry[]): void {
    if (typeof window === "undefined") return
    safeLocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(journal))
  }

  private filtrerParPeriode(entries: JournalComptableEntry[], dateDebut?: string, dateFin?: string): JournalComptableEntry[] {
    if (!dateDebut || !dateFin) {
      return entries
    }

    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)

    return entries.filter(entry => {
      const date = new Date(entry.date)
      return date >= debut && date <= fin
    })
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""')
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
  }
}

export const serviceComptabiliteFacade = new ServiceComptabiliteFacade()
