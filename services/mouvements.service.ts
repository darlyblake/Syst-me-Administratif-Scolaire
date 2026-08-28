const safeLocalStorage = typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} } as any;
/**
 * Service pour gérer les mouvements financiers (entrées et sorties d'argent)
 */

export interface MouvementFinancier {
  id: string;
  type: "entree" | "sortie";
  categorie: string;
  description: string;
  montant: number;
  date: string;
  reference?: string;
  compteId?: string;
  statut: "valide" | "en_attente" | "annule";
  creeLe: string;
}

const STORAGE_KEY = "mouvements_financiers";

class ServiceMouvements {
  private mouvements: MouvementFinancier[] = [];

  constructor() {
    this.chargerMouvements();
  }

  private chargerMouvements(): void {
    if (typeof window === 'undefined') return;
    
    const donnees = safeLocalStorage.getItem(STORAGE_KEY);
    if (donnees) {
      this.mouvements = JSON.parse(donnees);
    } else {
      // Données par défaut
      this.mouvements = [];
      this.sauvegarderMouvements();
    }
  }

  private sauvegarderMouvements(): void {
    if (typeof window === 'undefined') return;
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(this.mouvements));
  }

  obtenirTousLesMouvements(): MouvementFinancier[] {
    this.chargerMouvements();
    return [...this.mouvements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  obtenirMouvementsParType(type: "entree" | "sortie"): MouvementFinancier[] {
    this.chargerMouvements();
    return this.mouvements.filter(m => m.type === type);
  }

  obtenirMouvementsParPeriode(dateDebut: string, dateFin: string): MouvementFinancier[] {
    this.chargerMouvements();
    return this.mouvements.filter(m => {
      const dateMouvement = new Date(m.date);
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      return dateMouvement >= debut && dateMouvement <= fin;
    });
  }

  obtenirMouvementsFiltres(type: "entree" | "sortie" | "all", dateDebut?: string, dateFin?: string): MouvementFinancier[] {
    this.chargerMouvements();
    let resultats = this.mouvements;

    if (type !== "all") {
      resultats = resultats.filter(m => m.type === type);
    }

    if (dateDebut && dateFin) {
      resultats = resultats.filter(m => {
        const dateMouvement = new Date(m.date);
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        return dateMouvement >= debut && dateMouvement <= fin;
      });
    }

    return resultats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  ajouterMouvement(mouvement: Omit<MouvementFinancier, "id" | "statut" | "creeLe">): MouvementFinancier {
    this.chargerMouvements();

    const nouveauMouvement: MouvementFinancier = {
      ...mouvement,
      id: `mvt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      statut: "valide",
      creeLe: new Date().toISOString()
    };

    this.mouvements.push(nouveauMouvement);
    this.sauvegarderMouvements();
    return nouveauMouvement;
  }

  modifierMouvement(id: string, modifications: Partial<MouvementFinancier>): MouvementFinancier | null {
    this.chargerMouvements();
    const index = this.mouvements.findIndex(m => m.id === id);
    if (index === -1) return null;

    this.mouvements[index] = { ...this.mouvements[index], ...modifications };
    this.sauvegarderMouvements();
    return this.mouvements[index];
  }

  supprimerMouvement(id: string): boolean {
    this.chargerMouvements();
    const index = this.mouvements.findIndex(m => m.id === id);
    if (index === -1) return false;

    this.mouvements.splice(index, 1);
    this.sauvegarderMouvements();
    return true;
  }

  calculerTotalEntrees(dateDebut?: string, dateFin?: string): number {
    this.chargerMouvements();
    const mouvements = dateDebut && dateFin 
      ? this.obtenirMouvementsParPeriode(dateDebut, dateFin).filter(m => m.type === "entree")
      : this.obtenirMouvementsParType("entree");
    return mouvements.reduce((total, m) => total + m.montant, 0);
  }

  calculerTotalSorties(dateDebut?: string, dateFin?: string): number {
    this.chargerMouvements();
    const mouvements = dateDebut && dateFin 
      ? this.obtenirMouvementsParPeriode(dateDebut, dateFin).filter(m => m.type === "sortie")
      : this.obtenirMouvementsParType("sortie");
    return mouvements.reduce((total, m) => total + m.montant, 0);
  }

  calculerSolde(dateDebut?: string, dateFin?: string): number {
    return this.calculerTotalEntrees(dateDebut, dateFin) - this.calculerTotalSorties(dateDebut, dateFin);
  }

  obtenirCategories(): string[] {
    this.chargerMouvements();
    const categories = new Set(this.mouvements.map(m => m.categorie));
    return Array.from(categories);
  }

  obtenirStatistiquesParCategorie(dateDebut?: string, dateFin?: string): Array<{ categorie: string; totalEntrees: number; totalSorties: number; solde: number }> {
    const categories = this.obtenirCategories();
    const mouvementsFiltres = dateDebut && dateFin 
      ? this.obtenirMouvementsParPeriode(dateDebut, dateFin)
      : this.mouvements;

    return categories.map(categorie => {
      const mouvementsCategorie = mouvementsFiltres.filter(m => m.categorie === categorie);
      const totalEntrees = mouvementsCategorie.filter(m => m.type === "entree").reduce((total, m) => total + m.montant, 0);
      const totalSorties = mouvementsCategorie.filter(m => m.type === "sortie").reduce((total, m) => total + m.montant, 0);
      return {
        categorie,
        totalEntrees,
        totalSorties,
        solde: totalEntrees - totalSorties
      };
    });
  }

  obtenirStatistiquesMensuelles(annee: number): Array<{ mois: string; entrees: number; sorties: number; solde: number }> {
    const statistiques = [];
    for (let mois = 0; mois < 12; mois++) {
      const dateDebut = new Date(annee, mois, 1).toISOString().split('T')[0];
      const dateFin = new Date(annee, mois + 1, 0).toISOString().split('T')[0];
      const entrees = this.calculerTotalEntrees(dateDebut, dateFin);
      const sorties = this.calculerTotalSorties(dateDebut, dateFin);
      const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      statistiques.push({
        mois: moisNoms[mois],
        entrees,
        sorties,
        solde: entrees - sorties
      });
    }
    return statistiques;
  }
}

export const serviceMouvements = new ServiceMouvements();
