"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Bell, Send, Calendar, Users, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useNotifications } from "@/hooks/useNotifications"
import { getUnreadNotificationCount, listNotificationsPaginated, markNotificationRead, type NotificationRecord } from "@/lib/supabase/services/notifications.service"

export default function Notifications() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: supabaseStudents, isLoading: isStudentsLoading, error: studentsError } = useStudents(establishmentId)
  const { info, error: showError } = useNotifications()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = useCallback(async () => {
    if (!establishmentId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      setIsHistoryLoading(true)
      setHistoryError(null)
      const [pageResult, countResult] = await Promise.all([
        listNotificationsPaginated(establishmentId, 1, 25, false),
        getUnreadNotificationCount(establishmentId),
      ])
      setNotifications(pageResult.items)
      setUnreadCount(countResult)
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Impossible de charger les notifications.")
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId)
      await loadNotifications()
    } catch (error) {
      showError(error instanceof Error ? error.message : "Impossible de marquer la notification comme lue.")
    }
  }

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
  const [selectedStudentId, setSelectedStudentId] = useState("")
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

  const allStudents = mappedSupabaseStudents

  const isFormValid = Boolean(
    establishmentId &&
    type &&
    destinataire &&
    titre.trim() &&
    message.trim() &&
    (destinataire !== "classe" || classeCible) &&
    (destinataire !== "individuel" || selectedStudentId)
  )

  const handleSend = () => {
    if (!establishmentId) {
      showError("Aucun établissement actif sélectionné pour cet envoi.")
      return
    }

    if (!isFormValid) {
      showError("Complétez tous les champs requis avant d'envoyer une notification.")
      return
    }

    info("Envoi de notification non activé", {
      description: "Le service backend de messagerie doit être raccordé à l’établissement sélectionné avant de diffuser des notifications réelles.",
      duration: 5000,
    })
  }

  const statistics = {
    total: notifications.length,
    unread: unreadCount,
    read: notifications.filter((notification) => notification.is_read).length,
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
              <Select value={destinataire} onValueChange={(value) => {
                setDestinataire(value)
                if (value !== "individuel") setSelectedStudentId("")
              }}>
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
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger id="eleve">
                    <SelectValue placeholder="Sélectionner l'élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.prenom} {student.nom} ({student.classe || "—"})
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
                        : destinataire === "individuel" && selectedStudentId ? "1 parent" : "0 parent"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {studentsError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {studentsError}
              </div>
            )}

            {!establishmentId && !isStudentsLoading && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Sélectionnez un établissement pour configurer les notifications.
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button onClick={handleSend} className="flex-1" disabled={!isFormValid || isStudentsLoading}>
                <Send className="mr-2 h-4 w-4" />
                {envoyerImmédiatement ? "Envoyer Maintenant" : "Programmer l'Envoi"}
              </Button>
              <Button variant="outline" onClick={() => {
                setType("")
                setDestinataire("")
                setClasseCible("")
                setSelectedStudentId("")
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
            <CardTitle>Notifications de l’établissement</CardTitle>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Aucune notification non lue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!establishmentId ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                Aucun établissement sélectionné.
              </div>
            ) : isHistoryLoading ? (
              <div className="space-y-3">
                <div className="h-12 animate-pulse rounded-md bg-slate-200" />
                <div className="h-12 animate-pulse rounded-md bg-slate-200" />
                <div className="h-12 animate-pulse rounded-md bg-slate-200" />
              </div>
            ) : historyError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {historyError}
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                Aucune notification reçue pour cet établissement pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="pb-3 pr-4 font-medium">Titre</th>
                      <th className="pb-3 pr-4 font-medium">Message</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Statut</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="border-b align-top text-slate-700">
                        <td className="py-3 pr-4 font-medium">{notification.title ?? notification.subject ?? "Notification"}</td>
                        <td className="py-3 pr-4">{notification.message ?? notification.content ?? notification.body ?? "—"}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {notification.created_at ? new Date(notification.created_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }) : "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {notification.is_read ? "Lue" : "Non lue"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {!notification.is_read && (
                            <Button variant="outline" size="sm" onClick={() => void handleMarkAsRead(notification.id)}>
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Marquer comme lue
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
