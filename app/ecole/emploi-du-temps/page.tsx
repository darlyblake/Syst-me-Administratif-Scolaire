"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Plus, Edit, Trash2, Clock } from "lucide-react"
import Link from "next/link"
import { serviceEmploiDuTemps } from "@/services/emploi-du-temps.service"
import { serviceClasses } from "@/services/classes.service"
import type { EmploiDuTemps, Creneau } from "@/services/emploi-du-temps.service"
import type { Classe } from "@/types/models"

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const

export default function EmploiDuTempsPage() {
  const [emploisDuTemps, setEmploisDuTemps] = useState<EmploiDuTemps[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [selectedClasse, setSelectedClasse] = useState<string>("")
  const [selectedEmploi, setSelectedEmploi] = useState<EmploiDuTemps | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCreneauModal, setShowCreneauModal] = useState(false)
  const [nouveauCreneau, setNouveauCreneau] = useState({
    jour: "lundi" as typeof JOURS[number],
    heureDebut: "",
    heureFin: "",
    matiere: "",
    enseignantId: "",
    salle: ""
  })

  useEffect(() => {
    setEmploisDuTemps(serviceEmploiDuTemps.obtenirTousLesEmploisDuTemps())
    setClasses(serviceClasses.obtenirToutesLesClasses())
  }, [])

  const handleGenererEmploiDuTemps = (classeId: string, nomClasse: string) => {
    serviceEmploiDuTemps.genererEmploiDuTempsParDefaut(classeId, nomClasse)
    setEmploisDuTemps(serviceEmploiDuTemps.obtenirTousLesEmploisDuTemps())
    setSelectedEmploi(serviceEmploiDuTemps.obtenirEmploiDuTempsParClasse(classeId))
  }

  const handleAjouterCreneau = () => {
    if (!selectedEmploi || !nouveauCreneau.jour || !nouveauCreneau.heureDebut || !nouveauCreneau.heureFin || !nouveauCreneau.matiere) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    if (serviceEmploiDuTemps.verifierConflit(selectedEmploi.id, nouveauCreneau.jour, nouveauCreneau.heureDebut, nouveauCreneau.heureFin, nouveauCreneau.enseignantId)) {
      alert("Conflit détecté avec un créneau existant")
      return
    }

    serviceEmploiDuTemps.ajouterCreneau(selectedEmploi.id, {
      ...nouveauCreneau,
      classeId: selectedEmploi.classeId
    })

    setEmploisDuTemps(serviceEmploiDuTemps.obtenirTousLesEmploisDuTemps())
    setSelectedEmploi(serviceEmploiDuTemps.obtenirEmploiDuTempsParClasse(selectedEmploi.classeId))
    setShowCreneauModal(false)
    setNouveauCreneau({
      jour: "lundi",
      heureDebut: "",
      heureFin: "",
      matiere: "",
      enseignantId: "",
      salle: ""
    })
  }

  const handleSupprimerCreneau = (creneauId: string) => {
    if (!selectedEmploi) return
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) {
      serviceEmploiDuTemps.supprimerCreneau(selectedEmploi.id, creneauId)
      setEmploisDuTemps(serviceEmploiDuTemps.obtenirTousLesEmploisDuTemps())
      setSelectedEmploi(serviceEmploiDuTemps.obtenirEmploiDuTempsParClasse(selectedEmploi.classeId))
    }
  }

  const getCreneauxParJour = (jour: typeof JOURS[number]): Creneau[] => {
    if (!selectedEmploi) return []
    return selectedEmploi.creneaux.filter(c => c.jour === jour).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Emploi du Temps
            </h1>
            <p className="text-gray-600">Gestion des horaires des classes</p>
          </div>
        </div>

        {/* Sélection de classe */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Label htmlFor="classe">Sélectionner une classe</Label>
                <Select value={selectedClasse} onValueChange={(value) => {
                  setSelectedClasse(value)
                  setSelectedEmploi(serviceEmploiDuTemps.obtenirEmploiDuTempsParClasse(value))
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classe) => (
                      <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClasse && !selectedEmploi && (
                <Button onClick={() => {
                  const classe = classes.find(c => c.id === selectedClasse)
                  if (classe) handleGenererEmploiDuTemps(selectedClasse, classe.nom)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Générer emploi du temps
                </Button>
              )}
              {selectedEmploi && (
                <Button onClick={() => setShowCreneauModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter créneau
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Affichage de l'emploi du temps */}
        {selectedEmploi ? (
          <div className="space-y-4">
            {JOURS.map((jour) => {
              const creneaux = getCreneauxParJour(jour)
              return (
                <Card key={jour}>
                  <CardHeader>
                    <CardTitle className="capitalize">{jour}</CardTitle>
                    <CardDescription>{creneaux.length} créneau(x)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {creneaux.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Aucun créneau ce jour</p>
                    ) : (
                      <div className="space-y-2">
                        {creneaux.map((creneau) => (
                          <div key={creneau.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{creneau.heureDebut} - {creneau.heureFin}</span>
                              </div>
                              <div className="h-6 w-px bg-gray-300" />
                              <div>
                                <p className="font-semibold">{creneau.matiere}</p>
                                {creneau.salle && <p className="text-sm text-gray-600">Salle: {creneau.salle}</p>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleSupprimerCreneau(creneau.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Sélectionnez une classe pour voir son emploi du temps</p>
            </CardContent>
          </Card>
        )}

        {/* Modal d'ajout de créneau */}
        {showCreneauModal && selectedEmploi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouveau Créneau</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jour">Jour *</Label>
                  <Select value={nouveauCreneau.jour} onValueChange={(value) => setNouveauCreneau({ ...nouveauCreneau, jour: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURS.map((jour) => (
                        <SelectItem key={jour} value={jour} className="capitalize">{jour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heureDebut">Heure de début *</Label>
                  <Input
                    id="heureDebut"
                    type="time"
                    value={nouveauCreneau.heureDebut}
                    onChange={(e) => setNouveauCreneau({ ...nouveauCreneau, heureDebut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heureFin">Heure de fin *</Label>
                  <Input
                    id="heureFin"
                    type="time"
                    value={nouveauCreneau.heureFin}
                    onChange={(e) => setNouveauCreneau({ ...nouveauCreneau, heureFin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matiere">Matière *</Label>
                  <Input
                    id="matiere"
                    value={nouveauCreneau.matiere}
                    onChange={(e) => setNouveauCreneau({ ...nouveauCreneau, matiere: e.target.value })}
                    placeholder="Ex: Mathématiques"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salle">Salle</Label>
                  <Input
                    id="salle"
                    value={nouveauCreneau.salle}
                    onChange={(e) => setNouveauCreneau({ ...nouveauCreneau, salle: e.target.value })}
                    placeholder="Ex: Salle 101"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterCreneau} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowCreneauModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
