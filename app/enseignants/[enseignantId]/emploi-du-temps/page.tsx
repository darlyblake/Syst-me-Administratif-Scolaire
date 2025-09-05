"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, GraduationCap, Printer } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, CreneauEmploiDuTemps } from "@/types/models"
import { ProtectionRoute } from "@/components/protection-route"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function EmploiDuTempsPage() {
  const [enseignants, setEnseignants] = useState<DonneesEnseignant[]>([])
  const [creneaux, setCreneaux] = useState<CreneauEmploiDuTemps[]>([])
  const [enseignantSelectionne, setEnseignantSelectionne] = useState<string>("all")
  const [classeSelectionnee, setClasseSelectionnee] = useState<string>("all")
  const [matiere, setMatiere] = useState("")
  const [classe, setClasse] = useState("")
  const [jourSelectionne, setJourSelectionne] = useState<string>("lundi")
  const [heureDebut, setHeureDebut] = useState("")
  const [heureFin, setHeureFin] = useState("")

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const heures = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]

  useEffect(() => {
    chargerDonnees()
  }, [])

  const chargerDonnees = () => {
    const donneesEnseignants = serviceEnseignants.obtenirTousLesEnseignants()
    setEnseignants(donneesEnseignants)

    const tousCreneaux = donneesEnseignants.flatMap((enseignant) =>
      serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignant.id)
    )
    setCreneaux(tousCreneaux)
  }

  const creneauxFiltres = creneaux.filter((c) => {
    const correspondEnseignant = enseignantSelectionne === "all" || c.enseignantId === enseignantSelectionne
    const correspondClasse = classeSelectionnee === "all" || c.classe === classeSelectionnee
    return correspondEnseignant && correspondClasse
  })

  const obtenirEnseignantParId = (id: string) => enseignants.find((e) => e.id === id)

  const genererGrilleHoraire = () => {
    const grille: Record<string, Record<string, CreneauEmploiDuTemps | null>> = {}
    
    jours.forEach((jour) => {
      grille[jour] = {}
      heures.forEach((heure) => (grille[jour][heure] = null))
    })
    
    creneauxFiltres.forEach((creneau) => {
      if (grille[creneau.jour] && !grille[creneau.jour][creneau.heureDebut]) {
        grille[creneau.jour][creneau.heureDebut] = creneau
      }
    })
    
    return grille
  }

  const grilleHoraire = genererGrilleHoraire()

  const obtenirStatistiques = () => {
    const totalCreneaux = creneaux.length
    const enseignantsActifs = new Set(creneaux.map((c) => c.enseignantId)).size
    const classesOccupees = new Set(creneaux.map((c) => c.classe)).size
    const matieresEnseignees = new Set(creneaux.map((c) => c.matiere)).size
    return { totalCreneaux, enseignantsActifs, classesOccupees, matieresEnseignees }
  }

  const stats = obtenirStatistiques()

  const ajouterCreneau = () => {
    if (!enseignantSelectionne || enseignantSelectionne === "all" || !matiere || !classe || !jourSelectionne || !heureDebut || !heureFin) {
      alert("Veuillez remplir tous les champs et sélectionner un enseignant")
      return
    }
    
    const nouveauCreneau: CreneauEmploiDuTemps = {
      id: Date.now().toString(),
      enseignantId: enseignantSelectionne,
      matiere,
      classe,
      jour: jourSelectionne as CreneauEmploiDuTemps["jour"],
      heureDebut,
      heureFin,
    }
    
    setCreneaux([...creneaux, nouveauCreneau])
    setMatiere("")
    setClasse("")
    setHeureDebut("")
    setHeureFin("")
  }

  const imprimerPDF = () => {
    const doc = new jsPDF()
    const entetes = ["Heure", ...jours.map(j => j.charAt(0).toUpperCase() + j.slice(1))]
    const data = heures.map((heure) => {
      return [heure, ...jours.map(jour => {
        const c = grilleHoraire[jour][heure]
        return c ? `${c.classe} - ${c.matiere}\n${obtenirEnseignantParId(c.enseignantId)?.prenom} ${obtenirEnseignantParId(c.enseignantId)?.nom}` : "Libre"
      })]
    })
    
    autoTable(doc, { 
      head: [entetes], 
      body: data,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    doc.save("emploi_du_temps.pdf")
  }

  return (
    <ProtectionRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* En-tête */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/tableau-bord">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-6 w-6" /> Emploi du Temps Général
                </h1>
                <p className="text-gray-600">Vue d'ensemble des emplois du temps</p>
              </div>
            </div>
            <Button variant="outline" onClick={imprimerPDF}>
              <Printer className="h-4 w-4 mr-2" /> Exporter PDF
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Statistiques */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalCreneaux}</div>
                <div className="text-sm text-gray-600">Créneaux programmés</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.enseignantsActifs}</div>
                <div className="text-sm text-gray-600">Enseignants actifs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.classesOccupees}</div>
                <div className="text-sm text-gray-600">Classes occupées</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.matieresEnseignees}</div>
                <div className="text-sm text-gray-600">Matières enseignées</div>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire ajout créneau */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ajouter un créneau</CardTitle>
              <CardDescription>Remplir l'emploi du temps pour un enseignant</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <Select 
                value={enseignantSelectionne} 
                onValueChange={setEnseignantSelectionne}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {enseignants.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.prenom} {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input 
                type="text" 
                placeholder="Matière" 
                className="border p-2 rounded w-full" 
                value={matiere} 
                onChange={(e) => setMatiere(e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="Classe" 
                className="border p-2 rounded w-full" 
                value={classe} 
                onChange={(e) => setClasse(e.target.value)} 
              />

              <Select
                value={jourSelectionne}
                onValueChange={setJourSelectionne}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Jour" />
                </SelectTrigger>
                <SelectContent>
                  {jours.map((jour) => (
                    <SelectItem key={jour} value={jour}>
                      {jour.charAt(0).toUpperCase() + jour.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input 
                type="time" 
                placeholder="Heure début" 
                className="border p-2 rounded w-full" 
                value={heureDebut} 
                onChange={(e) => setHeureDebut(e.target.value)} 
              />
              <input 
                type="time" 
                placeholder="Heure fin" 
                className="border p-2 rounded w-full" 
                value={heureFin} 
                onChange={(e) => setHeureFin(e.target.value)} 
              />
            </CardContent>
            <CardContent>
              <Button onClick={ajouterCreneau}>
                Ajouter le créneau
              </Button>
            </CardContent>
          </Card>

          {/* Filtres */}
          <Card className="mb-6">
            <CardContent className="grid md:grid-cols-2 gap-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enseignant</label>
                <Select value={enseignantSelectionne} onValueChange={setEnseignantSelectionne}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les enseignants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les enseignants</SelectItem>
                    {enseignants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.prenom} {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Classe</label>
                <Select value={classeSelectionnee} onValueChange={setClasseSelectionnee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {Array.from(new Set(creneaux.map(c => c.classe))).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Grille et Liste */}
          <Tabs defaultValue="grille" className="space-y-6">
            <TabsList>
              <TabsTrigger value="grille">Grille horaire</TabsTrigger>
              <TabsTrigger value="liste">Liste des créneaux</TabsTrigger>
              <TabsTrigger value="enseignants">Par enseignant</TabsTrigger>
            </TabsList>

            <TabsContent value="grille">
              <Card>
                <CardHeader>
                  <CardTitle>Grille horaire hebdomadaire</CardTitle>
                  <CardDescription>Vue d'ensemble de tous les créneaux programmés</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 p-2 bg-gray-50 text-sm font-medium">Heure</th>
                          {jours.map((jour) => (
                            <th key={jour} className="border border-gray-300 p-2 bg-gray-50 text-sm font-medium">
                              {jour.charAt(0).toUpperCase() + jour.slice(1)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heures.map((heure) => (
                          <tr key={heure}>
                            <td className="border border-gray-300 p-2 bg-gray-50 text-sm font-medium">{heure}</td>
                            {jours.map((jour) => {
                              const creneau = grilleHoraire[jour][heure]
                              return (
                                <td key={`${jour}-${heure}`} className="border border-gray-300 p-1">
                                  {creneau ? (
                                    <div className="bg-blue-100 p-2 rounded text-xs">
                                      <div className="font-medium">{creneau.matiere}</div>
                                      <div className="text-gray-600">{creneau.classe}</div>
                                      <div className="text-gray-500">
                                        {obtenirEnseignantParId(creneau.enseignantId)?.prenom} {obtenirEnseignantParId(creneau.enseignantId)?.nom}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-16 flex items-center justify-center text-gray-400 text-xs">
                                      Libre
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
                  <CardDescription>Tous les créneaux programmés</CardDescription>
                </CardHeader>
                <CardContent>
                  {creneauxFiltres.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun créneau trouvé avec les filtres sélectionnés</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creneauxFiltres.map((creneau) => {
                        const enseignant = obtenirEnseignantParId(creneau.enseignantId)
                        return (
                          <div key={creneau.id} className="border rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {creneau.jour.charAt(0).toUpperCase() + creneau.jour.slice(1)}
                                </Badge>
                                <Badge variant="secondary">
                                  {creneau.heureDebut} - {creneau.heureFin}
                                </Badge>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>Matière:</strong> {creneau.matiere}</p>
                                  <p><strong>Classe:</strong> {creneau.classe}</p>
                                </div>
                                <div>
                                  <p><strong>Enseignant:</strong> {enseignant?.prenom} {enseignant?.nom}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="enseignants">
              <Card>
                <CardHeader>
                  <CardTitle>Emploi du temps par enseignant</CardTitle>
                  <CardDescription>Sélectionnez un enseignant pour voir son emploi du temps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Fonctionnalité en cours de développement</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectionRoute>
  )
}