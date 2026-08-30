"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Bell } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useNotifications } from "@/hooks/useNotifications"

export default function RendezVous() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: supabaseStudents } = useStudents(establishmentId)
  const { info, error: showError } = useNotifications()

  const mappedSupabaseStudents = useMemo(() => {
    return (supabaseStudents ?? []).map((student) => ({
      id: student.id,
      identifiant: student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || "",
      classe: "",
      classeAncienne: "",
      nomParent: "",
      contactParent: "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: "actif" as const,
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: {
        telephone: student.phone || "",
        email: student.email || "",
        adresse: "",
      },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
      moisPaiement: [],
      optionsPersonnalisees: [],
    }))
  }, [supabaseStudents])

  const [activeTab, setActiveTab] = useState<"demandes" | "calendrier">("demandes")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedHeure, setSelectedHeure] = useState("")
  const [motif, setMotif] = useState("")
  const [notes, setNotes] = useState("")

  const allStudents = mappedSupabaseStudents

  // Simulation des demandes de rendez-vous
  const demandes = [
    {
      id: "1",
      parentNom: "DUPONT",
      parentPrenom: "Marie",
      eleveNom: "Lucas",
      eleveClasse: "CE1",
      dateDemandee: "2026-07-10",
      heureDemandee: "14:00",
      motif: "Discuter du bulletin de Lucas",
      statut: "en_attente",
      dateDemande: "05/07/2026",
    },
    {
      id: "2",
      parentNom: "MARTIN",
      parentPrenom: "Jean",
      eleveNom: "Emma",
      eleveClasse: "CM1",
      dateDemandee: "2026-07-12",
      heureDemandee: "10:00",
      motif: "Problème comportemental",
      statut: "en_attente",
      dateDemande: "06/07/2026",
    },
    {
      id: "3",
      parentNom: "BERNARD",
      parentPrenom: "Sophie",
      eleveNom: "Hugo",
      eleveClasse: "CP",
      dateDemandee: "2026-07-08",
      heureDemandee: "15:30",
      motif: "Demande d'informations",
      statut: "valide",
      dateDemande: "04/07/2026",
    },
  ]

  // Simulation des créneaux disponibles
  const creneauxDisponibles = [
    { date: "2026-07-08", heure: "09:00", disponible: false },
    { date: "2026-07-08", heure: "10:00", disponible: true },
    { date: "2026-07-08", heure: "11:00", disponible: true },
    { date: "2026-07-08", heure: "14:00", disponible: true },
    { date: "2026-07-08", heure: "15:00", disponible: false },
    { date: "2026-07-09", heure: "09:00", disponible: true },
    { date: "2026-07-09", heure: "10:00", disponible: true },
    { date: "2026-07-09", heure: "11:00", disponible: true },
    { date: "2026-07-09", heure: "14:00", disponible: false },
    { date: "2026-07-09", heure: "15:00", disponible: true },
    { date: "2026-07-10", heure: "09:00", disponible: true },
    { date: "2026-07-10", heure: "10:00", disponible: false },
    { date: "2026-07-10", heure: "11:00", disponible: true },
    { date: "2026-07-10", heure: "14:00", disponible: true },
    { date: "2026-07-10", heure: "15:00", disponible: true },
  ]

  const handleValider = (id: string) => {
    if (!establishmentId) {
      showError("Aucun établissement actif sélectionné pour valider un rendez-vous.")
      return
    }

    info("Validation de rendez-vous non activée", {
      description: "Le backend de gestion des rendez-vous doit être raccordé à l’établissement actif avant de valider une demande réelle.",
      duration: 5000,
    })
    console.log("Rendez-vous validé:", id)
  }

  const handleRefuser = (id: string) => {
    if (!establishmentId) {
      showError("Aucun établissement actif sélectionné pour refuser un rendez-vous.")
      return
    }

    info("Refus de rendez-vous non activé", {
      description: "Le backend de gestion des rendez-vous doit être raccordé à l’établissement actif avant de traiter une demande réelle.",
      duration: 5000,
    })
    console.log("Rendez-vous refusé:", id)
  }

  const handleAjouterDisponibilite = () => {
    if (!establishmentId) {
      showError("Aucun établissement actif sélectionné pour ajouter une disponibilité.")
      return
    }

    info("Ajout de disponibilité non activé", {
      description: "Le backend de planification doit être raccordé à l’établissement actif avant d’ajouter un créneau réel.",
      duration: 5000,
    })
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
              Demandes de Rendez-vous
            </h1>
            <p className="text-gray-600">Gestion des rendez-vous avec les parents</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "demandes" ? "default" : "outline"}
            onClick={() => setActiveTab("demandes")}
          >
            Demandes en attente ({demandes.filter(d => d.statut === "en_attente").length})
          </Button>
          <Button
            variant={activeTab === "calendrier" ? "default" : "outline"}
            onClick={() => setActiveTab("calendrier")}
          >
            Calendrier des disponibilités
          </Button>
        </div>

        {activeTab === "demandes" && (
          <>
            {/* Demandes en attente */}
            <Card>
              <CardHeader>
                <CardTitle>Demandes de Rendez-vous</CardTitle>
                <CardDescription>Réception et validation des demandes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demandes.filter(d => d.statut === "en_attente").map((demande) => (
                    <div key={demande.id} className="p-4 border rounded-lg bg-yellow-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <div>
                              <p className="font-semibold">
                                {demande.parentPrenom} {demande.parentNom}
                              </p>
                              <p className="text-sm text-gray-600">
                                Parent de {demande.eleveNom} ({demande.eleveClasse})
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(demande.dateDemandee).toLocaleDateString('fr-FR')}</span>
                              <Clock className="h-4 w-4" />
                              <span>{demande.heureDemandee}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Motif:</strong> {demande.motif}
                          </p>
                          <p className="text-xs text-gray-500">
                            Demande envoyée le {demande.dateDemande}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleValider(demande.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRefuser(demande.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {demandes.filter(d => d.statut === "en_attente").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Aucune demande en attente
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rendez-vous validés */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Rendez-vous Confirmés</CardTitle>
                <CardDescription>Rendez-vous à venir</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demandes.filter(d => d.statut === "valide").map((demande) => (
                    <div key={demande.id} className="p-4 border rounded-lg bg-green-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <div>
                              <p className="font-semibold">
                                {demande.parentPrenom} {demande.parentNom}
                              </p>
                              <p className="text-sm text-gray-600">
                                Parent de {demande.eleveNom} ({demande.eleveClasse})
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(demande.dateDemandee).toLocaleDateString('fr-FR')}</span>
                              <Clock className="h-4 w-4" />
                              <span>{demande.heureDemandee}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">
                            <strong>Motif:</strong> {demande.motif}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Confirmé
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "calendrier" && (
          <>
            {/* Ajouter une disponibilité */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Ajouter une Disponibilité</CardTitle>
                <CardDescription>Définir vos créneaux disponibles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heure">Heure</Label>
                    <Select value={selectedHeure} onValueChange={setSelectedHeure}>
                      <SelectTrigger id="heure">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="11:00">11:00</SelectItem>
                        <SelectItem value="14:00">14:00</SelectItem>
                        <SelectItem value="15:00">15:00</SelectItem>
                        <SelectItem value="16:00">16:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motif">Motif (optionnel)</Label>
                    <Input
                      id="motif"
                      placeholder="Ex: Réunion parents-professeurs"
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes supplémentaires..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button onClick={handleAjouterDisponibilite} className="mt-4">
                  <Calendar className="mr-2 h-4 w-4" />
                  Ajouter la disponibilité
                </Button>
              </CardContent>
            </Card>

            {/* Calendrier des disponibilités */}
            <Card>
              <CardHeader>
                <CardTitle>Calendrier des Disponibilités</CardTitle>
                <CardDescription>Créneaux disponibles pour les rendez-vous</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["2026-07-08", "2026-07-09", "2026-07-10"].map((date) => (
                    <div key={date} className="border rounded-lg p-4">
                      <p className="font-semibold mb-3">
                        {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {["09:00", "10:00", "11:00", "14:00", "15:00"].map((heure) => {
                          const creneau = creneauxDisponibles.find(c => c.date === date && c.heure === heure)
                          const disponible = creneau?.disponible ?? true
                          return (
                            <div
                              key={heure}
                              className={`p-3 rounded text-center ${
                                disponible
                                  ? 'bg-green-100 text-green-800 cursor-pointer hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 cursor-not-allowed'
                              }`}
                            >
                              <p className="font-semibold">{heure}</p>
                              <p className="text-xs">{disponible ? 'Disponible' : 'Occupé'}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Paramètres de rappel */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Rappels Automatiques
                </CardTitle>
                <CardDescription>Configuration des rappels avant les rendez-vous</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Rappel 24h avant</p>
                      <p className="text-sm text-gray-600">Envoyer un rappel la veille du rendez-vous</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">Rappel 1h avant</p>
                      <p className="text-sm text-gray-600">Envoyer un rappel une heure avant</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
