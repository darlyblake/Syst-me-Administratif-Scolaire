"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Download,
  Share2,
  Clock,
  BookOpen,
  Users,
  FileText,
  Eye,
  Database,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { CreneauEmploiDuTemps } from "@/types/models"

export default function EmploiDuTempsPage() {
  const [emploisDuTemps, setEmploisDuTemps] = useState<CreneauEmploiDuTemps[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClasse, setSelectedClasse] = useState<string>("CP1")
  const [isPublished, setIsPublished] = useState(false)
  const [initialisationStatus, setInitialisationStatus] = useState<'none' | 'loading' | 'success' | 'error'>('none')

  const classes = [
    "Maternelle", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème",
    "2nde L", "2nde S", "1ère A1", "1ère A2", "1ère B", "Terminale A1", "Terminale B", "Terminale D", "Terminale S"
  ]

  // Plages horaires typiques pour une journée scolaire
  const plagesHoraires = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00"
  ]

  const joursSemaine = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

  useEffect(() => {
    chargerEmploisDuTemps()
  }, [])

  const chargerEmploisDuTemps = () => {
    setLoading(true)
    // Récupérer tous les emplois du temps depuis le service enseignants
    const tousLesEmploisDuTemps: CreneauEmploiDuTemps[] = []

    // Pour chaque enseignant, récupérer ses créneaux d'emploi du temps
    const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
    enseignants.forEach(enseignant => {
      const creneauxEnseignant = serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignant.id)
      tousLesEmploisDuTemps.push(...creneauxEnseignant)
    })

    setEmploisDuTemps(tousLesEmploisDuTemps)
    setLoading(false)
  }

  const initialiserDonneesTest = () => {
    setInitialisationStatus('loading')

    try {
      // Fonction pour générer un ID unique
      const genererIdUnique = () => {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }

      // Créer des enseignants fictifs
      const enseignantsTest = [
        {
          id: "1758533290658h1gvlrzs5",
          nom: "MARTIN",
          prenom: "Jean",
          identifiant: "mar123",
          motDePasse: "password123",
          email: "jean.martin@ecole.fr",
          telephone: "01-23-45-67-89",
          matieres: ["Mathématiques", "Physique-Chimie"],
          classes: ["CP1", "CP2"],
          statut: "actif",
          dateEmbauche: "2024-01-15T00:00:00.000Z"
        },
        {
          id: genererIdUnique(),
          nom: "DUBOIS",
          prenom: "Marie",
          identifiant: "dub456",
          motDePasse: "password456",
          email: "marie.dubois@ecole.fr",
          telephone: "01-23-45-67-90",
          matieres: ["Français", "Histoire-Géographie"],
          classes: ["CE1", "CE2"],
          statut: "actif",
          dateEmbauche: "2024-01-10T00:00:00.000Z"
        },
        {
          id: genererIdUnique(),
          nom: "GARCIA",
          prenom: "Carlos",
          identifiant: "gar789",
          motDePasse: "password789",
          email: "carlos.garcia@ecole.fr",
          telephone: "01-23-45-67-91",
          matieres: ["Anglais", "Espagnol"],
          classes: ["CM1", "CM2"],
          statut: "actif",
          dateEmbauche: "2024-01-20T00:00:00.000Z"
        }
      ]

      // Créer des créneaux d'emploi du temps
      const creneauxEmploiDuTemps = [
        // Jean MARTIN - CP1
        {
          id: genererIdUnique(),
          enseignantId: "1758533290658h1gvlrzs5",
          classe: "CP1",
          matiere: "Mathématiques",
          jour: "lundi",
          heureDebut: "08:00",
          heureFin: "09:00",
          salle: "A101"
        },
        {
          id: genererIdUnique(),
          enseignantId: "1758533290658h1gvlrzs5",
          classe: "CP1",
          matiere: "Mathématiques",
          jour: "mardi",
          heureDebut: "08:00",
          heureFin: "09:00",
          salle: "A101"
        },
        {
          id: genererIdUnique(),
          enseignantId: "1758533290658h1gvlrzs5",
          classe: "CP1",
          matiere: "Physique-Chimie",
          jour: "mercredi",
          heureDebut: "10:00",
          heureFin: "11:00",
          salle: "B203"
        },
        {
          id: genererIdUnique(),
          enseignantId: "1758533290658h1gvlrzs5",
          classe: "CP1",
          matiere: "Mathématiques",
          jour: "jeudi",
          heureDebut: "08:00",
          heureFin: "09:00",
          salle: "A101"
        },
        {
          id: genererIdUnique(),
          enseignantId: "1758533290658h1gvlrzs5",
          classe: "CP1",
          matiere: "Mathématiques",
          jour: "vendredi",
          heureDebut: "08:00",
          heureFin: "09:00",
          salle: "A101"
        },

        // Marie DUBOIS - CE1
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[1].id,
          classe: "CE1",
          matiere: "Français",
          jour: "lundi",
          heureDebut: "09:00",
          heureFin: "10:00",
          salle: "A102"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[1].id,
          classe: "CE1",
          matiere: "Français",
          jour: "mardi",
          heureDebut: "09:00",
          heureFin: "10:00",
          salle: "A102"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[1].id,
          classe: "CE1",
          matiere: "Histoire-Géographie",
          jour: "mercredi",
          heureDebut: "14:00",
          heureFin: "15:00",
          salle: "C301"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[1].id,
          classe: "CE1",
          matiere: "Français",
          jour: "jeudi",
          heureDebut: "09:00",
          heureFin: "10:00",
          salle: "A102"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[1].id,
          classe: "CE1",
          matiere: "Français",
          jour: "vendredi",
          heureDebut: "09:00",
          heureFin: "10:00",
          salle: "A102"
        },

        // Carlos GARCIA - CM1
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[2].id,
          classe: "CM1",
          matiere: "Anglais",
          jour: "lundi",
          heureDebut: "11:00",
          heureFin: "12:00",
          salle: "B201"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[2].id,
          classe: "CM1",
          matiere: "Anglais",
          jour: "mardi",
          heureDebut: "11:00",
          heureFin: "12:00",
          salle: "B201"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[2].id,
          classe: "CM1",
          matiere: "Espagnol",
          jour: "mercredi",
          heureDebut: "15:00",
          heureFin: "16:00",
          salle: "A103"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[2].id,
          classe: "CM1",
          matiere: "Anglais",
          jour: "jeudi",
          heureDebut: "11:00",
          heureFin: "12:00",
          salle: "B201"
        },
        {
          id: genererIdUnique(),
          enseignantId: enseignantsTest[2].id,
          classe: "CM1",
          matiere: "Anglais",
          jour: "vendredi",
          heureDebut: "11:00",
          heureFin: "12:00",
          salle: "B201"
        }
      ]

      // Sauvegarder les enseignants
      localStorage.setItem("enseignants", JSON.stringify(enseignantsTest))

      // Sauvegarder les emplois du temps
      localStorage.setItem("emploiDuTemps", JSON.stringify(creneauxEmploiDuTemps))

      setInitialisationStatus('success')

      // Recharger les données après 1 seconde
      setTimeout(() => {
        chargerEmploisDuTemps()
      }, 1000)

    } catch (error) {
      console.error("Erreur lors de l'initialisation:", error)
      setInitialisationStatus('error')
    }
  }

  const getEmploisDuTempsClasse = () => {
    return emploisDuTemps.filter(creneau => creneau.classe === selectedClasse)
  }

  const getEmploiDuTempsParJourEtHeure = () => {
    const creneauxClasse = getEmploisDuTempsClasse()
    const emploiDuTemps: { [jour: string]: { [heure: string]: CreneauEmploiDuTemps[] } } = {}

    // Initialiser la structure
    joursSemaine.forEach(jour => {
      emploiDuTemps[jour] = {}
      plagesHoraires.forEach(heure => {
        emploiDuTemps[jour][heure] = []
      })
    })

    // Remplir avec les créneaux existants
    creneauxClasse.forEach(creneau => {
      const heureDebut = creneau.heureDebut
      if (emploiDuTemps[creneau.jour] && emploiDuTemps[creneau.jour][heureDebut]) {
        emploiDuTemps[creneau.jour][heureDebut].push(creneau)
      }
    })

    return emploiDuTemps
  }

  const exporterPDF = () => {
    // Simulation de l'export PDF
    alert("Export PDF en cours de développement...")
  }

  const publierEmploiDuTemps = () => {
    setIsPublished(!isPublished)
    alert(isPublished ? "Emploi du temps retiré de la publication" : "Emploi du temps publié avec succès")
  }

  const emploiDuTempsComplet = getEmploiDuTempsParJourEtHeure()
  const creneauxClasse = getEmploisDuTempsClasse()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Emploi du Temps - Classe {selectedClasse}
              </h1>
              <p className="text-gray-600">
                Emploi du temps consolidé pour les élèves de {selectedClasse}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exporterPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
            <Button
              variant={isPublished ? "default" : "outline"}
              onClick={publierEmploiDuTemps}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isPublished ? "Publié" : "Publier"}
            </Button>
          </div>
        </div>

        {/* Bouton d'initialisation des données */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  🚀 Initialisation des données de test
                </h3>
                <p className="text-gray-600">
                  Cliquez ici pour créer des enseignants et emplois du temps de test
                </p>
              </div>
              <Button
                onClick={initialiserDonneesTest}
                disabled={initialisationStatus === 'loading'}
                className="flex items-center gap-2"
              >
                {initialisationStatus === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Initialisation...
                  </>
                ) : initialisationStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Données créées !
                  </>
                ) : initialisationStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Erreur
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Initialiser les données
                  </>
                )}
              </Button>
            </div>
            {initialisationStatus === 'success' && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ Données créées avec succès !</h4>
                <div className="text-sm text-green-700">
                  <p><strong>👥 Enseignants créés :</strong></p>
                  <ul className="ml-4 mt-1">
                    <li>• Jean MARTIN : mar123 / password123</li>
                    <li>• Marie DUBOIS : dub456 / password456</li>
                    <li>• Carlos GARCIA : gar789 / password789</li>
                  </ul>
                  <p className="mt-2"><strong>🏫 Classes disponibles :</strong> CP1, CE1, CM1</p>
                  <p className="mt-1"><strong>📅 Créneaux créés :</strong> 15 cours programmés</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sélecteur de classe */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sélectionner une classe
                </label>
                <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(classe => (
                      <SelectItem key={classe} value={classe}>
                        {classe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>{creneauxClasse.length}</strong> cours programmés</p>
                <p><strong>{Object.keys(emploiDuTempsComplet).length}</strong> jours avec cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des emplois du temps...</p>
            </CardContent>
          </Card>
        ) : creneauxClasse.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun cours programmé</h3>
              <p className="text-gray-600">
                Aucun créneau de cours n'a été défini pour la classe {selectedClasse}.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Utilisez le bouton "Initialiser les données" ci-dessus pour créer des données de test.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Emploi du Temps - {selectedClasse}
                </div>
                <Badge variant="secondary">
                  {creneauxClasse.length} cours
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[100px]">
                        Heure
                      </th>
                      {joursSemaine.map(jour => (
                        <th key={jour} className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[150px]">
                          {jour.charAt(0).toUpperCase() + jour.slice(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {plagesHoraires.map((heure, index) => {
                      const heureSuivante = plagesHoraires[index + 1] || "18:30"

                      return (
                        <tr key={heure} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {heure} - {heureSuivante}
                            </div>
                          </td>
                          {joursSemaine.map(jour => {
                            const coursAHeure = emploiDuTempsComplet[jour]?.[heure] || []

                            if (coursAHeure.length > 0) {
                              return (
                                <td key={jour} className="border border-gray-200 px-4 py-3 align-top">
                                  <div className="space-y-2">
                                    {coursAHeure.map((cours, coursIndex) => (
                                      <div
                                        key={coursIndex}
                                        className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                                      >
                                        <div className="text-sm font-semibold text-blue-900">
                                          {cours.matiere}
                                        </div>
                                        <div className="text-xs text-blue-700 mt-1">
                                          {cours.salle && `Salle ${cours.salle}`}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          {cours.heureDebut} - {cours.heureFin}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              )
                            } else {
                              return (
                                <td key={jour} className="border border-gray-200 px-4 py-3 text-center">
                                  <div className="text-gray-400 text-sm">-</div>
                                </td>
                              )
                            }
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résumé des cours par matière */}
        {creneauxClasse.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Résumé des matières - {selectedClasse}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from(new Set(creneauxClasse.map(c => c.matiere)))
                  .sort()
                  .map(matiere => {
                    const coursMatiere = creneauxClasse.filter(c => c.matiere === matiere)
                    return (
                      <div key={matiere} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{matiere}</h4>
                          <Badge variant="outline">{coursMatiere.length}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {coursMatiere.length} créneau{coursMatiere.length > 1 ? 'x' : ''}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vue par enseignant pour cette classe */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Enseignants de {selectedClasse}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceEnseignants.obtenirTousLesEnseignants()
                .filter(enseignant =>
                  enseignant.statut === "actif" &&
                  enseignant.classes.includes(selectedClasse)
                )
                .map(enseignant => {
                  const creneauxEnseignant = serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignant.id)
                  const creneauxClasse = creneauxEnseignant.filter(c => c.classe === selectedClasse)

                  return (
                    <div key={enseignant.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {enseignant.prenom} {enseignant.nom}
                        </h4>
                        <Badge variant="outline">
                          {creneauxClasse.length} cours
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {enseignant.matieres.join(", ")}
                      </p>
                      <div className="text-xs text-gray-500">
                        {creneauxClasse.map(c => `${c.matiere} (${c.jour} ${c.heureDebut})`).join(", ")}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
