const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de génération et gestion des documents
 */

export interface Document {
  id: string
  type: "certificat_scolarite" | "attestation_assurance" | "recu_paiement" | "convocation" | "fiche_inscription" | "dossier_transfert" | "bulletin"
  eleveId: string
  dateGeneration: string
  dateValidite?: string
  contenu: string
  statut: "genere" | "imprime" | "envoye"
}

class ServiceDocuments {
  private readonly CLE_STOCKAGE = "documents_ecole"

  /**
   * Récupère tous les documents
   */
  obtenirTousLesDocuments(): Document[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les documents
   */
  private sauvegarderDocuments(documents: Document[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(documents))
  }

  /**
   * Récupère les documents d'un élève
   */
  obtenirDocumentsEleve(eleveId: string): Document[] {
    const documents = this.obtenirTousLesDocuments()
    return documents.filter(d => d.eleveId === eleveId)
  }

  /**
   * Récupère les documents par type
   */
  obtenirDocumentsParType(type: Document["type"]): Document[] {
    const documents = this.obtenirTousLesDocuments()
    return documents.filter(d => d.type === type)
  }

  /**
   * Génère un certificat de scolarité
   */
  genererCertificatScolarite(eleveId: string, donneesEleve: any): Document {
    const contenu = `
CERTIFICAT DE SCOLARITÉ

Je soussigné, Directeur de l'établissement, certifie que l'élève :
${donneesEleve.prenom} ${donneesEleve.nom}
Né(e) le ${new Date(donneesEleve.dateNaissance).toLocaleDateString('fr-FR')}
Est régulièrement inscrit(e) dans notre établissement pour l'année scolaire ${new Date().getFullYear()}-${new Date().getFullYear() + 1}.

Ce certificat est délivré pour servir et valoir ce que de droit.

Fait à ${donneesEleve.ville || 'ville'}, le ${new Date().toLocaleDateString('fr-FR')}

Le Directeur
    `.trim()

    const document: Document = {
      id: `doc-cert-${Date.now()}`,
      type: "certificat_scolarite",
      eleveId,
      dateGeneration: new Date().toISOString(),
      dateValidite: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      contenu,
      statut: "genere"
    }

    return this.sauveguarderDocument(document)
  }

  /**
   * Génère une attestation d'assurance
   */
  genererAttestationAssurance(eleveId: string, donneesEleve: any): Document {
    const contenu = `
ATTESTATION D'ASSURANCE SCOLAIRE

L'assurance scolaire a été souscrite pour l'élève :
${donneesEleve.prenom} ${donneesEleve.nom}
Né(e) le ${new Date(donneesEleve.dateNaissance).toLocaleDateString('fr-FR')}

Numéro de contrat : ${donneesEleve.numeroAssurance || 'N/A'}
Compagnie d'assurance : ${donneesEleve.compagnieAssurance || 'N/A'}
Période de validité : Du ${new Date().toLocaleDateString('fr-FR')} au ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR')}

Ce document est délivré pour servir et valoir ce que de droit.

Fait à ${donneesEleve.ville || 'ville'}, le ${new Date().toLocaleDateString('fr-FR')}

Le Directeur
    `.trim()

    const document: Document = {
      id: `doc-ass-${Date.now()}`,
      type: "attestation_assurance",
      eleveId,
      dateGeneration: new Date().toISOString(),
      dateValidite: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      contenu,
      statut: "genere"
    }

    return this.sauveguarderDocument(document)
  }

  /**
   * Génère un reçu de paiement
   */
  genererRecuPaiement(eleveId: string, donneesEleve: any, montant: number, motif: string): Document {
    const contenu = `
REÇU DE PAIEMENT

Reçu de l'élève : ${donneesEleve.prenom} ${donneesEleve.nom}
Montant : ${montant.toLocaleString()} FCFA
Motif : ${motif}
Date de paiement : ${new Date().toLocaleDateString('fr-FR')}

Ce reçu est délivré pour servir et valoir ce que de droit.

Fait à ${donneesEleve.ville || 'ville'}, le ${new Date().toLocaleDateString('fr-FR')}

Le Comptable
    `.trim()

    const document: Document = {
      id: `doc-recu-${Date.now()}`,
      type: "recu_paiement",
      eleveId,
      dateGeneration: new Date().toISOString(),
      contenu,
      statut: "genere"
    }

    return this.sauveguarderDocument(document)
  }

  /**
   * Génère une convocation
   */
  genererConvocation(eleveId: string, donneesEleve: any, type: string, date: string, heure: string): Document {
    const contenu = `
CONVOCATION

Convocation adressée aux parents de l'élève :
${donneesEleve.prenom} ${donneesEleve.nom}

Type : ${type}
Date : ${new Date(date).toLocaleDateString('fr-FR')}
Heure : ${heure}

La présence des parents est souhaitée.

Fait à ${donneesEleve.ville || 'ville'}, le ${new Date().toLocaleDateString('fr-FR')}

Le Directeur
    `.trim()

    const document: Document = {
      id: `doc-conv-${Date.now()}`,
      type: "convocation",
      eleveId,
      dateGeneration: new Date().toISOString(),
      contenu,
      statut: "genere"
    }

    return this.sauveguarderDocument(document)
  }

  /**
   * Sauvegarde un document
   */
  private sauveguarderDocument(document: Document): Document {
    const documents = this.obtenirTousLesDocuments()
    documents.push(document)
    this.sauvegarderDocuments(documents)
    return document
  }

  /**
   * Supprime un document
   */
  supprimerDocument(id: string): boolean {
    const documents = this.obtenirTousLesDocuments()
    const nouveauxDocuments = documents.filter(d => d.id !== id)
    
    if (nouveauxDocuments.length === documents.length) return false
    
    this.sauvegarderDocuments(nouveauxDocuments)
    return true
  }

  /**
   * Met à jour le statut d'un document
   */
  mettreAJourStatut(id: string, statut: Document["statut"]): boolean {
    const documents = this.obtenirTousLesDocuments()
    const index = documents.findIndex(d => d.id === id)
    
    if (index === -1) return false
    
    documents[index].statut = statut
    this.sauvegarderDocuments(documents)
    return true
  }

  /**
   * Obtient les statistiques de documents
   */
  obtenirStatistiques() {
    const documents = this.obtenirTousLesDocuments()
    const total = documents.length
    const parType: Record<string, number> = {}
    const parStatut: Record<string, number> = {}
    
    documents.forEach(doc => {
      parType[doc.type] = (parType[doc.type] || 0) + 1
      parStatut[doc.statut] = (parStatut[doc.statut] || 0) + 1
    })
    
    return {
      total,
      parType,
      parStatut
    }
  }
}

export const serviceDocuments = new ServiceDocuments()
