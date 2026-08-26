"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bell, Users, Plus, CheckCircle, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, AffectationNotification } from "@/types/models"
import { AttribuerNotificationsModal } from "@/components/AttribuerNotificationsModal"

export default function NotificationsPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<AffectationNotification[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (enseignantId) {
      chargerDonnees()
    }
  }, [enseignantId])

  const chargerDonnees = () => {
    setLoading(true)
    try {
      const data = serviceEnseignants.obtenirEnseignantParIdentifiant(enseignantId)
      setEnseignant(data)

      // Charger les notifications de l'enseignant
      const notificationsData = serviceEnseignants.obtenirNotificationsEnseignant(enseignantId)
      setNotifications(notificationsData)
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "inactif": return "bg-red-100 text-red-800"
      case "conge": return "bg-blue-100 text-blue-800"
      case "suspendu": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPrioriteColor = (priorite: AffectationNotification["priorite"]) => {
    switch (priorite) {
      case "urgente": return "bg-red-100 text-red-800"
      case "importante": return "bg-orange-100 text-orange-800"
      case "normale": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatutColor = (statut: AffectationNotification["statut"]) => {
    switch (statut) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-gray-100 text-gray-800"
      case "traitee": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPrioriteIcon = (priorite: AffectationNotification["priorite"]) => {
    switch (priorite) {
      case "urgente": return <AlertTriangle className="h-4 w-4" />
      case "importante": return <Info className="h-4 w-4" />
      case "normale": return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const handleToggleStatut = (notificationId: string, nouveauStatut: AffectationNotification["statut"]) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, statut: nouveauStatut }
          : notif
      )
    )
  }

  // Notifications de test (à remplacer par un service de notifications réel)
  const notificationsDisponibles = [
    { id: "notif-1", titre: "Réunion pédagogique", type: "reunion" },
    { id: "notif-2", titre: "Formation continue", type: "formation" },
    { id: "notif-3", titre: "Pointage mensuel", type: "rappel" },
    { id: "notif-4", titre: "Documents à fournir", type: "administratif" },
    { id: "notif-5", titre: "Évaluation des élèves", type: "pedagogique" }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Enseignant non trouvé</h2>
          <p className="text-gray-600 mb-4">L'enseignant demandé n'existe pas ou a été supprimé.</p>
          <Button asChild>
            <Link href="/enseignants">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* En-tête */}
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/enseignants">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste des enseignants
            </Link>
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-lg font-semibold text-gray-600">
                {enseignant.prenom[0]}{enseignant.nom[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Notifications - {enseignant.prenom} {enseignant.nom}
              </h1>
              <p className="text-gray-600">
                Attribuez et gérez les notifications de l'enseignant
              </p>
            </div>
          </div>
        </div>

        {/* Informations de l'enseignant */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations de l'enseignant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informations personnelles</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Email:</span> {enseignant.email}</p>
                  <p><span className="text-gray-500">Statut:</span>
                    <Badge className={getStatusColor(enseignant.statut)}>
                      {enseignant.statut}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Affectations actuelles</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Matières:</span> {enseignant.matieres.join(", ") || "Aucune"}</p>
                  <p><span className="text-gray-500">Classes:</span> {enseignant.classes.length} classe(s)</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notifications</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Total notifications:</span> {notifications.length}</p>
                  <p><span className="text-gray-500">Notifications actives:</span>
                    {notifications.filter(n => n.statut === "active").length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions principales */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Gestion des notifications</h2>
            <p className="text-gray-600">
              {notifications.filter(n => n.statut === "active").length} notification(s) active(s) •
              {notifications.filter(n => n.statut === "traitee").length} traitée(s)
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle notification
          </Button>
        </div>

        {/* Statistiques des notifications */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.statut === "active").length}
              </div>
              <div className="text-sm text-gray-600">Actives</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {notifications.filter(n => n.priorite === "urgente").length}
              </div>
              <div className="text-sm text-gray-600">Urgentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {notifications.filter(n => n.statut === "traitee").length}
              </div>
              <div className="text-sm text-gray-600">Traitées</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications attribuées ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Aucune notification attribuée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getPrioriteIcon(notification.priorite)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Notification #{notification.notificationId}
                          </span>
                          <Badge className={getPrioriteColor(notification.priorite)}>
                            {notification.priorite}
                          </Badge>
                          <Badge className={getStatutColor(notification.statut)}>
                            {notification.statut}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Attribuée le {new Date(notification.dateAffectation).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`active-${notification.id}`}
                          checked={notification.statut === "active"}
                          onChange={(e) =>
                            handleToggleStatut(notification.id, e.target.checked ? "active" : "inactive")
                          }
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`active-${notification.id}`} className="text-sm">
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal d'attribution des notifications */}
        <AttribuerNotificationsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          enseignant={enseignant}
          onSuccess={() => {
            chargerDonnees() // Recharger les données
            setShowModal(false)
          }}
        />
      </div>
    </div>
  )
}
