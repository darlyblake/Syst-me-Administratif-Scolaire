import type { StatistiquesTableauBord } from "@/types/models"
import { serviceEleves } from "./eleves.service"
import { servicePaiements } from "./paiements.service"
import { serviceEnseignants } from "./enseignants.service"

class ServiceStatistiques {
  calculerStatistiquesTableauBord(): StatistiquesTableauBord {
    const eleves = serviceEleves.obtenirTousLesEleves()
    const enseignants = serviceEnseignants.obtenirTousLesEnseignants()

    const totalEleves = eleves.filter((e) => e.statut === "actif").length
    const totalEnseignants = enseignants.filter((e) => e.statut === "actif").length
    const totalRecettes = servicePaiements.calculerTotalRecettes()
    const classesActives = serviceEleves.obtenirClassesActives().length

    const elevesImpayes = eleves.filter((eleve) => {
      const totalPaye = servicePaiements.calculerTotalPayeEleve(eleve.id)
      return totalPaye < eleve.totalAPayer
    }).length

    const aujourdhui = new Date().toISOString().split("T")[0]
    const pointagesAujourdhui = enseignants.map((enseignant) => {
      const historique = serviceEnseignants.obtenirHistoriquePointage(enseignant.id, aujourdhui, aujourdhui)
      return historique.length > 0 && historique[0].statut === "present"
    })

    const enseignantsPresents = pointagesAujourdhui.filter(Boolean).length
    const tauxPresenceEnseignants =
      totalEnseignants > 0 ? Math.round((enseignantsPresents / totalEnseignants) * 100) : 0

    return {
      totalEleves,
      totalEnseignants,
      totalRecettes,
      classesActives,
      elevesImpayes,
      enseignantsPresents,
      tauxPresenceEnseignants,
    }
  }

  obtenirElevesImpayes() {
    const eleves = serviceEleves.obtenirTousLesEleves()

    return eleves
      .map((eleve) => {
        const totalPaye = servicePaiements.calculerTotalPayeEleve(eleve.id)
        const montantDu = eleve.totalAPayer - totalPaye

        return {
          ...eleve,
          totalPaye,
          montantDu,
        }
      })
      .filter((eleve) => eleve.montantDu > 0)
      .sort((a, b) => b.montantDu - a.montantDu)
  }
}

const serviceStatistiques = new ServiceStatistiques()

export { serviceStatistiques }
