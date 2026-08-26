import type { DossierTransfert, TransfertEnAttente, DonneesEleve } from "@/types/models"
import { serviceEleves } from "./eleves.service"
import { serviceParametres } from "./parametres.service"

const CLE_TRANSFERTS = "transferts_inter_ecoles"

const safeLocalStorage =
  typeof window !== "undefined"
    ? localStorage
    : { getItem: () => null, setItem: () => {}, removeItem: () => {} } as any

class ServiceTransfert {
  private obtenirTous(): TransfertEnAttente[] {
    try {
      const data = safeLocalStorage.getItem(CLE_TRANSFERTS)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private sauvegarder(liste: TransfertEnAttente[]) {
    safeLocalStorage.setItem(CLE_TRANSFERTS, JSON.stringify(liste))
  }

  /**
   * Crée un dossier de transfert (sans données de paiement)
   */
  creerDossierTransfert(eleve: DonneesEleve, motif?: string): DossierTransfert {
    const parametres = serviceParametres.obtenirParametres()

    const code = `TRF-${Math.floor(10000 + Math.random() * 90000)}-${new Date().getFullYear()}` 

    const dossier: DossierTransfert = {
      nom: eleve.nom,
      prenom: eleve.prenom,
      dateNaissance: eleve.dateNaissance,
      lieuNaissance: eleve.lieuNaissance,
      sexe: eleve.sexe,
      photo: eleve.photo,
      classePrecedente: eleve.classe,
      anneeAcademiqueOrigine: parametres.anneeAcademique,
      typeInscriptionOrigine: eleve.typeInscription,
      nomParent: eleve.nomParent,
      contactParent: eleve.contactParent,
      adresse: eleve.adresse,
      informationsContact: { ...eleve.informationsContact },
      frereSoeurId: eleve.frereSoeurId,
      lienParente: eleve.lienParente,
      ecoleOriginale: {
        nom: parametres.nomEcole || "École non renseignée",
        telephone: parametres.telephoneEcole,
        email: "", // email n'est pas dans ParametresEcole
      },
      dateTransfert: new Date().toISOString(),
      motif,
      codeTransfert: code,
      version: "1.0",
    }

    return dossier
  }

  /**
   * Enregistre un transfert sortant et marque l'élève comme transféré
   */
  envoyerTransfert(eleveId: string, motif?: string): { dossier: DossierTransfert; transfert: TransfertEnAttente } {
    const eleve = serviceEleves.obtenirEleveParId(eleveId)
    if (!eleve) throw new Error("Élève introuvable")

    const dossier = this.creerDossierTransfert(eleve, motif)

    const transfert: TransfertEnAttente = {
      id: `trf_${Date.now()}`,
      codeTransfert: dossier.codeTransfert,
      dossier,
      direction: "sortant",
      statut: "en_attente",
      dateCreation: new Date().toISOString(),
      eleveLocalId: eleveId,
    }

    const liste = this.obtenirTous()
    liste.push(transfert)
    this.sauvegarder(liste)

    // Marquer l'élève comme inactif / transféré
    serviceEleves.changerStatutEleve(eleveId, "inactif")

    return { dossier, transfert }
  }

  /**
   * Importe un dossier (par code ou objet JSON)
   */
  importerDossier(dossier: DossierTransfert): TransfertEnAttente {
    // Vérifier si déjà importé
    const existant = this.obtenirTous().find(
      (t) => t.codeTransfert === dossier.codeTransfert && t.direction === "entrant"
    )
    if (existant) return existant

    const transfert: TransfertEnAttente = {
      id: `trf_in_${Date.now()}`,
      codeTransfert: dossier.codeTransfert,
      dossier,
      direction: "entrant",
      statut: "en_attente",
      dateCreation: new Date().toISOString(),
    }

    const liste = this.obtenirTous()
    liste.push(transfert)
    this.sauvegarder(liste)

    return transfert
  }

  /**
   * Accepte un transfert entrant → crée l'élève localement
   */
  accepterTransfert(
    codeTransfert: string,
    classeChoisie: string
  ): DonneesEleve {
    const liste = this.obtenirTous()
    const index = liste.findIndex(
      (t) => t.codeTransfert === codeTransfert && t.direction === "entrant"
    )
    if (index === -1) throw new Error("Transfert introuvable")

    const transfert = liste[index]
    if (transfert.statut !== "en_attente") {
      throw new Error("Ce transfert a déjà été traité")
    }

    const d = transfert.dossier

    // Création de l'élève SANS les données de paiement
    const nouvelEleve = serviceEleves.ajouterEleve({
      nom: d.nom,
      prenom: d.prenom,
      dateNaissance: d.dateNaissance,
      lieuNaissance: d.lieuNaissance,
      sexe: d.sexe,
      classe: classeChoisie,
      nomParent: d.nomParent,
      contactParent: d.contactParent,
      adresse: d.adresse,
      typeInscription: "inscription",
      totalAPayer: 0,
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
      informationsContact: d.informationsContact,
      photo: d.photo,
      frereSoeurId: d.frereSoeurId,
      lienParente: d.lienParente,
    } as any)

    // Mise à jour du statut du transfert
    liste[index] = {
      ...transfert,
      statut: "accepte",
      dateDecision: new Date().toISOString(),
      eleveLocalId: nouvelEleve.id,
    }
    this.sauvegarder(liste)

    return nouvelEleve
  }

  /**
   * Refuse un transfert entrant
   */
  refuserTransfert(codeTransfert: string, motifRefus?: string) {
    const liste = this.obtenirTous()
    const index = liste.findIndex(
      (t) => t.codeTransfert === codeTransfert && t.direction === "entrant"
    )
    if (index === -1) throw new Error("Transfert introuvable")

    liste[index] = {
      ...liste[index],
      statut: "refuse",
      dateDecision: new Date().toISOString(),
      motifRefus,
    }
    this.sauvegarder(liste)
  }

  obtenirTransfertsEntrants(): TransfertEnAttente[] {
    return this.obtenirTous().filter((t) => t.direction === "entrant")
  }

  obtenirTransfertsSortants(): TransfertEnAttente[] {
    return this.obtenirTous().filter((t) => t.direction === "sortant")
  }

  trouverParCode(code: string): TransfertEnAttente | undefined {
    return this.obtenirTous().find((t) => t.codeTransfert === code)
  }
}

export const serviceTransfert = new ServiceTransfert()
