"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  X,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  Clock,
  FileText,
  Bell,
  DollarSign,
  Star,
  UserX,
  Edit,
  MapPin,
  CalendarDays,
  Briefcase
} from "lucide-react"
import Link from "next/link"
import type { DonneesEnseignant } from "@/types/models"

interface TeacherActions {
  onDelete: (id: string) => void
  onAssignClasses?: () => void
  onContactTeacher?: () => void
  onViewHistory?: () => void
  onManageDocuments?: () => void
  onAssignNotifications?: () => void
  onManageSalary?: () => void
  onViewEvaluations?: () => void
}

interface TeacherDetailsModalProps {
  teacher: DonneesEnseignant | null
  isOpen: boolean
  onClose: () => void
  actions?: TeacherActions
}

export function TeacherDetailsModal({ teacher, isOpen, onClose, actions }: TeacherDetailsModalProps) {
  if (!teacher || !actions) return null

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "inactif": return "bg-red-100 text-red-800"
      case "conge": return "bg-blue-100 text-blue-800"
      case "suspendu": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIndicator = (statut: string) => {
    return statut === "actif" ? "bg-green-500" : "bg-red-500"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-lg font-semibold bg-gray-100">
                    {teacher.prenom[0]}{teacher.nom[0]}
                  </AvatarFallback>
                </Avatar>
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusIndicator(teacher.statut)}`}></span>
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900 text-left">
                  {teacher.prenom} {teacher.nom}
                </DialogTitle>
                <p className="text-gray-600">
                  {teacher.matieres.join(", ") || "Aucune matière assignée"}
                </p>
                <Badge className={`${getStatusColor(teacher.statut)} mt-1`}>
                  {teacher.statut}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="schedule">Emploi du temps</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6 space-y-6">
              {/* Informations personnelles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Informations professionnelles
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Identifiant</label>
                      <p className="text-gray-900 font-mono">{teacher.identifiant}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date d'embauche</label>
                      <p className="text-gray-900">{formatDate(teacher.dateEmbauche)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type de contrat</label>
                      <p className="text-gray-900 capitalize">{teacher.typeContrat || "Non spécifié"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Matières enseignées</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.matieres.map((matiere, index) => (
                          <Badge key={index} variant="outline">
                            {matiere}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Classes assignées</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teacher.classes.length > 0 ? (
                          teacher.classes.map((classe, index) => (
                            <Badge key={index} variant="secondary">
                              {classe}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500">Aucune classe assignée</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Coordonnées
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <label className="text-sm font-medium text-gray-500">Téléphone</label>
                        <p className="text-gray-900">{teacher.telephone}</p>
                      </div>
                    </div>
                    {teacher.adresse && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                        <div>
                          <label className="text-sm font-medium text-gray-500">Adresse</label>
                          <p className="text-gray-900">{teacher.adresse}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date de naissance</label>
                        <p className="text-gray-900">{formatDate(teacher.dateNaissance)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions administratives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
                  onClick={actions.onAssignClasses}
                >
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>Assigner des classes</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
                  asChild
                >
                  <Link href={`/enseignants/${teacher.id}/emploi-du-temps`}>
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span>Voir emploi du temps</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200"
                  onClick={actions.onContactTeacher}
                >
                  <Mail className="h-5 w-5 text-purple-600" />
                  <span>Contacter l'enseignant</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-yellow-50 hover:border-yellow-200"
                  onClick={actions.onViewHistory}
                >
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span>Historique des affectations</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-teal-50 hover:border-teal-200"
                  asChild
                >
                  <Link href={`/enseignants/${teacher.id}/pointage`}>
                    <Clock className="h-5 w-5 text-teal-600" />
                    <span>Voir présence / pointage</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-200"
                  onClick={actions.onManageDocuments}
                >
                  <FileText className="h-5 w-5 text-orange-600" />
                  <span>Documents administratifs</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
                  onClick={actions.onAssignNotifications}
                >
                  <Bell className="h-5 w-5 text-green-600" />
                  <span>Attribuer des notifications</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
                  onClick={actions.onManageSalary}
                >
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span>Gestion des salaires</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200"
                  onClick={actions.onViewEvaluations}
                >
                  <Star className="h-5 w-5 text-indigo-600" />
                  <span>Évaluations et notes</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) { // Note: confirm() est toujours là, mais la prop est corrigée.
                      actions.onDelete(teacher.id)
                    }
                  }}
                >
                  <UserX className="h-5 w-5" />
                  <span>Supprimer / désactiver</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-gray-50 hover:border-gray-200"
                  asChild
                >
                  <Link href={`/enseignants/${teacher.id}/modifier`}>
                    <Edit className="h-5 w-5 text-gray-600" />
                    <span>Modifier les informations</span>
                  </Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="mt-6">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Emploi du temps</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Consultez et gérez l'emploi du temps de {teacher.prenom} {teacher.nom}
                </p>
                <Button asChild size="lg">
                  <Link href={`/enseignants/${teacher.id}/emploi-du-temps`}>
                    Voir l'emploi du temps complet
                  </Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Historique</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Historique des activités, modifications et affectations de {teacher.prenom} {teacher.nom}
                </p>
                <div className="text-sm text-gray-500">
                  Fonctionnalité en cours de développement
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
