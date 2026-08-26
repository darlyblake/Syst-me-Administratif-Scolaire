const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service de gestion de l'archivage des élèves
 */

export interface EleveArchive {
  id: string
  nom: string
  prenom: string
  dateNaissance: string
  dateInscription: string
  dateArchivage: string
  motifArchivage: string
  classeDerniere: string
  anneeScolaire: string
  statut: "actif" | "inactif" | "archive"
  donneesCompletes: any
}

class ServiceArchivage {
  private readonly CLE_STOCKAGE = "eleves_archives"

  /**
   * Récupère tous les élèves archivés
   */
  obtenirTousLesArchives(): EleveArchive[] {
    try {
      const donnees = safeLocalStorage.getItem(this.CLE_STOCKAGE)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Sauvegarde les élèves archivés
   */
  private sauvegarderArchives(archives: EleveArchive[]): void {
    safeLocalStorage.setItem(this.CLE_STOCKAGE, JSON.stringify(archives))
  }

  /**
   * Archive un élève
   */
  archiverEleve(eleve: any, motif: string): EleveArchive {
    const archives = this.obtenirTousLesArchives()
    
    const nouvelArchive: EleveArchive = {
      id: eleve.id,
      nom: eleve.nom,
      prenom: eleve.prenom,
      dateNaissance: eleve.dateNaissance,
      dateInscription: eleve.dateInscription || new Date().toISOString(),
      dateArchivage: new Date().toISOString(),
      motifArchivage: motif,
      classeDerniere: eleve.classeId || "",
      anneeScolaire: new Date().getFullYear().toString(),
      statut: "archive",
      donneesCompletes: eleve
    }
    
    archives.push(nouvelArchive)
    this.sauvegarderArchives(archives)
    return nouvelArchive
  }

  /**
   * Désarchive un élève
   */
  desarchiverEleve(id: string): boolean {
    const archives = this.obtenirTousLesArchives()
    const index = archives.findIndex(a => a.id === id)
    
    if (index === -1) return false
    
    archives.splice(index, 1)
    this.sauvegarderArchives(archives)
    return true
  }

  /**
   * Récupère les élèves archivés par année scolaire
   */
  obtenirArchivesParAnnee(annee: string): EleveArchive[] {
    const archives = this.obtenirTousLesArchives()
    return archives.filter(a => a.anneeScolaire === annee)
  }

  /**
   * Récupère les élèves archivés par motif
   */
  obtenirArchivesParMotif(motif: string): EleveArchive[] {
    const archives = this.obtenirTousLesArchives()
    return archives.filter(a => a.motifArchivage.toLowerCase().includes(motif.toLowerCase()))
  }

  /**
   * Exporte les données complètes d'un élève archivé
   */
  exporterDonneesEleve(id: string): any | null {
    const archive = this.obtenirTousLesArchives().find(a => a.id === id)
    return archive?.donneesCompletes || null
  }

  /**
   * Obtient les statistiques d'archivage
   */
  obtenirStatistiques() {
    const archives = this.obtenirTousLesArchives()
    const total = archives.length
    const parAnnee: Record<string, number> = {}
    const parMotif: Record<string, number> = {}
    
    archives.forEach(archive => {
      parAnnee[archive.anneeScolaire] = (parAnnee[archive.anneeScolaire] || 0) + 1
      parMotif[archive.motifArchivage] = (parMotif[archive.motifArchivage] || 0) + 1
    })
    
    return {
      total,
      parAnnee,
      parMotif
    }
  }
}

export const serviceArchivage = new ServiceArchivage()
