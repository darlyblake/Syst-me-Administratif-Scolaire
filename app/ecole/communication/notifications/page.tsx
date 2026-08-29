"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Bell, Send, Calendar, Users } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"

export default function Notifications() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? "demo-establishment"
  const { data: supabaseStudents } = useStudents(establishmentId)

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

  const [type, setType] = useState("")
  const [destinataire, setDestinataire] = useState("")
  const [classeCible, setClasseCible] = useState("")
  const [titre, setTitre] = useState("")
  const [message, setMessage] = useState("")
  const [dateEnvoi, setDateEnvoi] = useState("")
  const [envoyerImmédiatement, setEnvoyerImmédiatement] = useState(true)

  const types = [
    { value: "convocation", label: "Convocation" },
    { value: "paiement", label: "Paiement" },
    { value: "absence", label: "Absence" },
    { value: "notes", label: "Notes/Bulletin" },
    { value: "evenement", label: "Événement" },
    { value: "urgence", label: "Urgence" },
  ]

  const destinataires = ["tous", "classe", "individuel"]
  const classes = ["PS1", "PS2", "MS1", "MS2", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6eme", "5eme", "4eme", "3eme"]

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()

  const handleSend = () => {
    console.log("Notification envoyée:", {
      type,
      destinataire,
      classeCible,
      titre,
      message,
      dateEnvoi,
      envoyerImmédiatement,
    })
    // TODO: Implémenter l'envoi de la notification
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
              <Bell className="h-6 w-6" />
              Notifications aux Parents
            </h1>
            <p className="text-gray-600">Envoyer des notifications aux responsables légaux</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer une Notification</CardTitle>
            <CardDescription>Composez et envoyez une notification aux parents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type de notification */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de Notification *</Label>
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

            {/* Destinataire */}
            <div className="space-y-2">
              <Label htmlFor="destinataire">Destinataire *</Label>
              <Select value={destinataire} onValueChange={setDestinataire}>
                <SelectTrigger id="destinataire">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les parents</SelectItem>
                  <SelectItem value="classe">Par classe</SelectItem>
                  <SelectItem value="individuel">Individuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Classe cible */}
            {destinataire === "classe" && (
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
            )}

            {/* Élève cible */}
            {destinataire === "individuel" && (
              <div className="space-y-2">
                <Label htmlFor="eleve">Élève Cible *</Label>
                <Select>
                  <SelectTrigger id="eleve">
                    <SelectValue placeholder="Sélectionner l'élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.prenom} {student.nom} ({student.classe})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                placeholder="Ex: Convocation réunion parents-professeurs"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Écrivez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>

            {/* Programmation */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediat"
                  checked={envoyerImmédiatement}
                  onCheckedChange={(checked) => setEnvoyerImmédiatement(checked as boolean)}
                />
                <Label htmlFor="immediat">Envoyer immédiatement</Label>
              </div>

              {!envoyerImmédiatement && (
                <div className="space-y-2">
                  <Label htmlFor="dateEnvoi">Date et heure d'envoi</Label>
                  <Input
                    id="dateEnvoi"
                    type="datetime-local"
                    value={dateEnvoi}
                    onChange={(e) => setDateEnvoi(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Statistiques de destination */}
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-semibold">Destinataires estimés</p>
                    <p className="text-sm text-gray-600">
                      {destinataire === "tous" ? `${allStudents.length} parents` 
                        : destinataire === "classe" && classeCible ? `${allStudents.filter(s => s.classe === classeCible).length} parents`
                        : "1 parent"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button onClick={handleSend} className="flex-1" disabled={!type || !destinataire || !titre || !message}>
                <Send className="mr-2 h-4 w-4" />
                {envoyerImmédiatement ? "Envoyer Maintenant" : "Programmer l'Envoi"}
              </Button>
              <Button variant="outline" onClick={() => {
                setType("")
                setDestinataire("")
                setClasseCible("")
                setTitre("")
                setMessage("")
                setDateEnvoi("")
                setEnvoyerImmédiatement(true)
              }}>
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historique des notifications */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notifications Récentes</CardTitle>
            <CardDescription>Dernières notifications envoyées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Convocation Réunion Parents-Professeurs</p>
                    <p className="text-sm text-gray-600">Envoyé à: Tous les parents</p>
                    <p className="text-xs text-gray-500">Envoyé le 05/07/2026 à 10:30</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Envoyé</span>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Rappel Paiement Frais Scolarité</p>
                    <p className="text-sm text-gray-600">Envoyé à: Classe CE1</p>
                    <p className="text-xs text-gray-500">Envoyé le 03/07/2026 à 14:00</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Envoyé</span>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Bulletin Trimestre 1 Disponible</p>
                    <p className="text-sm text-gray-600">Envoyé à: Tous les parents</p>
                    <p className="text-xs text-gray-500">Envoyé le 01/07/2026 à 09:00</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Envoyé</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
