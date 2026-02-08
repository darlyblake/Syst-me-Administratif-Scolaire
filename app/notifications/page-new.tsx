/**
 * Page de gestion des notifications
 * Permet à l'administration d'envoyer des notifications aux élèves et enseignants
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Send, Users, User, GraduationCap, MessageSquare, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import type { Notification, DonneesEleve, DonneesEnseignant, Classe } from "@/types/models"
import { serviceNotifications } from "@/services/notifications.service"
import { serviceEleves } from "@/services/eleves.service"
import { serviceEnseignants } from "@/services/enseignants.service"
import { NotificationSearchFilters } from "./NotificationSearchFilters"


export default function PageNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [eleves, setEleves] = useState<DonneesEleve[]>([])
  const [enseignants, setEnseignants] = useState<DonneesEnseignant[]>([])
  const [classes] = useState<Classe[]>([
    { id: "6eme", nom: "6ème", niveau: "College", fraisScolarite: 50000, nombreEleves: 0 },
    { id: "5eme", nom: "5ème", niveau: "College", fraisScolarite: 55000, nombreEleves: 0 },
    { id: "4eme", nom: "4ème", niveau: "College", fraisScolarite: 60000, nombreEleves: 0 },
    { id: "3eme", nom: "3ème", niveau: "College", fraisScolarite: 65000, nombreEleves: 0 },
  ])

  // Formulaire de nouvelle notification
  const [titre, setTitre] = useState("")
  const [message, setMessage] = useState("")
  const [destinataireType, setDestinataireType] = useState<string>("")
  const [destinataireSpecifique, setDestinataireSpecifique] = useState("")
  const [classeSelectionnee, setClasseSelectionnee] = useState("")
  const [priorite, setPriorite] = useState<"normale" | "importante" | "urgente">("normale")

  // États pour la recherche et les filtres
  const [rechercheEleve, setRechercheEleve] = useState("")
  const [rechercheEnseignant, setRechercheEnseignant] = useState("")
  const [filtreMatiere, setFiltreMatiere] = useState("")
  const [filtreClasseEleve, setFiltreClasseEleve] = useState("")

  // Charger les données au montage
  useEffect(() => {
    setNotifications(serviceNotifications.obtenirToutesNotifications())
    setEleves(serviceEleves.obtenirTousLesEleves())
    setEnseignants(serviceEnseignants.obtenirTousLesEnseignants())
  }, [])

  // Listes filtrées
  const elevesFiltres = eleves.filter((eleve) => {
    const correspondRecherche = rechercheEleve === "" ||
      `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(rechercheEleve.toLowerCase())
    const correspondClasse = filtreClasseEleve === "" || eleve.classe === filtreClasseEleve
    return correspondRecherche && correspondClasse
  })

  const enseignantsFiltres = enseignants.filter((enseignant) => {
    const correspondRecherche = rechercheEnseignant === "" ||
      `${enseignant.prenom} ${enseignant.nom}`.toLowerCase().includes(rechercheEnseignant.toLowerCase())
    const correspondMatiere = filtreMatiere === "" || enseignant.matieres.includes(filtreMatiere)
    return correspondRecherche && correspondMatiere
  })

  const gererEnvoiNotification = () => {
    if (!titre.trim() || !message.trim() || !destinataireType) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    let nouvelleNotification: Notification

    switch (destinataireType) {
      case "eleve":
        if (!destinataireSpecifique) {
          alert("Veuillez sélectionner un élève")
          return
        }
        nouvelleNotification = serviceNotifications.envoyerNotificationEleve(
          destinataireSpecifique,
          titre,
          message,
          priorite,
        )
        break
      case "tous_eleves":
        nouvelleNotification = serviceNotifications.envoyerNotificationTousEleves(titre, message, priorite)
        break
      case "classe":
        if (!classeSelectionnee) {
          alert("Veuillez sélectionner une classe")
          return
        }
        nouvelleNotification = serviceNotifications.envoyerNotificationClasse(
          classeSelectionnee,
          titre,
          message,
          priorite,
        )
        break
      case "enseignant":
        if (!destinataireSpecifique) {
          alert("Veuillez sélectionner un enseignant")
          return
        }
        nouvelleNotification = serviceNotifications.envoyerNotificationEnseignant(
          destinataireSpecifique,
          titre,
          message,
          priorite,
        )
        break
      case "tous_enseignants":
        nouvelleNotification = serviceNotifications.envoyerNotificationTousEnseignants(titre, message, priorite)
        break
      default:
        alert("Type de destinataire invalide")
        return
    }

    // Réinitialiser le formulaire
    setTitre("")
    setMessage("")
    setDestinataireType("")
    setDestinataireSpecifique("")
    setClasseSelectionnee("")
    setPriorite("normale")

    // Recharger les notifications
    setNotifications(serviceNotifications.obtenirToutesNotifications())
    alert("Notification envoyée avec succès !")
  }

  const supprimerNotification = (notificationId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette notification ?")) {
      serviceNotifications.supprimerNotification(notificationId)
      setNotifications(serviceNotifications.obtenirToutesNotifications())
    }
  }

  const obtenirBadgePriorite = (priorite: string) => {
    switch (priorite) {
      case "urgente":
        return <Badge variant="destructive">Urgente</Badge>
      case "importante":
        return <Badge variant="secondary">Importante</Badge>
      default:
        return <Badge variant="outline">Normale</Badge>
    }
  }

  const obtenirIconeDestinataire = (type: string) => {
    switch (type) {
      case "eleve":
      case "tous_eleves":
        return <GraduationCap className="h-4 w-4" />
      case "enseignant":
      case "tous_enseignants":
        return <User className="h-4 w-4" />
      case "classe":
        return <Users className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const statistiques = serviceNotifications.obtenirStatistiquesNotifications()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* En-tête */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                Gestion des Notifications
              </h1>
              <p className="text-gray-600">Envoyez des notifications aux élèves et enseignants</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/tableau-bord">Retour au tableau de bord</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Statistiques rapides */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{statistiques.total}</div>
                  <div className="text-sm text-gray-600">Total notifications</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{statistiques.envoyees}</div>
                  <div className="text-sm text-gray-600">Envoyées</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{statistiques.brouillons}</div>
                  <div className="text-sm text-gray-600">Brouillons</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{statistiques.tauxEnvoi}%</div>
                  <div className="text-sm text-gray-600">Taux d'envoi</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="nouvelle" className="space-y-6">
          <TabsList>
            <TabsTrigger value="nouvelle">Nouvelle notification</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="nouvelle">
            <Card>
              <CardHeader>
                <CardTitle>Créer une nouvelle notification</CardTitle>
                <CardDescription>Envoyez une notification aux élèves ou enseignants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Composant de recherche et filtres */}
                <NotificationSearchFilters
                  eleves={eleves}
                  enseignants={enseignants}
                  classes={classes}
                  onEleveSearchChange={setRechercheEleve}
                  onEnseignantSearchChange={setRechercheEnseignant}
                  onMatiereFilterChange={setFiltreMatiere}
                  onClasseFilterChange={setFiltreClasseEleve}
                  filtreClasseEleve={filtreClasseEleve}
                  filtreMatiere={filtreMatiere}
                  rechercheEleve={rechercheEleve}
                  rechercheEnseignant={rechercheEnseignant}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titre">Titre de la notification *</Label>
                    <Input
                      id="titre"
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      placeholder="Ex: Réunion parents-professeurs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priorite">Priorité</Label>
                    <Select value={priorite} onValueChange={(value: any) => setPriorite(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="importante">Importante</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Rédigez votre message ici..."
                    rows={4}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinataire-type">Type de destinataire *</Label>
                    <Select value={destinataireType} onValueChange={setDestinataireType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eleve">Élève spécifique</SelectItem>
                        <SelectItem value="tous_eleves">Tous les élèves</SelectItem>
                        <SelectItem value="classe">Une classe</SelectItem>
                        <SelectItem value="enseignant">Enseignant spécifique</SelectItem>
                        <SelectItem value="tous_enseignants">Tous les enseignants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {destinataireType === "eleve" && (
                    <div className="space-y-2">
                      <Label htmlFor="eleve">Sélectionner l'élève</Label>
                      <Select value={destinataireSpecifique} onValueChange={setDestinataireSpecifique}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un élève" />
                        </SelectTrigger>
                        <SelectContent>
                          {elevesFiltres.map((eleve) => (
                            <SelectItem key={eleve.id} value={eleve.id}>
                              {eleve.prenom} {eleve.nom} - {eleve.classe}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {destinataireType === "enseignant" && (
                    <div className="space-y-2">
                      <Label htmlFor="enseignant">Sélectionner l'enseignant</Label>
                      <Select value={destinataireSpecifique} onValueChange={setDestinataireSpecifique}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un enseignant" />
                        </SelectTrigger>
                        <SelectContent>
                          {enseignantsFiltres.map((enseignant) => (
                            <SelectItem key={enseignant.id} value={enseignant.id}>
                              {enseignant.prenom} {enseignant.nom} - {enseignant.matieres.join(", ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {destinataireType === "classe" && (
                    <div className="space-y-2">
                      <Label htmlFor="classe">Sélectionner la classe</Label>
                      <Select value={classeSelectionnee} onValueChange={setClasseSelectionnee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((classe) => (
                            <SelectItem key={classe.id} value={classe.id}>
                              {classe.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button onClick={gererEnvoiNotification} className="w-full">
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer la notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <Card>
              <CardHeader>
                <CardTitle>Historique des notifications</CardTitle>
                <CardDescription>Liste de toutes les notifications envoyées</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune notification envoyée pour le moment</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {obtenirIconeDestinataire(notification.destinataireType)}
                              <h3 className="font-semibold">{notification.titre}</h3>
                              {obtenirBadgePriorite(notification.priorite)}
                            </div>
                            <p className="text-gray-600 mb-2">{notification.message}</p>
                            <div className="text-sm text-gray-500">
                              <p>Envoyé le : {new Date(notification.dateCreation).toLocaleString("fr-FR")}</p>
                              <p>Destinataire : {notification.destinataireType.replace("_", " ")}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => supprimerNotification(notification.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
