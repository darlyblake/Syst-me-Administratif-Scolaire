"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Plus, Edit, Trash2, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"
import { serviceEvenements } from "@/services/evenements.service"
import { serviceClasses } from "@/services/classes.service"
import type { Evenement } from "@/services/evenements.service"
import type { Classe } from "@/types/models"

const TYPES_EVENEMENT = [
  { value: "reunion", label: "Réunion" },
  { value: "examen", label: "Examen" },
  { value: "fete", label: "Fête" },
  { value: "conference", label: "Conférence" },
  { value: "sport", label: "Sport" },
  { value: "autre", label: "Autre" }
] as const

const STATUT_EVENEMENT = [
  { value: "planifie", label: "Planifié" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "annule", label: "Annulé" }
] as const

export default function EvenementsPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState("tous")
  const [filterStatut, setFilterStatut] = useState("tous")
  const [nouvelEvenement, setNouvelEvenement] = useState({
    titre: "",
    description: "",
    type: "reunion" as Evenement["type"],
    date: "",
    heureDebut: "",
    heureFin: "",
    lieu: "",
    classeId: "",
    statut: "planifie" as Evenement["statut"]
  })

  useEffect(() => {
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
    setClasses(serviceClasses.obtenirToutesLesClasses())
  }, [])

  const handleAjouterEvenement = () => {
    if (!nouvelEvenement.titre || !nouvelEvenement.date) {
      alert("Veuillez remplir le titre et la date")
      return
    }

    serviceEvenements.creerEvenement(nouvelEvenement)
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
    setShowAddModal(false)
    setNouvelEvenement({
      titre: "",
      description: "",
      type: "reunion",
      date: "",
      heureDebut: "",
      heureFin: "",
      lieu: "",
      classeId: "",
      statut: "planifie"
    })
  }

  const handleSupprimerEvenement = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
      serviceEvenements.supprimerEvenement(id)
      setEvenements(serviceEvenements.obtenirTousLesEvenements())
    }
  }

  const handleMettreAJourStatut = (id: string, statut: Evenement["statut"]) => {
    serviceEvenements.mettreAJourStatut(id, statut)
    setEvenements(serviceEvenements.obtenirTousLesEvenements())
  }

  const filteredEvenements = evenements.filter(e => {
    const matchType = filterType === "tous" || e.type === filterType
    const matchStatut = filterStatut === "tous" || e.statut === filterStatut
    return matchType && matchStatut
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const statistiques = serviceEvenements.obtenirStatistiques()
  const evenementsAVenir = serviceEvenements.obtenirEvenementsAVenir()

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
              Événements Scolaires
            </h1>
            <p className="text-gray-600">Gestion des événements et activités</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">À venir</p>
              <p className="text-2xl font-bold text-blue-600">{statistiques.aVenir}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.enCours}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Terminés</p>
              <p className="text-2xl font-bold text-gray-600">{statistiques.termines}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {TYPES_EVENEMENT.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  {STATUT_EVENEMENT.map((statut) => (
                    <SelectItem key={statut.value} value={statut.value}>{statut.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel événement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Événements à venir */}
        {evenementsAVenir.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Prochains événements</CardTitle>
              <CardDescription>Les {Math.min(5, evenementsAVenir.length)} prochains événements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {evenementsAVenir.slice(0, 5).map((evenement) => (
                  <div key={evenement.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{new Date(evenement.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                        <span className="text-lg font-bold text-blue-600">{new Date(evenement.date).getDate()}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{evenement.titre}</p>
                        <p className="text-sm text-gray-600">{TYPES_EVENEMENT.find(t => t.value === evenement.type)?.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {evenement.heureDebut && (
                        <p className="text-sm text-gray-600">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {evenement.heureDebut} {evenement.heureFin && `- ${evenement.heureFin}`}
                        </p>
                      )}
                      {evenement.lieu && (
                        <p className="text-sm text-gray-600">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {evenement.lieu}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tous les événements */}
        <Card>
          <CardHeader>
            <CardTitle>Tous les événements</CardTitle>
            <CardDescription>{filteredEvenements.length} événement(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredEvenements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun événement trouvé</p>
              ) : (
                filteredEvenements.map((evenement) => (
                  <div key={evenement.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">{new Date(evenement.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                            <span className="text-lg font-bold text-blue-600">{new Date(evenement.date).getDate()}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{evenement.titre}</p>
                            <p className="text-sm text-gray-600">{evenement.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            evenement.statut === 'planifie' ? 'bg-blue-100 text-blue-800' :
                            evenement.statut === 'en_cours' ? 'bg-green-100 text-green-800' :
                            evenement.statut === 'termine' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {STATUT_EVENEMENT.find(s => s.value === evenement.statut)?.label}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                            {TYPES_EVENEMENT.find(t => t.value === evenement.type)?.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        {evenement.heureDebut && (
                          <p className="text-sm text-gray-600">
                            <Clock className="h-4 w-4 inline mr-1" />
                            {evenement.heureDebut} {evenement.heureFin && `- ${evenement.heureFin}`}
                          </p>
                        )}
                        {evenement.lieu && (
                          <p className="text-sm text-gray-600">
                            <MapPin className="h-4 w-4 inline mr-1" />
                            {evenement.lieu}
                          </p>
                        )}
                        {evenement.classeId && (
                          <p className="text-sm text-gray-600">
                            <Users className="h-4 w-4 inline mr-1" />
                            {classes.find(c => c.id === evenement.classeId)?.nom || 'Classe inconnue'}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleSupprimerEvenement(evenement.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouvel Événement</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={nouvelEvenement.titre}
                    onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, titre: e.target.value })}
                    placeholder="Ex: Réunion parents-professeurs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={nouvelEvenement.description}
                    onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={nouvelEvenement.type} onValueChange={(value) => setNouvelEvenement({ ...nouvelEvenement, type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_EVENEMENT.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={nouvelEvenement.date}
                    onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heureDebut">Heure début</Label>
                    <Input
                      id="heureDebut"
                      type="time"
                      value={nouvelEvenement.heureDebut}
                      onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, heureDebut: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heureFin">Heure fin</Label>
                    <Input
                      id="heureFin"
                      type="time"
                      value={nouvelEvenement.heureFin}
                      onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, heureFin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lieu">Lieu</Label>
                  <Input
                    id="lieu"
                    value={nouvelEvenement.lieu}
                    onChange={(e) => setNouvelEvenement({ ...nouvelEvenement, lieu: e.target.value })}
                    placeholder="Ex: Salle de réunion"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe">Classe (optionnel)</Label>
                  <Select value={nouvelEvenement.classeId} onValueChange={(value) => setNouvelEvenement({ ...nouvelEvenement, classeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les classes</SelectItem>
                      {classes.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterEvenement} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
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
