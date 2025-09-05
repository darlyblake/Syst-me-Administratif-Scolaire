/**
 * Service de gestion des élèves
 * Contient toute la logique métier liée aux élèves
 */

import type { DonneesEleve } from "@/types/models"

class ServiceEleves {
  private readonly CLE_STOCKAGE_ELEVES = "eleves"

  /**
   * Récupère tous les élèves
   */
  obtenirTousLesEleves(): DonneesEleve[] {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_ELEVES)
      return donnees ? JSON.parse(donnees) : []
    } catch {
      return []
    }
  }

  /**
   * Ajoute un nouvel élève avec identifiants générés automatiquement
   */
  ajouterEleve(eleve: Omit<DonneesEleve, "id" | "identifiant" | "motDePasse">): DonneesEleve {
    const nouvelEleve: DonneesEleve = {
      ...eleve,
      id: this.genererIdUnique(),
      identifiant: this.genererIdentifiant(eleve.nom, eleve.prenom),
      motDePasse: this.genererMotDePasseUnique(),
      dateInscription: new Date().toISOString(),
      statut: "actif",
    }

    const eleves = this.obtenirTousLesEleves()
    eleves.push(nouvelEleve)
    this.sauvegarderEleves(eleves)

    return nouvelEleve
  }

  /**
   * Met à jour un élève existant
   */
  modifierEleve(eleveModifie: DonneesEleve): boolean {
    const eleves = this.obtenirTousLesEleves()
    const index = eleves.findIndex((e) => e.id === eleveModifie.id)

    if (index === -1) return false

    eleves[index] = { ...eleveModifie }
    this.sauvegarderEleves(eleves)
    return true
  }

  /**
   * Archive un élève (changement de statut plutôt que suppression)
   */
  archiverEleve(id: string): boolean {
    const eleves = this.obtenirTousLesEleves()
    const index = eleves.findIndex((e) => e.id === id)

    if (index === -1) return false

    eleves[index].statut = "inactif"
    this.sauvegarderEleves(eleves)
    return true
  }

  /**
   * Supprime définitivement un élève
   */
  supprimerEleve(id: string): boolean {
    const eleves = this.obtenirTousLesEleves()
    const elevesFiltrés = eleves.filter((e) => e.id !== id)

    if (elevesFiltrés.length === eleves.length) return false

    this.sauvegarderEleves(elevesFiltrés)
    return true
  }

  /**
   * Recherche des élèves par critères
   */
  rechercherEleves(criteres: {
    nom?: string
    prenom?: string
    identifiant?: string
    classe?: string
    statut?: DonneesEleve["statut"]
  }): DonneesEleve[] {
    const eleves = this.obtenirTousLesEleves()

    return eleves.filter((eleve) => {
      if (criteres.nom && !eleve.nom.toLowerCase().includes(criteres.nom.toLowerCase())) {
        return false
      }
      if (criteres.prenom && !eleve.prenom.toLowerCase().includes(criteres.prenom.toLowerCase())) {
        return false
      }
      if (criteres.identifiant && !eleve.identifiant.toLowerCase().includes(criteres.identifiant.toLowerCase())) {
        return false
      }
      if (criteres.classe && eleve.classe !== criteres.classe) {
        return false
      }
      if (criteres.statut && eleve.statut !== criteres.statut) {
        return false
      }
      return true
    })
  }

  /**
   * Obtient les classes actives
   */
  obtenirClassesActives(): string[] {
    const eleves = this.obtenirTousLesEleves()
    return [...new Set(eleves.map((e) => e.classe))].sort()
  }

  /**
   * Obtient les statistiques par classe
   */
  obtenirStatistiquesParClasse(): { [classe: string]: number } {
    const eleves = this.obtenirTousLesEleves()
    const stats: { [classe: string]: number } = {}
    
    eleves.forEach((eleve) => {
      stats[eleve.classe] = (stats[eleve.classe] || 0) + 1
    })
    
    return stats
  }

  /**
   * Obtient les statistiques par statut
   */
  obtenirStatistiquesParStatut(): { actif: number; inactif: number } {
    const eleves = this.obtenirTousLesEleves()
    const stats = { actif: 0, inactif: 0 }
    
    eleves.forEach((eleve) => {
      if (eleve.statut === "actif") {
        stats.actif++
      } else {
        stats.inactif++
      }
    })
    
    return stats
  }

  /**
   * Change le statut d'un élève
   */
  changerStatutEleve(id: string, nouveauStatut: "actif" | "inactif"): boolean {
    const eleves = this.obtenirTousLesEleves()
    const index = eleves.findIndex((e) => e.id === id)

    if (index === -1) return false

    eleves[index].statut = nouveauStatut
    this.sauvegarderEleves(eleves)
    return true
  }

  /**
   * Exporte les données des élèves au format CSV
   */
  exporterElevesCSV(): string {
    const eleves = this.obtenirTousLesEleves()
    const entetes = ["Nom", "Prénom", "Identifiant", "Classe", "Statut", "Téléphone", "Email", "Adresse", "Date d'inscription"]
    
    const lignes = eleves.map(eleve => [
      `"${eleve.nom}"`,
      `"${eleve.prenom}"`,
      `"${eleve.identifiant}"`,
      `"${eleve.classe}"`,
      `"${eleve.statut}"`,
      `"${eleve.informationsContact.telephone || ''}"`,
      `"${eleve.informationsContact.email || ''}"`,
      `"${eleve.informationsContact.adresse || ''}"`,
      `"${new Date(eleve.dateInscription).toLocaleDateString()}"`
    ].join(","))
    
    return [entetes.join(","), ...lignes].join("\n")
  }

  /**
   * Exporte les identifiants des élèves au format CSV
   */
  exporterIdentifiantsCSV(): string {
    const eleves = this.obtenirTousLesEleves()
    const entetes = ["Nom", "Prénom", "Identifiant", "Mot de passe"]
    
    const lignes = eleves.map(eleve => [
      `"${eleve.nom}"`,
      `"${eleve.prenom}"`,
      `"${eleve.identifiant}"`,
      `"${eleve.motDePasse}"`
    ].join(","))
    
    return [entetes.join(","), ...lignes].join("\n")
  }

  /**
   * Importe des élèves depuis un fichier CSV
   */
  importerElevesCSV(csvData: string): { succes: number; erreurs: number } {
    const lignes = csvData.split("\n").filter(ligne => ligne.trim())
    if (lignes.length < 2) return { succes: 0, erreurs: 0 }
    
    const entetes = lignes[0].split(",").map(entete => entete.trim().replace(/"/g, ''))
    let succes = 0
    let erreurs = 0
    
    for (let i = 1; i < lignes.length; i++) {
      try {
        const valeurs = this.parserLigneCSV(lignes[i])
        if (valeurs.length < entetes.length) continue
        
        const donneesEleve: any = {
          nom: valeurs[entetes.indexOf("Nom")] || "",
          prenom: valeurs[entetes.indexOf("Prénom")] || "",
          dateNaissance: valeurs[entetes.indexOf("Date de naissance")] || "",
          classe: valeurs[entetes.indexOf("Classe")] || "",
          totalAPayer: Number(valeurs[entetes.indexOf("Total à payer")]) || 0,
          informationsContact: {
            telephone: valeurs[entetes.indexOf("Téléphone")] || "",
            email: valeurs[entetes.indexOf("Email")] || "",
            adresse: valeurs[entetes.indexOf("Adresse")] || "",
          },
          photo: valeurs[entetes.indexOf("Photo")] || "",
        }
        
        // Vérification des champs obligatoires
        if (donneesEleve.nom && donneesEleve.prenom && donneesEleve.classe) {
          this.ajouterEleve(donneesEleve)
          succes++
        } else {
          erreurs++
        }
      } catch {
        erreurs++
      }
    }
    
    return { succes, erreurs }
  }

  /**
   * Parse une ligne CSV en tenant compte des guillemets et des virgules dans les champs
   */
  private parserLigneCSV(ligne: string): string[] {
    const resultat: string[] = []
    let dansGuillemets = false
    let valeurCourante = ""
    
    for (let i = 0; i < ligne.length; i++) {
      const char = ligne[i]
      
      if (char === '"') {
        dansGuillemets = !dansGuillemets
      } else if (char === ',' && !dansGuillemets) {
        resultat.push(valeurCourante.trim())
        valeurCourante = ""
      } else {
        valeurCourante += char
      }
    }
    
    resultat.push(valeurCourante.trim())
    return resultat.map(v => v.replace(/^"|"$/g, ''))
  }

  private sauvegarderEleves(eleves: DonneesEleve[]): void {
    localStorage.setItem(this.CLE_STOCKAGE_ELEVES, JSON.stringify(eleves))
  }

  private genererIdUnique(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  private genererIdentifiant(nom: string, prenom: string): string {
    const nomNormalise = nom.toLowerCase().replace(/[^a-z]/g, "")
    const prenomNormalise = prenom.toLowerCase().replace(/[^a-z]/g, "")
    const suffixe = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `elv${prenomNormalise.substring(0, 2)}${nomNormalise.substring(0, 2)}${suffixe}`
  }

  private genererMotDePasseUnique(): string {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let motDePasse = ""
    for (let i = 0; i < 8; i++) {
      motDePasse += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
    }
    return motDePasse
  }
}

// Instance singleton du service
export const serviceEleves = new ServiceEleves()