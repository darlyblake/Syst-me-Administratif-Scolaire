const safeLocalStorage =
  typeof window !== "undefined"
    ? localStorage
    : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as any)

import type { DonneesEleve, DossierTransfert } from "@/types/models"
import { serviceEleves } from "./eleves.service"
import { genererCodeUnique } from "@/utils/codeGenerator"

class TransfertService {
  private readonly CLE = "transferts_inter_ecoles"

  private lire(): DossierTransfert[] {
    try {
      const raw = safeLocalStorage.getItem(this.CLE)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private sauver(data: DossierTransfert[]) {
    safeLocalStorage.setItem(this.CLE, JSON.stringify(data))
  }

  /** Crée un dossier SANS aucune info de paiement */
  creerDossier(eleve: DonneesEleve, motif: string, ecoleOrigine = "Mon établissement"): DossierTransfert {
    const dossier: DossierTransfert = {
      id: `trf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      code: genererCodeUnique(),
      dateCreation: new Date().toISOString(),
      motif,
      ecoleOrigine,
      eleve: {
        nom: eleve.nom,
        prenom: eleve.prenom,
        dateNaissance: eleve.dateNaissance,
        lieuNaissance: eleve.lieuNaissance,
        sexe: eleve.sexe,
        classe: eleve.classe,
        nomParent: eleve.nomParent,
        contactParent: eleve.contactParent,
        adresse: eleve.adresse,
        informationsContact: eleve.informationsContact,
      },
      statut: "en_attente",
    }

    const all = this.lire()
    all.push(dossier)
    this.sauver(all)

    // Marque l'élève comme transféré localement
    if (eleve.id) {
      serviceEleves.changerStatutEleve(eleve.id, "transfere" as any)
    }

    return dossier
  }

  trouverParCode(code: string): DossierTransfert | null {
    return this.lire().find((d) => d.code === code && d.statut === "en_attente") || null
  }

  importerDepuisJSON(json: string): DossierTransfert | null {
    try {
      const data = JSON.parse(json) as DossierTransfert
      if (!data.eleve?.nom || !data.eleve?.prenom) return null
      // On ne garde jamais de champs paiement s'ils existent
      const clean: DossierTransfert = {
        ...data,
        id: data.id || `trf_import_${Date.now()}`,
        statut: "en_attente",
      }
      const all = this.lire()
      if (!all.find((d) => d.code === clean.code)) {
        all.push(clean)
        this.sauver(all)
      }
      return clean
    } catch {
      return null
    }
  }

  accepter(code: string, classeAccueil: string): DonneesEleve | null {
    const all = this.lire()
    const idx = all.findIndex((d) => d.code === code)
    if (idx === -1) return null

    const d = all[idx]
    d.statut = "accepte"
    d.classeAccueil = classeAccueil
    d.dateTraitement = new Date().toISOString()
    this.sauver(all)

    // Crée l'élève localement (sans paiements)
    const nouvelEleve = serviceEleves.ajouterEleve({
      nom: d.eleve.nom,
      prenom: d.eleve.prenom,
      dateNaissance: d.eleve.dateNaissance,
      lieuNaissance: d.eleve.lieuNaissance,
      sexe: d.eleve.sexe,
      classe: classeAccueil,
      nomParent: d.eleve.nomParent,
      contactParent: d.eleve.contactParent,
      adresse: d.eleve.adresse,
      totalAPayer: 0,
      typeInscription: "inscription",
      informationsContact: d.eleve.informationsContact || {
        telephone: d.eleve.contactParent,
        email: "",
        adresse: d.eleve.adresse,
      },
      modePaiement: "mensuel",
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
    } as any)

    return nouvelEleve
  }

  refuser(code: string, motifRefus: string) {
    const all = this.lire()
    const idx = all.findIndex((d) => d.code === code)
    if (idx === -1) return false
    all[idx].statut = "refuse"
    all[idx].motifRefus = motifRefus
    all[idx].dateTraitement = new Date().toISOString()
    this.sauver(all)
    return true
  }

  getEnAttente(): DossierTransfert[] {
    return this.lire().filter((d) => d.statut === "en_attente")
  }

  exporterJSON(dossier: DossierTransfert): string {
    // Strip au cas où
    const { ...safe } = dossier
    return JSON.stringify(safe, null, 2)
  }
}

export const serviceTransfert = new TransfertService()
