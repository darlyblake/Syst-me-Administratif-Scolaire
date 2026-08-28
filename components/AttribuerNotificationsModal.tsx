"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, AffectationNotification } from "@/types/models"
import { Bell, Plus, CheckCircle, AlertTriangle, Info, Calendar, Users } from "lucide-react"

interface AttribuerNotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function AttribuerNotificationsModal({ isOpen, onClose, enseignant, onSuccess }: AttribuerNotificationsModalProps) {
  const [notifications, setNotifications] = useState<AffectationNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nouvelleNotification, setNouvelleNotification] = useState({
    notificationId: "",
    statut: "active" as AffectationNotification["statut"],
    priorite: "normale" as AffectationNotification["priorite"]
  })

  useEffect(() => {
    if (enseignant && isOpen) {
      chargerNotifications()
    }
  }, [enseignant, isOpen])

  const chargerNotifications = () => {
    if (!enseignant) return

    setLoading(true)
    try {
      const notificationsData = serviceEnseignants.obtenirNotificationsEnseignant(enseignant.id)
      setNotifications(notificationsData)
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAttribuerNotification = async () => {
    if (!enseignant || !nouvelleNotification.notificationId.trim()) return

    setLoading(true)
    try {
      const notification = await serviceEnseignants.attribuerNotification({
        enseignantId: enseignant.id,
        notificationId: nouvelleNotification.notificationId.trim(),
        statut: nouvelleNotification.statut,
        priorite: nouvelleNotification.priorite
      })

      setNotifications(prev => [...prev, notification])
      setShowCreateForm(false)
      setNouvelleNotification({
        notificationId: "",
        statut: "active",
        priorite: "normale"
      })
      onSuccess?.()
    } catch (error) {
      console.error("Erreur lors de l'attribution de la notification:", error)
    } finally {
      setLoading(false)
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

  // Notifications de test (à remplacer par un service de notifications réel)
  const notificationsDisponibles = [
    { id: "notif-1", titre: "Réunion pédagogique", type: "reunion" },
    { id: "notif-2", titre: "Formation continue", type: "formation" },
    { id: "notif-3", titre: "Pointage mensuel", type: "rappel" },
    { id: "notif-4", titre: "Documents à fournir", type: "administratif" },
    { id: "notif-5", titre: "Évaluation des élèves", type: "pedagogique" }
  ]

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Attribuer des notifications
            <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bouton créer notification */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Notifications actives: {notifications.filter(n => n.statut === "active").length}
              </h3>
              <p className="text-sm text-gray-500">
                Attribuez des notifications à l'enseignant
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle notification
            </Button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Nouvelle notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notificationId">Sélectionner une notification</Label>
                  <Select
                    value={nouvelleNotification.notificationId}
                    onValueChange={(value) => setNouvelleNotification(prev => ({ ...prev, notificationId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une notification" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationsDisponibles.map((notif) => (
                        <SelectItem key={notif.id} value={notif.id}>
                          {notif.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priorite">Priorité</Label>
                    <Select
                      value={nouvelleNotification.priorite}
                      onValueChange={(value: AffectationNotification["priorite"]) =>
                        setNouvelleNotification(prev => ({ ...prev, priorite: value }))
                      }
                    >
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
                  <div>
                    <Label htmlFor="statut">Statut initial</Label>
                    <Select
                      value={nouvelleNotification.statut}
                      onValueChange={(value: AffectationNotification["statut"]) =>
                        setNouvelleNotification(prev => ({ ...prev, statut: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAttribuerNotification} disabled={loading || !nouvelleNotification.notificationId}>
                    {loading ? "Attribution en cours..." : "Attribuer"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notifications attribuées</CardTitle>
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
                          <Checkbox
                            id={`active-${notification.id}`}
                            checked={notification.statut === "active"}
                            onCheckedChange={(checked) =>
                              handleToggleStatut(notification.id, checked ? "active" : "inactive")
                            }
                          />
                          <Label htmlFor={`active-${notification.id}`} className="text-sm">
                            Active
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
