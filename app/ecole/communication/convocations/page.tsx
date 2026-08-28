"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Send, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"

export default function Convocations() {
  const [type, setType] = useState("")
  const [classeCible, setClasseCible] = useState("")
  const [date, setDate] = useState("")
  const [heure, setHeure] = useState("")
  const [lieu, setLieu] = useState("")
  const [objet, setObjet] = useState("")
  const [description, setDescription] = useState("")
  const [rappelAuto, setRappelAuto] = useState(false)

  const types = [
    { value: "reunion_parents", label: "Réunion Parents-Professeurs" },
    { value: "conseil_classe", label: "Conseil de Classe" },
    { value: "administrative", label: "Convocation Administrative" },
  ]

  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]
  const allStudents = serviceEleves.obtenirTousLesEleves()

  const handleSend = () => {
    console.log("Convocation envoyée:", {
      type,
      classeCible,
      date,
      heure,
      lieu,
      objet,
      description,
      rappelAuto,
    })
    // TODO: Implémenter l'envoi de la convocation
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
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
              Convocations
            </h1>
            <p className="text-gray-600">Gérer les convocations aux parents</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer une Convocation</CardTitle>
            <CardDescription>Envoyer une convocation aux parents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type de convocation */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de Convocation *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classe cible */}
            <div className="space-y-2">
              <Label htmlFor="classe">Classe Cible *</Label>
              <Select value={classeCible} onValueChange={setClasseCible}>
                <SelectTrigger id="classe">
                  <SelectValue placeholder="Sélectionner la classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classe) => (
                    <SelectItem key={classe} value={classe}>
                      {classe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heure">Heure *</Label>
                <Input
                  id="heure"
                  type="time"
                  value={heure}
                  onChange={(e) => setHeure(e.target.value)}
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="space-y-2">
              <Label htmlFor="lieu">Lieu *</Label>
              <Input
                id="lieu"
                placeholder="Ex: Salle de réunion, Bâtiment A..."
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
              />
            </div>

            {/* Objet */}
            <div className="space-y-2">
              <Label htmlFor="objet">Objet *</Label>
              <Input
                id="objet"
                placeholder="Ex: Réunion bilan premier trimestre"
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Détails de la convocation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Rappel automatique */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rappel"
                checked={rappelAuto}
                onChange={(e) => setRappelAuto(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="rappel">Envoyer un rappel automatique 24h avant</Label>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button onClick={handleSend} className="flex-1" disabled={!type || !classeCible || !date || !heure || !lieu || !objet}>
                <Send className="mr-2 h-4 w-4" />
                Envoyer la Convocation
              </Button>
              <Button variant="outline" onClick={() => {
                setType("")
                setClasseCible("")
                setDate("")
                setHeure("")
                setLieu("")
                setObjet("")
                setDescription("")
                setRappelAuto(false)
              }}>
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Convocations en attente de réponse */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Convocations en Attente de Réponse</CardTitle>
            <CardDescription>Suivi des réponses des parents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Réunion Parents-Professeurs - CE1</p>
                    <p className="text-sm text-gray-600">Date: 15/07/2026 à 14:00</p>
                    <p className="text-sm text-gray-600">Lieu: Salle de réunion</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">12/25 réponses</p>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">En attente</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Conseil de Classe - CM1</p>
                    <p className="text-sm text-gray-600">Date: 20/07/2026 à 09:00</p>
                    <p className="text-sm text-gray-600">Lieu: Bureaux administratifs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">18/22 réponses</p>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">En attente</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historique des convocations */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Historique des Convocations</CardTitle>
            <CardDescription>Convocations passées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Réunion Rentrée Scolaire - Tous</p>
                    <p className="text-sm text-gray-600">Date: 01/09/2025 à 10:00</p>
                    <p className="text-sm text-gray-600">Lieu: Salle polyvalente</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">45/50 présents</p>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Terminé
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Conseil de Classe - 6ème</p>
                    <p className="text-sm text-gray-600">Date: 15/12/2025 à 15:00</p>
                    <p className="text-sm text-gray-600">Lieu: Salle des professeurs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">20/28 présents</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Passé
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
