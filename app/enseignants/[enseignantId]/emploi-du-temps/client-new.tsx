"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, Calendar, GraduationCap, Printer, User, Settings, 
  Edit3, Save, X, AlertTriangle, Plus, Clock, Copy, Trash2, 
  Filter, Search, RotateCcw, Eye, EyeOff, Grid, List
} from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import { serviceParametres } from "@/services/parametres.service"
import { ConfigurationHorairesModal } from "@/components/ConfigurationHorairesModalFixed"
import type { DonneesEnseignant, CreneauEmploiDuTemps } from "@/types/models"
import { ProtectionRoute } from "@/components/protection-route"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface CelluleSelectionnee {
  jour: string
  heure: string
}

interface OperationFusion {
  cellules: CelluleSelectionnee[]
  enCours: boolean
}

interface CelluleEdition {
  jour: string
  heureDebut: string
  matiere: string
  classe: string
  editing: boolean
  type: 'nouveau' | 'modification'
  fusion?: {
    cellules: CelluleSelectionnee[]
    heureFin: string
  }
}

interface ConflitInfo {
  professeur: string
  matiere: string
  message: string
}

interface Filtres {
  matiere: string
  classe: string
  jour: string
}

export default function EmploiDuTempsClient() {
  const params = useParams()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [creneaux, setCreneaux] = useState<CreneauEmploiDuTemps[]>([])
  const [loading, setLoading] = useState(true)
  const [celluleEdition, setCelluleEdition] = useState<CelluleEdition | null>(null)
  const [conflits, setConflits] = useState<{[key: string]: ConflitInfo}>({})
  const [message, setMessage] = useState<string>("")
  
  // Nouveaux états pour les améliorations
  const [filtres, setFiltres] = useState<Filtres>({ matiere: '', classe: '', jour: '' })
  const [vueCompacte, setVueCompacte] = useState(false)
  const [selectionMultiple, setSelectionMultiple] = useState<string[]>([])
  const [modeSelection, setModeSelection] = useState(false)
  const [recherche, setRecherche] = useState("")
  const [affichageConflits, setAffichageConflits] = useState(true)
  const [horairesConfigures, setHorairesConfigures] = useState(false)

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

  // Générer dynamiquement les heures en fonction des horaires de l'école
  const genererHeuresDynamiques = useCallback(() => {
    serviceParametres.initialiserHorairesParDefaut()

    // Vérifier s'il y a des horaires personnalisés dans le localStorage
    const horairesPersonnalises = localStorage.getItem('horairesPersonnalises')
    if (horairesPersonnalises) {
      try {
        const heuresPerso = JSON.parse(horairesPersonnalises)
        if (Array.isArray(heuresPerso) && heuresPerso.length > 0) {
          return heuresPerso.sort()
        }
      } catch (error) {
        console.warn('Erreur lors de la lecture des horaires personnalisés:', error)
      }
    }

    // Si pas d'horaires personnalisés, utiliser les horaires par défaut
    const tousLesCreneaux = serviceParametres.genererTousLesCreneaux(30)
    const heuresUniques = new Set<string>()
    jours.forEach(jour => {
      tousLesCreneaux[jour].forEach(heure => heuresUniques.add(heure))
    })
    return Array.from(heuresUniques).sort()
  }, [])

  const heures = genererHeuresDynamiques()

  // Nouveaux états pour la gestion avancée
  const [lignesVisibles, setLignesVisibles] = useState<Set<string>>(new Set(heures))
  const [operationFusion, setOperationFusion] = useState<OperationFusion>({
    cellules: [],
    enCours: false
  })
  const [editionHeure, setEditionHeure] = useState<{heure: string; editing: boolean} | null>(null)
  const [nouvelleHeure, setNouvelleHeure] = useState("")
  const [celluleEditionDirecte, setCelluleEditionDirecte] = useState<{jour: string; heure: string; editing: boolean} | null>(null)
  const [nouvelleValeurCellule, setNouvelleValeurCellule] = useState<{matiere: string; classe: string}>({matiere: '', classe: ''})

  useEffect(() => {
    chargerDonneesEnseignant()
  }, [enseignantId])

  // Vérifier si les horaires scolaires sont configurés
  useEffect(() => {
    const verifierHorairesConfigures = () => {
      const horairesPersonnalises = localStorage.getItem('horairesPersonnalises')
      if (horairesPersonnalises) {
        try {
          const heuresPerso = JSON.parse(horairesPersonnalises)
          if (Array.isArray(heuresPerso) && heuresPerso.length > 0) {
            setHorairesConfigures(true)
            return
          }
        } catch (error) {
          console.warn('Erreur lors de la lecture des horaires personnalisés:', error)
        }
      }

      // Vérifier s'il y a des horaires par défaut
      const tousLesCreneaux = serviceParametres.genererTousLesCreneaux(30)
      const toutesLesHeures = new Set<string>()
      jours.forEach(jour => {
        tousLesCreneaux[jour].forEach(heure => toutesLesHeures.add(heure))
      })

      setHorairesConfigures(toutesLesHeures.size > 0)
    }

    verifierHorairesConfigures()
  }, [heures, jours])

  const chargerDonneesEnseignant = () => {
    if (!enseignantId) return

    setLoading(true)
    const tousEnseignants = serviceEnseignants.obtenirTousLesEnseignants()
    const enseignantTrouve = tousEnseignants.find(e => e.id === enseignantId)

    if (enseignantTrouve) {
      setEnseignant(enseignantTrouve)
      const creneauxEnseignant = serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantId)
      setCreneaux(creneauxEnseignant)
    }

    setLoading(false)
  }

  // Vérifier les conflits d'horaires pour TOUS les enseignants
  const verifierConflitsComplets = useCallback(() => {
    const tousEnseignants = serviceEnseignants.obtenirTousLesEnseignants()
    const tousLesCreneaux: CreneauEmploiDuTemps[] = []

    // Récupérer tous les créneaux de tous les enseignants
    tousEnseignants.forEach(ens => {
      const creneauxEns = serviceEnseignants.obtenirEmploiDuTempsEnseignant(ens.id)
      tousLesCreneaux.push(...creneauxEns)
    })

    const conflitsDetectes: {[key: string]: ConflitInfo} = {}

    // Vérifier les conflits pour chaque créneau existant
    tousLesCreneaux.forEach(creneau => {
      const prof = tousEnseignants.find(e => e.id === creneau.enseignantId)
      if (prof) {
        const key = `${creneau.jour}-${creneau.heureDebut}-${creneau.classe}`
        conflitsDetectes[key] = {
          professeur: `${prof.prenom} ${prof.nom}`,
          matiere: creneau.matiere,
          message: `Occupé par ${prof.prenom} ${prof.nom} (${creneau.matiere})`
        }
      }
    })

    setConflits(conflitsDetectes)
    return conflitsDetectes
  }, [])

  const genererGrilleHoraire = useCallback(() => {
    const grille: Record<string, Record<string, CreneauEmploiDuTemps | null>> = {}

    jours.forEach((jour) => {
      grille[jour] = {}
      heures.forEach((heure) => (grille[jour][heure] = null))
    })

    creneaux.forEach((creneau) => {
      if (grille[creneau.jour] && !grille[creneau.jour][creneau.heureDebut]) {
        grille[creneau.jour][creneau.heureDebut] = creneau
      }
    })

    return grille
  }, [creneaux, heures, jours])

  // Fonction pour obtenir les créneaux qui couvrent plusieurs heures
  const obtenirCreneauxFusionnes = useCallback(() => {
    const creneauxFusionnes: Record<string, Record<string, CreneauEmploiDuTemps[]>> = {}

    jours.forEach((jour) => {
      creneauxFusionnes[jour] = {}
      heures.forEach((heure) => (creneauxFusionnes[jour][heure] = []))
    })

    creneaux.forEach((creneau) => {
      if (creneau.heureDebut !== creneau.heureFin) {
        // Créneau qui couvre plusieurs heures
        const heureDebutIndex = heures.indexOf(creneau.heureDebut)
        const heureFinIndex = heures.indexOf(creneau.heureFin)

        if (heureDebutIndex !== -1 && heureFinIndex !== -1) {
          for (let i = heureDebutIndex; i <= heureFinIndex; i++) {
            creneauxFusionnes[creneau.jour][heures[i]].push(creneau)
          }
        }
      }
    })

    return creneauxFusionnes
  }, [creneaux, heures, jours])

  const grilleHoraire = genererGrilleHoraire()
  const creneauxFusionnes = obtenirCreneauxFusionnes()

  // Filtrer les créneaux selon les critères
  const creneauxFiltres = creneaux.filter(creneau => {
    const correspondMatiere = !filtres.matiere || creneau.matiere.toLowerCase().includes(filtres.matiere.toLowerCase())
    const correspondClasse = !filtres.classe || creneau.classe.toLowerCase().includes(filtres.classe.toLowerCase())
    const correspondJour = !filtres.jour || creneau.jour === filtres.jour
    const correspondRecherche = !recherche || 
      creneau.matiere.toLowerCase().includes(recherche.toLowerCase()) ||
      creneau.classe.toLowerCase().includes(recherche.toLowerCase())
    
    return correspondMatiere && correspondClasse && correspondJour && correspondRecherche
  })

  const obtenirStatistiques = () => {
    const totalCreneaux = creneaux.length
    const matieresEnseignees = new Set(creneaux.map((c) => c.matiere)).size
    const classesEnseignees = new Set(creneaux.map((c) => c.classe)).size
    const joursActifs = new Set(creneaux.map((c) => c.jour)).size
    
    // Nouveaux indicateurs
    const creneauxAvecConflits = Object.keys(conflits).filter(key => {
      const [jour, heure] = key.split('-')
      const creneau = grilleHoraire[jour]?.[heure]
      return creneau && creneau.enseignantId === enseignantId
    }).length
    
    return { 
      totalCreneaux, 
      matieresEnseignees, 
      classesEnseignees, 
      joursActifs,
      creneauxAvecConflits
    }
  }

  const stats = obtenirStatistiques()

  // Vérifier les conflits avant d'ajouter/modifier
  const verifierEtTraiterCellule = (jour: string, heure: string, matiere: string, classe: string) => {
    const conflitsActuels = verifierConflitsComplets()
    const key = `${jour}-${heure}-${classe}`

    if (conflitsActuels[key] && affichageConflits) {
      setMessage(`❌ Conflit détecté: ${conflitsActuels[key].message}`)
      return false
    }

    return true
  }

  const handleCellClick = (jour: string, heure: string, event?: React.MouseEvent) => {
    // Gestion du mode fusion
    if (operationFusion.enCours) {
      const celluleKey = `${jour}-${heure}`
      const cellule: CelluleSelectionnee = { jour, heure }

      if (operationFusion.cellules.some(c => c.jour === jour && c.heure === heure)) {
        // Retirer la cellule de la sélection
        setOperationFusion({
          ...operationFusion,
          cellules: operationFusion.cellules.filter(c => !(c.jour === jour && c.heure === heure))
        })
      } else {
        // Ajouter la cellule à la sélection
        setOperationFusion({
          ...operationFusion,
          cellules: [...operationFusion.cellules, cellule]
        })
      }
      return
    }

    // Gestion de la sélection multiple avec Ctrl/Cmd
    if (modeSelection && event && (event.ctrlKey || event.metaKey)) {
      const creneauKey = `${jour}-${heure}`
      if (selectionMultiple.includes(creneauKey)) {
        setSelectionMultiple(selectionMultiple.filter(key => key !== creneauKey))
      } else {
        setSelectionMultiple([...selectionMultiple, creneauKey])
      }
      return
    }

    const creneau = grilleHoraire[jour][heure]

    if (creneau) {
      // Modifier le créneau existant
      setCelluleEdition({
        jour,
        heureDebut: heure,
        matiere: creneau.matiere,
        classe: creneau.classe,
        editing: true,
        type: 'modification'
      })
    } else {
      // Créer un nouveau créneau
      setCelluleEdition({
        jour,
        heureDebut: heure,
        matiere: "",
        classe: "",
        editing: true,
        type: 'nouveau'
      })
    }
  }

  const sauvegarderCellule = () => {
    if (!celluleEdition || !enseignant) return

    const { jour, heureDebut, matiere, classe } = celluleEdition

    if (!matiere || !classe) {
      setMessage("❌ Veuillez saisir une matière et une classe")
      return
    }

    // Vérifier les conflits
    if (!verifierEtTraiterCellule(jour, heureDebut, matiere, classe)) {
      return
    }

    const nouveauCreneau: CreneauEmploiDuTemps = {
      id: celluleEdition.type === 'modification' ?
          Date.now().toString() + '-mod' :
          Date.now().toString(),
      enseignantId: enseignantId,
      matiere,
      classe,
      jour: jour as CreneauEmploiDuTemps["jour"],
      heureDebut: heureDebut,
      heureFin: heureDebut, // Pour l'instant, même heure de fin
    }

    serviceEnseignants.ajouterCreneauEmploiDuTemps(nouveauCreneau)
    chargerDonneesEnseignant()
    setCelluleEdition(null)
    setMessage(`✅ Créneau ${celluleEdition.type === 'nouveau' ? 'ajouté' : 'modifié'} avec succès!`)
  }

  // Nouvelle fonction pour dupliquer un créneau
  const dupliquerCreneau = (creneau: CreneauEmploiDuTemps, nouveauJour?: string, nouvelleHeure?: string) => {
    const nouveauCreneau: CreneauEmploiDuTemps = {
      ...creneau,
      id: Date.now().toString(),
      jour: (nouveauJour || creneau.jour) as CreneauEmploiDuTemps["jour"],
      heureDebut: nouvelleHeure || creneau.heureDebut,
    }

    if (!verifierEtTraiterCellule(nouveauCreneau.jour, nouveauCreneau.heureDebut, nouveauCreneau.matiere, nouveauCreneau.classe)) {
      return
    }

    serviceEnseignants.ajouterCreneauEmploiDuTemps(nouveauCreneau)
    chargerDonneesEnseignant()
    setMessage("✅ Créneau dupliqué avec succès!")
  }

  // Fonction pour supprimer plusieurs créneaux
  const supprimerCreneauxSelectionnes = () => {
    selectionMultiple.forEach(key => {
      const [jour, heure] = key.split('-')
      const creneau = grilleHoraire[jour][heure]
      if (creneau) {
        serviceEnseignants.supprimerCreneauEmploiDuTemps(creneau.id)
      }
    })
    chargerDonneesEnseignant()
    setSelectionMultiple([])
    setModeSelection(false)
    setMessage(`✅ ${selectionMultiple.length} créneau(x) supprimé(s) avec succès!`)
  }

  const supprimerCreneau = (creneauId: string) => {
    serviceEnseignants.supprimerCreneauEmploiDuTemps(creneauId)
    chargerDonneesEnseignant()
    setMessage("✅ Créneau supprimé avec succès!")
  }

  const annulerEdition = () => {
    setCelluleEdition(null)
    setMessage("")
  }

  // Réinitialiser les filtres
  const reinitialiserFiltres = () => {
    setFiltres({ matiere: '', classe: '', jour: '' })
    setRecherche("")
  }

  const imprimerPDF = () => {
    const doc = new jsPDF()
    const entetes = ["Heure", ...jours.map(j => j.charAt(0).toUpperCase() + j.slice(1))]
    const data = heures.map((heure) => {
      return [heure, ...jours.map(jour => {
        const c = grilleHoraire[jour][heure]
        return c ? `${c.classe} - ${c.matiere}` : "Libre"
      })]
    })

    autoTable(doc, {
      head: [entetes],
      body: data,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`emploi_du_temps_${enseignant?.prenom}_${enseignant?.nom}.pdf`)
  }

  // Nouvelles fonctions pour la gestion avancée
  const basculerVisibiliteLigne = (heure: string) => {
    const nouvellesLignesVisibles = new Set(lignesVisibles)
    if (nouvellesLignesVisibles.has(heure)) {
      nouvellesLignesVisibles.delete(heure)
    } else {
      nouvellesLignesVisibles.add(heure)
    }
    setLignesVisibles(nouvellesLignesVisibles)
  }

  const fusionnerCellules = () => {
    if (operationFusion.cellules.length < 2) {
      setMessage("❌ Veuillez sélectionner au moins 2 cellules pour la fusion")
      return
    }

    const premiereCellule = operationFusion.cellules[0]
    const derniereCellule = operationFusion.cellules[operationFusion.cellules.length - 1]

    // Trier les cellules par heure pour déterminer le début et la fin
    const cellulesTries = [...operationFusion.cellules].sort((a, b) => {
      const indexA = heures.indexOf(a.heure)
      const indexB = heures.indexOf(b.heure)
      return indexA - indexB
    })

    const heureDebut = cellulesTries[0].heure
    const heureFin = cellulesTries[cellulesTries.length - 1].heure

    // Créer le créneau fusionné
    const creneauFusionne: CreneauEmploiDuTemps = {
      id: Date.now().toString(),
      enseignantId: enseignantId,
      matiere: "Matière fusionnée",
      classe: "Classe fusionnée",
      jour: premiereCellule.jour as CreneauEmploiDuTemps["jour"],
      heureDebut: heureDebut,
      heureFin: heureFin,
    }

    serviceEnseignants.ajouterCreneauEmploiDuTemps(creneauFusionne)
    chargerDonneesEnseignant()
    setOperationFusion({ cellules: [], enCours: false })
    setMessage("✅ Créneau fusionné avec succès!")
  }

  const commencerEditionHeure = (heure: string) => {
    setEditionHeure({ heure, editing: true })
    setNouvelleHeure(heure)
  }

  const sauvegarderEditionHeure = () => {
    if (!editionHeure) return

    // Mettre à jour tous les créneaux de cette heure
    creneaux.forEach(creneau => {
      if (creneau.heureDebut === editionHeure.heure) {
        const creneauModifie = { ...creneau, heureDebut: nouvelleHeure }
        serviceEnseignants.supprimerCreneauEmploiDuTemps(creneau.id)
        serviceEnseignants.ajouterCreneauEmploiDuTemps(creneauModifie)
      }
    })

    chargerDonneesEnseignant()
    setEditionHeure(null)
    setMessage("✅ Heure modifiée avec succès!")
  }

  const annulerEditionHeure = () => {
    setEditionHeure(null)
    setNouvelleHeure("")
  }

  // Fonctions pour l'édition directe des cellules (style Excel)
  const commencerEditionDirecte = (jour: string, heure: string) => {
    const creneau = grilleHoraire[jour][heure]
    setCelluleEditionDirecte({ jour, heure, editing: true })
    setNouvelleValeurCellule({
      matiere: creneau?.matiere || '',
      classe: creneau?.classe || ''
    })
  }

  const sauvegarderEditionDirecte = () => {
    if (!celluleEditionDirecte || !enseignant) return

    const { jour, heure } = celluleEditionDirecte
    const { matiere, classe } = nouvelleValeurCellule

    if (!matiere || !classe) {
      setMessage("❌ Veuillez saisir une matière et une classe")
      return
    }

    // Vérifier les conflits
    if (!verifierEtTraiterCellule(jour, heure, matiere, classe)) {
      return
    }

    const nouveauCreneau: CreneauEmploiDuTemps = {
      id: Date.now().toString(),
      enseignantId: enseignantId,
      matiere,
      classe,
      jour: jour as CreneauEmploiDuTemps["jour"],
      heureDebut: heure,
      heureFin: heure,
    }

    serviceEnseignants.ajouterCreneauEmploiDuTemps(nouveauCreneau)
    chargerDonneesEnseignant()
    setCelluleEditionDirecte(null)
    setMessage("✅ Créneau modifié avec succès!")
  }

  const annulerEditionDirecte = () => {
    setCelluleEditionDirecte(null)
    setNouvelleValeurCellule({ matiere: '', classe: '' })
  }

  // Fonctions pour gérer les lignes d'heures
  const ajouterLigneHeure = () => {
    const nouvelleHeureFormatee = prompt("Nouvelle heure (format HH:MM):")
    if (!nouvelleHeureFormatee) return

    // Validation du format HH:MM
    const formatHeure = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!formatHeure.test(nouvelleHeureFormatee)) {
      setMessage("❌ Format d'heure invalide! Utilisez le format HH:MM (ex: 08:30)")
      return
    }

    // Vérifier que l'heure n'existe pas déjà
    if (heures.includes(nouvelleHeureFormatee)) {
      setMessage("❌ Cette heure existe déjà!")
      return
    }

    // Ajouter la nouvelle heure à la liste et sauvegarder dans les paramètres
    const nouvellesHeures = [...heures, nouvelleHeureFormatee].sort()

    // Sauvegarder les nouvelles heures dans le localStorage
    localStorage.setItem('horairesPersonnalises', JSON.stringify(nouvellesHeures))

    // Recharger les données pour refléter les changements
    chargerDonneesEnseignant()
    setMessage("✅ Nouvelle heure ajoutée avec succès!")
  }

  const supprimerLigneHeure = (heure: string) => {
    if (heures.length <= 1) {
      setMessage("❌ Impossible de supprimer la dernière heure!")
      return
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'heure ${heure} ? Tous les créneaux de cette heure seront supprimés.`)) {
      // Supprimer tous les créneaux de cette heure
      creneaux.forEach(creneau => {
        if (creneau.heureDebut === heure) {
          serviceEnseignants.supprimerCreneauEmploiDuTemps(creneau.id)
        }
      })

      // Retirer l'heure de la liste et sauvegarder
      const nouvellesHeures = heures.filter(h => h !== heure)
      localStorage.setItem('horairesPersonnalises', JSON.stringify(nouvellesHeures))

      // Recharger les données pour refléter les changements
      chargerDonneesEnseignant()
      setMessage("✅ Heure et créneaux supprimés avec succès!")
    }
  }

  if (loading) {
    return (
      <ProtectionRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des données...</p>
          </div>
        </div>
      </ProtectionRoute>
    )
  }

  if (!enseignant) {
    return (
      <ProtectionRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enseignant non trouvé</h2>
            <p className="text-gray-600 mb-4">L'enseignant demandé n'existe pas ou a été supprimé.</p>
            <Button asChild>
              <Link href="/enseignants">
                <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux enseignants
              </Link>
            </Button>
          </div>
        </div>
      </ProtectionRoute>
    )
  }

  return (
    <ProtectionRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/enseignants/${enseignantId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-6 w-6" /> Emploi du Temps
                </h1>
                <p className="text-gray-600">
                  {enseignant.prenom} {enseignant.nom} - {enseignant.matieres.length} matière(s), {enseignant.classes.length} classe(s)
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <ConfigurationHorairesModal>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" /> Horaires
                </Button>
              </ConfigurationHorairesModal>
              <Button variant="outline" onClick={imprimerPDF}>
                <Printer className="h-4 w-4 mr-2" /> Exporter PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Messages de feedback */}
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('❌') ? 'bg-red-100 text-red-800 border border-red-200' :
              message.includes('✅') ? 'bg-green-100 text-green-800 border border-green-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.includes('❌') && <AlertTriangle className="h-4 w-4" />}
                {message.includes('✅') && <Save className="h-4 w-4" />}
                {message}
              </div>
            </div>
          )}

          {/* Message d'alerte pour les horaires non configurés */}
          {!horairesConfigures && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">Horaires scolaires non configurés</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    Les horaires scolaires n'ont pas encore été configurés. Cela peut affecter l'affichage de l'emploi du temps.
                    Utilisez le bouton "Horaires" pour configurer les horaires de votre établissement.
                  </p>
                </div>
                <ConfigurationHorairesModal>
                  <Button variant="outline" size="sm" className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200">
                    <Settings className="h-4 w-4 mr-2" /> Configurer les horaires
                  </Button>
                </ConfigurationHorairesModal>
              </div>
            </div>
          )}

          {/* Nouvelle section de contrôles */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Rechercher matière ou classe..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                
                <select 
                  value={filtres.matiere} 
                  onChange={(e) => setFiltres({...filtres, matiere: e.target.value})}
                  className="border rounded-md p-2 text-sm"
                >
                  <option value="">Toutes les matières</option>
                  {Array.from(new Set(creneaux.map(c => c.matiere))).map(matiere => (
                    <option key={matiere} value={matiere}>{matiere}</option>
                  ))}
                </select>
                
                <select 
                  value={filtres.classe} 
                  onChange={(e) => setFiltres({...filtres, classe: e.target.value})}
                  className="border rounded-md p-2 text-sm"
                >
                  <option value="">Toutes les classes</option>
                  {Array.from(new Set(creneaux.map(c => c.classe))).map(classe => (
                    <option key={classe} value={classe}>{classe}</option>
                  ))}
                </select>
                
                <Button variant="outline" onClick={reinitialiserFiltres} size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" /> Réinitialiser
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={vueCompacte ? "default" : "outline"}
                  onClick={() => setVueCompacte(!vueCompacte)}
                  size="sm"
                >
                  {vueCompacte ? <Grid className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
                  {vueCompacte ? "Vue normale" : "Vue compacte"}
                </Button>

                <Button
                  variant={modeSelection ? "destructive" : "outline"}
                  onClick={() => {
                    setModeSelection(!modeSelection)
                    if (modeSelection) setSelectionMultiple([])
                  }}
                  size="sm"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  {modeSelection ? "Annuler sélection" : "Sélection multiple"}
                </Button>

                <Button
                  variant={affichageConflits ? "default" : "outline"}
                  onClick={() => setAffichageConflits(!affichageConflits)}
                  size="sm"
                >
                  {affichageConflits ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  Conflits
                </Button>

                {/* Nouveaux contrôles pour la gestion avancée */}
                <Button
                  variant="outline"
                  onClick={() => setOperationFusion({ cellules: [], enCours: !operationFusion.enCours })}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {operationFusion.enCours ? "Annuler fusion" : "Fusion"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (editionHeure) {
                      annulerEditionHeure()
                    } else {
                      commencerEditionHeure(heures[0])
                    }
                  }}
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {editionHeure ? "Annuler édition" : "Éditer heures"}
                </Button>

                {/* Nouveaux contrôles pour la gestion des lignes d'heures */}
                <Button
                  variant="outline"
                  onClick={ajouterLigneHeure}
                  size="sm"
                  title="Ajouter une nouvelle ligne d'heure"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter heure
                </Button>

                {heures.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => supprimerLigneHeure(heures[heures.length - 1])}
                    size="sm"
                    title="Supprimer la dernière ligne d'heure"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer heure
                  </Button>
                )}
              </div>
            </div>
            
            {/* Indicateur de sélection multiple */}
            {modeSelection && (
              <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200 flex justify-between items-center">
                <span className="text-sm text-blue-700">
                  {selectionMultiple.length} créneau(x) sélectionné(s) - Utilisez Ctrl/Cmd + clic pour sélectionner plusieurs créneaux
                </span>
                {selectionMultiple.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={supprimerCreneauxSelectionnes}>
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer la sélection
                  </Button>
                )}
              </div>
            )}

            {/* Indicateur de mode fusion */}
            {operationFusion.enCours && (
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200 flex justify-between items-center">
                <span className="text-sm text-green-700">
                  Mode fusion activé - Cliquez sur les cellules à fusionner sur la même ligne horaire
                </span>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={fusionnerCellules}>
                    <Plus className="h-4 w-4 mr-1" /> Fusionner ({operationFusion.cellules.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOperationFusion({ cellules: [], enCours: false })}>
                    <X className="h-4 w-4 mr-1" /> Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Modal d'édition d'heure */}
            {editionHeure && (
              <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Édition de l'heure: {editionHeure.heure}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Nouvelle heure (HH:MM)"
                    value={nouvelleHeure}
                    onChange={(e) => setNouvelleHeure(e.target.value)}
                    className="w-32"
                  />
                  <Button size="sm" onClick={sauvegarderEditionHeure}>
                    <Save className="h-3 w-3 mr-1" /> Sauvegarder
                  </Button>
                  <Button size="sm" variant="outline" onClick={annulerEditionHeure}>
                    <X className="h-3 w-3 mr-1" /> Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalCreneaux}</div>
                <div className="text-sm text-gray-600">Créneaux programmés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.matieresEnseignees}</div>
                <div className="text-sm text-gray-600">Matières enseignées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.classesEnseignees}</div>
                <div className="text-sm text-gray-600">Classes assignées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.joursActifs}</div>
                <div className="text-sm text-gray-600">Jours d'activité</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`text-2xl font-bold ${stats.creneauxAvecConflits > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {stats.creneauxAvecConflits}
                </div>
                <div className="text-sm text-gray-600">Conflits détectés</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="grille" className="space-y-6">
            <TabsList>
              <TabsTrigger value="grille">Grille horaire interactive</TabsTrigger>
              <TabsTrigger value="liste">Liste des créneaux ({creneauxFiltres.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="grille">
              <Card>
                <CardHeader>
                  <CardTitle>Grille horaire hebdomadaire</CardTitle>
                  <CardDescription>
                    Cliquez sur les cellules pour ajouter/modifier des créneaux. {modeSelection && "Mode sélection multiple activé - utilisez Ctrl/Cmd + clic."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border border-gray-300 ${vueCompacte ? 'text-xs' : 'text-sm'}`}>
                      <thead>
                        <tr>
                          <th className="border border-gray-300 p-2 bg-gray-50 font-medium">Heure</th>
                          {jours.map((jour) => (
                            <th key={jour} className="border border-gray-300 p-2 bg-gray-50 font-medium">
                              {jour.charAt(0).toUpperCase() + jour.slice(1)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heures.map((heure) => (
                          <tr key={heure}>
                            <td className="border border-gray-300 p-2 bg-gray-50 font-medium">{heure}</td>
                            {jours.map((jour) => {
                              const creneau = grilleHoraire[jour][heure]
                              const estEnEdition = celluleEdition?.jour === jour && celluleEdition?.heureDebut === heure
                              const creneauKey = `${jour}-${heure}`
                              const estSelectionne = selectionMultiple.includes(creneauKey)
                              const conflitKey = `${jour}-${heure}-${creneau?.classe || ''}`
                              const aConflit = affichageConflits && conflits[conflitKey]

                              // Vérifier si cette cellule fait partie d'un créneau fusionné
                              const creneauxFusionnesPourCetteHeure = creneauxFusionnes[jour]?.[heure] || []
                              const estDebutCreneauFusionne = creneauxFusionnesPourCetteHeure.length > 0 &&
                                creneauxFusionnesPourCetteHeure.some(c => c.heureDebut === heure)

                              // Calculer le rowspan pour les créneaux fusionnés
                              let rowspan = 1
                              if (estDebutCreneauFusionne) {
                                const creneauFusionne = creneauxFusionnesPourCetteHeure.find(c => c.heureDebut === heure)
                                if (creneauFusionne) {
                                  const heureDebutIndex = heures.indexOf(creneauFusionne.heureDebut)
                                  const heureFinIndex = heures.indexOf(creneauFusionne.heureFin)
                                  rowspan = Math.max(1, heureFinIndex - heureDebutIndex + 1)
                                }
                              }

                              // Si cette cellule fait partie d'un créneau fusionné mais n'est pas le début, ne pas l'afficher
                              if (creneauxFusionnesPourCetteHeure.length > 0 && !estDebutCreneauFusionne) {
                                return null
                              }

                              return (
                                <td
                                  key={`${jour}-${heure}`}
                                  className={`border border-gray-300 p-1 ${
                                    estSelectionne ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                                  }`}
                                  rowSpan={rowspan}
                                >
                                  {estEnEdition ? (
                                    <div className="bg-yellow-100 p-2 rounded">
                                      <div className="space-y-2">
                                        <Input
                                          placeholder="Matière"
                                          value={celluleEdition.matiere}
                                          onChange={(e) =>
                                            setCelluleEdition({...celluleEdition, matiere: e.target.value})
                                          }
                                          className={vueCompacte ? 'text-xs h-6' : 'text-sm'}
                                        />
                                        <Input
                                          placeholder="Classe"
                                          value={celluleEdition.classe}
                                          onChange={(e) =>
                                            setCelluleEdition({...celluleEdition, classe: e.target.value})
                                          }
                                          className={vueCompacte ? 'text-xs h-6' : 'text-sm'}
                                        />
                                        <div className="flex gap-1">
                                          <Button size="sm" onClick={sauvegarderCellule} className={vueCompacte ? 'text-xs h-6' : 'text-sm'}>
                                            <Save className="h-3 w-3" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={annulerEdition} className={vueCompacte ? 'text-xs h-6' : 'text-sm'}>
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : creneau ? (
                                    <div
                                      className={`p-2 rounded cursor-pointer hover:opacity-80 ${
                                        aConflit ? 'bg-red-100 border-2 border-red-300' : 'bg-blue-100'
                                      } ${vueCompacte ? 'text-xs' : 'text-sm'}`}
                                      onClick={(e) => handleCellClick(jour, heure, e)}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        commencerEditionDirecte(jour, heure)
                                      }}
                                      title="Double-cliquez pour éditer directement"
                                    >
                                      {celluleEditionDirecte?.jour === jour && celluleEditionDirecte?.heure === heure && celluleEditionDirecte?.editing ? (
                                        <div className="space-y-1">
                                          <Input
                                            placeholder="Matière"
                                            value={nouvelleValeurCellule.matiere}
                                            onChange={(e) => setNouvelleValeurCellule({...nouvelleValeurCellule, matiere: e.target.value})}
                                            className={vueCompacte ? 'text-xs h-6' : 'text-sm'}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') sauvegarderEditionDirecte()
                                              if (e.key === 'Escape') annulerEditionDirecte()
                                            }}
                                          />
                                          <Input
                                            placeholder="Classe"
                                            value={nouvelleValeurCellule.classe}
                                            onChange={(e) => setNouvelleValeurCellule({...nouvelleValeurCellule, classe: e.target.value})}
                                            className={vueCompacte ? 'text-xs h-6' : 'text-sm'}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') sauvegarderEditionDirecte()
                                              if (e.key === 'Escape') annulerEditionDirecte()
                                            }}
                                          />
                                          <div className="flex gap-1">
                                            <Button size="sm" onClick={sauvegarderEditionDirecte} className={vueCompacte ? 'text-xs h-6' : 'text-sm'}>
                                              <Save className="h-3 w-3" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={annulerEditionDirecte} className={vueCompacte ? 'text-xs h-6' : 'text-sm'}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="font-medium truncate">{creneau.matiere}</div>
                                          <div className="text-gray-600 truncate">{creneau.classe}</div>
                                          {!vueCompacte && (
                                            <div className="text-gray-500">
                                              {creneau.heureDebut} - {creneau.heureFin}
                                            </div>
                                          )}
                                          {aConflit && (
                                            <div className="text-red-600 mt-1 flex items-center gap-1 truncate">
                                              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                              <span className="truncate">{aConflit.message}</span>
                                            </div>
                                          )}
                                          <div className="mt-1 flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-4 w-4 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                dupliquerCreneau(creneau)
                                              }}
                                              title="Dupliquer ce créneau"
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-4 w-4 p-0 text-red-500"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                supprimerCreneau(creneau.id)
                                              }}
                                              title="Supprimer ce créneau"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <div
                                      className={`flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 border-2 border-dashed border-gray-200 rounded ${
                                        vueCompacte ? 'h-10' : 'h-16'
                                      }`}
                                      onClick={(e) => handleCellClick(jour, heure, e)}
                                    >
                                      <div className="text-center">
                                        <Plus className="h-4 w-4 mx-auto mb-1" />
                                        <div className="font-medium">Libre</div>
                                        {!vueCompacte && <div className="text-xs">Cliquer pour ajouter</div>}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="liste">
              <Card>
                <CardHeader>
                  <CardTitle>Liste des créneaux ({creneauxFiltres.length})</CardTitle>
                  <CardDescription>
                    Tous les créneaux programmés pour {enseignant.prenom} {enseignant.nom}
                    {filtres.matiere || filtres.classe || filtres.jour ? ' (filtrés)' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creneauxFiltres.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>
                        {creneaux.length === 0 
                          ? "Aucun créneau programmé pour cet enseignant" 
                          : "Aucun créneau ne correspond aux filtres"}
                      </p>
                      <p className="text-sm mt-2">
                        {creneaux.length === 0 
                          ? "Utilisez la grille ci-dessus pour ajouter des créneaux" 
                          : "Modifiez vos critères de recherche"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creneauxFiltres.map((creneau) => {
                        const conflitKey = `${creneau.jour}-${creneau.heureDebut}-${creneau.classe}`
                        const aConflit = affichageConflits && conflits[conflitKey]

                        return (
                          <div key={creneau.id} className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {creneau.jour.charAt(0).toUpperCase() + creneau.jour.slice(1)}
                                </Badge>
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {creneau.heureDebut} - {creneau.heureFin}
                                </Badge>
                                {aConflit && (
                                  <Badge variant="destructive" className="text-xs">
                                    Conflit détecté
                                  </Badge>
                                )}
                              </div>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Matière:</strong> {creneau.matiere}</p>
                                  <p><strong>Classe:</strong> {creneau.classe}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => dupliquerCreneau(creneau)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" /> Dupliquer
                                  </Button>
                                </div>
                              </div>
                              {aConflit && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {aConflit.message}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => supprimerCreneau(creneau.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Supprimer
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectionRoute>
  )
}