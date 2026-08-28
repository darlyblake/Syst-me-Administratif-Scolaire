"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Calendar, Plus, Trash2, User, Filter, Download, Printer, Share2, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { serviceEmploiDuTempsClasses } from "@/services/emploi-du-temps-classes.service"
import { servicePersonnel } from "@/services/personnel.service"
import { serviceMatieres } from "@/services/matieres.service"
import { serviceClasses } from "@/services/classes.service"
import type { CreneauEmploiDuTemps } from "@/services/emploi-du-temps-classes.service"
import type { Matiere } from "@/types/models"

const jours: CreneauEmploiDuTemps["jour"][] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

const getCouleurMatiere = (matiere: string, matieres: Matiere[]): string => {
  const matiereData = matieres.find(m => m.nom === matiere)
  return matiereData?.couleur || "#6B7280"
}

// Fonction pour extraire toutes les heures uniques des créneaux
const getHeuresUniques = (creneaux: CreneauEmploiDuTemps[]): string[] => {
  const heures = new Set<string>()
  creneaux.forEach(c => {
    heures.add(c.heureDebut)
    heures.add(c.heureFin)
  })
  return Array.from(heures).sort()
}

// Fonction pour extraire les créneaux uniques (début + fin)
const getCreneauxUniques = (creneaux: CreneauEmploiDuTemps[]): Array<{ debut: string; fin: string }> => {
  const creneauxSet = new Set<string>()
  creneaux.forEach(c => {
    creneauxSet.add(`${c.heureDebut}-${c.heureFin}`)
  })
  return Array.from(creneauxSet)
    .map(str => {
      const [debut, fin] = str.split("-")
      return { debut, fin }
    })
    .sort((a, b) => {
      const [h1, m1] = a.debut.split(":").map(Number)
      const [h2, m2] = b.debut.split(":").map(Number)
      return (h1 * 60 + m1) - (h2 * 60 + m2)
    })
}

export default function EmploiDuTempsClassesPage() {
  const [creneaux, setCreneaux] = useState<CreneauEmploiDuTemps[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedClasse, setSelectedClasse] = useState("")
  const [selectedEnseignant, setSelectedEnseignant] = useState("")
  const [selectedSalle, setSelectedSalle] = useState("")
  const [selectedMatiere, setSelectedMatiere] = useState("")
  const [viewMode, setViewMode] = useState<"classe" | "enseignant" | "salle">("classe")
  const [editingCell, setEditingCell] = useState<{ jour: string; heure: string } | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCreneau, setEditingCreneau] = useState<CreneauEmploiDuTemps | null>(null)
  const [formData, setFormData] = useState({
    classeId: "",
    classeNom: "",
    enseignantId: "",
    matiere: "",
    salle: "",
    heureDebut: "",
    heureFin: "",
    jour: "lundi" as CreneauEmploiDuTemps["jour"]
  })

  useEffect(() => {
    setCreneaux(serviceEmploiDuTempsClasses.obtenirTousLesCreneaux())
    setClasses(serviceClasses.obtenirToutesLesClasses())
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
    setMatieres(serviceMatieres.obtenirToutesLesMatieres())
    setIsLoaded(true)
  }, [])

  const classesUniques = classes.map(c => ({ id: c.id, nom: c.nom }))
  const enseignantsUniques = Array.from(new Set(creneaux.map(c => c.enseignantId).filter(id => id && id !== "")))
  const sallesUniques = Array.from(new Set(creneaux.map(c => c.salle).filter(Boolean)))
  const matieresUniques = Array.from(new Set(creneaux.map(c => c.matiere).filter(Boolean)))
  
  // Générer les créneaux uniques (début + fin) pour les lignes du tableau
  const creneauxUniques = getCreneauxUniques(creneaux)
  // Si aucun créneau, utiliser des créneaux par défaut
  const creneauxAffiches = creneauxUniques.length > 0 ? creneauxUniques : [
    { debut: "07:00", fin: "08:00" },
    { debut: "08:00", fin: "09:00" },
    { debut: "09:00", fin: "10:00" },
    { debut: "10:00", fin: "11:00" },
    { debut: "11:00", fin: "12:00" },
    { debut: "12:00", fin: "13:00" },
    { debut: "13:00", fin: "14:00" },
    { debut: "14:00", fin: "15:00" },
    { debut: "15:00", fin: "16:00" },
    { debut: "16:00", fin: "17:00" },
    { debut: "17:00", fin: "18:00" }
  ]

  // Fonction pour comparer les heures avec support des minutes
  const comparerHeures = (heure1: string, heure2: string): number => {
    const [h1, m1] = heure1.split(":").map(Number)
    const [h2, m2] = heure2.split(":").map(Number)
    const total1 = h1 * 60 + m1
    const total2 = h2 * 60 + m2
    return total1 - total2
  }

  const getCreneauForCell = (jour: string, creneauHoraire: { debut: string; fin: string }): CreneauEmploiDuTemps | null => {
    return creneaux.find(c => {
      if (viewMode === "classe" && selectedClasse !== "all" && c.classeId !== selectedClasse) return false
      if (viewMode === "enseignant" && selectedEnseignant !== "all" && c.enseignantId !== selectedEnseignant) return false
      if (viewMode === "salle" && selectedSalle !== "all" && c.salle !== selectedSalle) return false
      if (c.jour !== jour) return false
      
      // Vérifier si le créneau correspond exactement à l'intervalle
      return c.heureDebut === creneauHoraire.debut && c.heureFin === creneauHoraire.fin
    }) || null
  }

  const detecterConflits = (creneau: CreneauEmploiDuTemps): boolean => {
    return creneaux.some(c => {
      if (c.id === creneau.id) return false
      if (c.jour !== creneau.jour) return false
      
      // Utiliser la comparaison avec support des minutes
      const debut1 = comparerHeures(c.heureDebut, "00:00")
      const fin1 = comparerHeures(c.heureFin, "00:00")
      const debut2 = comparerHeures(creneau.heureDebut, "00:00")
      const fin2 = comparerHeures(creneau.heureFin, "00:00")
      
      // Conflit d'enseignant
      if (c.enseignantId === creneau.enseignantId) {
        return (debut1 < fin2 && fin1 > debut2)
      }
      
      // Conflit de salle
      if (c.salle === creneau.salle && c.salle) {
        return (debut1 < fin2 && fin1 > debut2)
      }
      
      return false
    })
  }

  const handleCellClick = (jour: string, creneauHoraire: { debut: string; fin: string }) => {
    const creneau = getCreneauForCell(jour, creneauHoraire)
    if (creneau) {
      setEditingCreneau(creneau)
      setFormData({
        classeId: creneau.classeId,
        classeNom: creneau.classeNom,
        enseignantId: creneau.enseignantId,
        matiere: creneau.matiere,
        salle: creneau.salle,
        heureDebut: creneau.heureDebut,
        heureFin: creneau.heureFin,
        jour: creneau.jour
      })
      setShowAddModal(true)
    } else {
      setEditingCell({ jour, heure: creneauHoraire.debut })
      setFormData({
        classeId: "",
        classeNom: "",
        enseignantId: "",
        matiere: "",
        salle: "",
        heureDebut: creneauHoraire.debut,
        heureFin: creneauHoraire.fin,
        jour: jour as CreneauEmploiDuTemps["jour"]
      })
      setShowAddModal(true)
    }
  }

  const handleSaveCreneau = () => {
    if (!formData.classeId || !formData.enseignantId || !formData.heureDebut || !formData.heureFin) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    if (editingCreneau) {
      serviceEmploiDuTempsClasses.mettreAJourCreneau(editingCreneau.id, formData)
    } else {
      const enseignant = personnel.find(p => p.id === formData.enseignantId)
      serviceEmploiDuTempsClasses.ajouterCreneau({
        classeId: formData.classeId,
        classeNom: formData.classeNom,
        enseignantId: formData.enseignantId,
        enseignantNom: enseignant ? `${enseignant.prenom} ${enseignant.nom}` : "",
        jour: formData.jour,
        heureDebut: formData.heureDebut,
        heureFin: formData.heureFin,
        matiere: formData.matiere,
        salle: formData.salle
      })
    }
    setCreneaux(serviceEmploiDuTempsClasses.obtenirTousLesCreneaux())
    setShowAddModal(false)
    setEditingCreneau(null)
    setEditingCell(null)
    setFormData({
      classeId: "",
      classeNom: "",
      enseignantId: "",
      matiere: "",
      salle: "",
      heureDebut: "",
      heureFin: "",
      jour: "lundi"
    })
  }

  const handleDeleteCreneau = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) {
      serviceEmploiDuTempsClasses.supprimerCreneau(id)
      setCreneaux(serviceEmploiDuTempsClasses.obtenirTousLesCreneaux())
      setShowAddModal(false)
      setEditingCreneau(null)
    }
  }

  const statistiques = serviceEmploiDuTempsClasses.genererStatistiques()
  const conflits = creneaux.filter(detecterConflits).length
  const tauxOccupation = creneaux.length > 0 ? ((creneaux.length - conflits) / creneaux.length) * 100 : 0

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-full mx-auto">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : (
          <>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ecole/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Emplois du Temps
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Planning interactif des classes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Créneaux</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistiques.totalCreneaux}</p>
            </CardContent>
          </Card>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Classes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistiques.totalClasses}</p>
            </CardContent>
          </Card>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Enseignants</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistiques.totalEnseignants}</p>
            </CardContent>
          </Card>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Conflits</p>
              <p className={`text-2xl font-bold ${conflits > 0 ? 'text-red-600' : 'text-green-600'}`}>{conflits}</p>
            </CardContent>
          </Card>
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Occupation</p>
              <p className="text-2xl font-bold text-blue-600">{tauxOccupation.toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et vue */}
        <Card className={`mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "classe" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("classe")}
                >
                  Classes
                </Button>
                <Button
                  variant={viewMode === "enseignant" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("enseignant")}
                >
                  Enseignants
                </Button>
                <Button
                  variant={viewMode === "salle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("salle")}
                >
                  Salles
                </Button>
              </div>
              
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {viewMode === "classe" ? "Classe:" : viewMode === "enseignant" ? "Enseignant:" : "Salle:"}
                </span>
                <select
                  className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={viewMode === "classe" ? selectedClasse : viewMode === "enseignant" ? selectedEnseignant : selectedSalle}
                  onChange={(e) => {
                    if (viewMode === "classe") setSelectedClasse(e.target.value)
                    else if (viewMode === "enseignant") setSelectedEnseignant(e.target.value)
                    else setSelectedSalle(e.target.value)
                  }}
                >
                  <option value="all">
                    {viewMode === "classe" ? "Toutes les classes" : viewMode === "enseignant" ? "Tous les enseignants" : "Toutes les salles"}
                  </option>
                  {viewMode === "classe" && classesUniques.map((classe) => (
                    <option key={classe.id} value={classe.id}>{classe.nom}</option>
                  ))}
                  {viewMode === "enseignant" && enseignantsUniques.filter(id => id && id !== "").map((enseignantId) => {
                    const enseignant = personnel.find(p => p.id === enseignantId)
                    return (
                      <option key={enseignantId} value={enseignantId}>
                        {enseignant ? `${enseignant.prenom} ${enseignant.nom}` : enseignantId}
                      </option>
                    )
                  })}
                  {viewMode === "salle" && sallesUniques.filter(id => id && id !== "").map((salle) => (
                    <option key={salle} value={salle}>{salle}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Matière:</span>
                <select
                  className="border rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                >
                  <option value="all">Toutes les matières</option>
                  {matieresUniques.filter(id => id && id !== "").map((matiere) => (
                    <option key={matiere} value={matiere}>{matiere}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planning en grille */}
        <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold">Heure</th>
                    {jours.map((jour) => (
                      <th key={jour} className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold capitalize min-w-[120px]">
                        {jour}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {creneauxAffiches.map((creneauHoraire) => (
                    <tr key={`${creneauHoraire.debut}-${creneauHoraire.fin}`}>
                      <td className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-750 text-gray-900 dark:text-white font-medium text-center">
                        {creneauHoraire.debut} - {creneauHoraire.fin}
                      </td>
                      {jours.map((jour) => {
                        const creneau = getCreneauForCell(jour, creneauHoraire)
                        const aConflit = creneau && detecterConflits(creneau)
                        
                        return (
                          <td
                            key={`${jour}-${creneauHoraire.debut}-${creneauHoraire.fin}`}
                            className={`border border-gray-300 dark:border-gray-600 p-2 h-20 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              aConflit ? 'bg-red-100 dark:bg-red-900' : ''
                            }`}
                            onDoubleClick={() => handleCellClick(jour, creneauHoraire)}
                          >
                            {creneau ? (
                              <div
                                className={`h-full rounded p-2 text-white text-xs ${
                                  aConflit ? 'ring-2 ring-red-500' : ''
                                }`}
                                style={{ backgroundColor: getCouleurMatiere(creneau.matiere, matieres) }}
                              >
                                <div className="font-semibold truncate">{creneau.matiere || "Cours"}</div>
                                <div className="truncate opacity-90">{creneau.enseignantNom}</div>
                                <div className="truncate opacity-75">{creneau.salle}</div>
                                {aConflit && (
                                  <div className="text-red-200 font-bold mt-1">⚠ Conflit</div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                                <span className="text-2xl">+</span>
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

        {/* Modal d'ajout/modification */}
        {showAddModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false)
                setEditingCreneau(null)
                setEditingCell(null)
                setFormData({
                  classeId: "",
                  classeNom: "",
                  enseignantId: "",
                  matiere: "",
                  salle: "",
                  heureDebut: "",
                  heureFin: "",
                  jour: "lundi"
                })
              }
            }}
          >
            <div 
              className={`rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                {editingCreneau ? "Modifier le créneau" : "Nouveau créneau"}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jour" className="text-gray-900 dark:text-white">Jour *</Label>
                  <select
                    id="jour"
                    className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.jour}
                    onChange={(e) => setFormData({...formData, jour: e.target.value as CreneauEmploiDuTemps["jour"]})}
                  >
                    {jours.map((jour) => (
                      <option key={jour} value={jour} className="capitalize">{jour}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe" className="text-gray-900 dark:text-white">Classe *</Label>
                  <select
                    id="classe"
                    className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.classeId || ""}
                    onChange={(e) => {
                      const selectedClasse = classes.find(c => c.id === e.target.value)
                      setFormData({...formData, classeId: e.target.value, classeNom: selectedClasse?.nom || ""})
                    }}
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enseignant" className="text-gray-900 dark:text-white">Enseignant *</Label>
                  <select
                    id="enseignant"
                    className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.enseignantId || ""}
                    onChange={(e) => setFormData({...formData, enseignantId: e.target.value})}
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {personnel.filter(p => p.id && p.id !== "").map((p) => (
                      <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matiere" className="text-gray-900 dark:text-white">Matière</Label>
                  <select
                    id="matiere"
                    className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={formData.matiere || ""}
                    onChange={(e) => setFormData({...formData, matiere: e.target.value})}
                  >
                    <option value="">Sélectionner une matière</option>
                    {matieres.map((m) => (
                      <option key={m.id} value={m.nom}>{m.nom} ({m.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salle" className="text-gray-900 dark:text-white">Salle</Label>
                  <Input
                    id="salle"
                    value={formData.salle}
                    onChange={(e: any) => setFormData({...formData, salle: e.target.value})}
                    placeholder="Ex: Salle 12"
                    className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heureDebut" className="text-gray-900 dark:text-white">Début *</Label>
                    <Input
                      id="heureDebut"
                      type="time"
                      value={formData.heureDebut}
                      onChange={(e: any) => setFormData({...formData, heureDebut: e.target.value})}
                      className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heureFin" className="text-gray-900 dark:text-white">Fin *</Label>
                    <Input
                      id="heureFin"
                      type="time"
                      value={formData.heureFin}
                      onChange={(e: any) => setFormData({...formData, heureFin: e.target.value})}
                      className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSaveCreneau} className="flex-1">
                  {editingCreneau ? "Modifier" : "Créer"}
                </Button>
                {editingCreneau && (
                  <Button variant="destructive" onClick={() => editingCreneau && handleDeleteCreneau(editingCreneau.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <Button variant="outline" onClick={() => {
                  setShowAddModal(false)
                  setEditingCreneau(null)
                  setEditingCell(null)
                  setFormData({
                    classeId: "",
                    classeNom: "",
                    enseignantId: "",
                    matiere: "",
                    salle: "",
                    heureDebut: "",
                    heureFin: "",
                    jour: "lundi"
                  })
                }} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bouton d'ajout rapide flottant */}
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg"
          onClick={() => {
            setEditingCell(null)
            setEditingCreneau(null)
            setShowAddModal(true)
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
          </>
        )}
      </div>
    </div>
  )
}
