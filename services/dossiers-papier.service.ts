const safeLocalStorage =
  typeof window !== "undefined"
    ? localStorage
    : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as any)

import type {
  DossierPapier,
  PieceDossier,
  EmpruntDossier,
  StatutDossierPapier,
} from "@/types/models"

const PIECES_DEFAUT: Omit<PieceDossier, "presente" | "dateAjout">[] = [
  { id: "acte_naissance", nom: "Acte de naissance", obligatoire: true },
  { id: "photo", nom: "Photo d'identité", obligatoire: true },
  { id: "certificat_scolarite", nom: "Certificat de scolarité précédent", obligatoire: false },
  { id: "fiche_medicale", nom: "Fiche médicale", obligatoire: true },
  { id: "assurance", nom: "Attestation d'assurance", obligatoire: false },
  { id: "livret", nom: "Livret scolaire / bulletins", obligatoire: false },
  { id: "autorisation", nom: "Autorisation parentale", obligatoire: true },
]

class ServiceDossiersPapier {
  private readonly CLE = "dossiers_papier"

  private lire(): DossierPapier[] {
    try {
      const raw = safeLocalStorage.getItem(this.CLE)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private sauver(data: DossierPapier[]) {
    safeLocalStorage.setItem(this.CLE, JSON.stringify(data))
  }

  private recalculerStatut(dossier: DossierPapier): StatutDossierPapier {
    if (dossier.statut === "archive") return "archive"
    const empruntOuvert = dossier.emprunts.some((e) => !e.rendu)
    if (empruntOuvert) return "emprunte"
    const manquantes = dossier.pieces.filter((p) => p.obligatoire && !p.presente)
    return manquantes.length === 0 ? "complet" : "incomplet"
  }

  /** Création auto à l'inscription ou à l'acceptation d'un transfert */
  creerPourEleve(eleveId: string, emplacement?: string): DossierPapier {
    const existant = this.obtenirParEleveId(eleveId)
    if (existant) return existant

    const now = new Date().toISOString()
    const pieces: PieceDossier[] = PIECES_DEFAUT.map((p) => ({
      ...p,
      presente: false,
    }))

    const dossier: DossierPapier = {
      id: `dp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eleveId,
      statut: "incomplet",
      pieces,
      emprunts: [],
      emplacement: emplacement || "",
      dateCreation: now,
      dateMiseAJour: now,
    }

    const all = this.lire()
    all.push(dossier)
    this.sauver(all)
    return dossier
  }

  obtenirTous(): DossierPapier[] {
    return this.lire()
  }

  obtenirParEleveId(eleveId: string): DossierPapier | null {
    return this.lire().find((d) => d.eleveId === eleveId) || null
  }

  obtenirParId(id: string): DossierPapier | null {
    return this.lire().find((d) => d.id === id) || null
  }

  togglePiece(dossierId: string, pieceId: string, presente: boolean): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false

    const piece = all[idx].pieces.find((p) => p.id === pieceId)
    if (!piece) return false

    piece.presente = presente
    piece.dateAjout = presente ? new Date().toISOString() : undefined
    all[idx].dateMiseAJour = new Date().toISOString()
    all[idx].statut = this.recalculerStatut(all[idx])
    this.sauver(all)
    return true
  }

  setEmplacement(dossierId: string, emplacement: string): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false
    all[idx].emplacement = emplacement
    all[idx].dateMiseAJour = new Date().toISOString()
    this.sauver(all)
    return true
  }

  setNotes(dossierId: string, notes: string): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false
    all[idx].notes = notes
    all[idx].dateMiseAJour = new Date().toISOString()
    this.sauver(all)
    return true
  }

  emprunter(
    dossierId: string,
    empruntePar: string,
    motif: string,
    dateRetourPrevue?: string
  ): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false
    if (all[idx].emprunts.some((e) => !e.rendu)) return false // déjà emprunté

    const emprunt: EmpruntDossier = {
      id: `emp_${Date.now()}`,
      empruntePar,
      motif,
      dateSortie: new Date().toISOString(),
      dateRetourPrevue,
      rendu: false,
    }
    all[idx].emprunts.push(emprunt)
    all[idx].statut = "emprunte"
    all[idx].dateMiseAJour = new Date().toISOString()
    this.sauver(all)
    return true
  }

  rendre(dossierId: string): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false

    const ouvert = all[idx].emprunts.find((e) => !e.rendu)
    if (!ouvert) return false

    ouvert.rendu = true
    ouvert.dateRetourEffective = new Date().toISOString()
    all[idx].dateMiseAJour = new Date().toISOString()
    all[idx].statut = this.recalculerStatut(all[idx])
    this.sauver(all)
    return true
  }

  archiver(dossierId: string): boolean {
    const all = this.lire()
    const idx = all.findIndex((d) => d.id === dossierId)
    if (idx === -1) return false
    all[idx].statut = "archive"
    all[idx].dateMiseAJour = new Date().toISOString()
    this.sauver(all)
    return true
  }

  piecesManquantes(dossier: DossierPapier): PieceDossier[] {
    return dossier.pieces.filter((p) => p.obligatoire && !p.presente)
  }
}

export const serviceDossiersPapier = new ServiceDossiersPapier()
