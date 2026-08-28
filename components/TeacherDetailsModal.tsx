"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BookOpen, Calendar, Mail, Phone, Clock, FileText, Bell, DollarSign, Star, UserX, Edit, MapPin, CalendarDays, Briefcase } from "lucide-react"
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
  if (!teacher) return null

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
    switch (statut) {
      case "actif": return "bg-green-500"
      case "conge": return "bg-blue-500"
      case "suspendu": return "bg-orange-500"
      default: return "bg-gray-500"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non renseignée"
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "Date invalide"
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-lg font-semibold bg-gray-100">{teacher.prenom[0]}{teacher.nom[0]}</AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusIndicator(teacher.statut)}`} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">{teacher.prenom} {teacher.nom}</DialogTitle>
              <p className="text-gray-600">{teacher.matieres.join(", ") || "Aucune matière assignée"}</p>
              <Badge className={`${getStatusColor(teacher.statut)} mt-1`}>{teacher.statut}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="schedule">Emploi du temps</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Briefcase className="h-5 w-5" />Informations professionnelles</h3>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium text-gray-500">Identifiant</label><p className="text-gray-900 font-mono">{teacher.identifiant}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Date d'embauche</label><p className="text-gray-900">{formatDate(teacher.dateEmbauche)}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Type de contrat</label><p className="text-gray-900 capitalize">{teacher.typeContrat || "Non spécifié"}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Matières enseignées</label><div className="flex flex-wrap gap-1 mt-1">{teacher.matieres.map((matiere, index) => <Badge key={`${matiere}-${index}`} variant="outline">{matiere}</Badge>)}</div></div>
                  <div><label className="text-sm font-medium text-gray-500">Classes assignées</label><div className="flex flex-wrap gap-1 mt-1">{teacher.classes.length ? teacher.classes.map((classe, index) => <Badge key={`${classe}-${index}`} variant="secondary">{classe}</Badge>) : <span className="text-gray-500">Aucune classe assignée</span>}</div></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><MapPin className="h-5 w-5" />Coordonnées</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><div><label className="text-sm font-medium text-gray-500">Email</label><p className="text-gray-900">{teacher.email || "Non renseigné"}</p></div></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /><div><label className="text-sm font-medium text-gray-500">Téléphone</label><p className="text-gray-900">{teacher.telephone || "Non renseigné"}</p></div></div>
                  {teacher.adresse && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-gray-400 mt-1" /><div><label className="text-sm font-medium text-gray-500">Adresse</label><p className="text-gray-900">{teacher.adresse}</p></div></div>}
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" /><div><label className="text-sm font-medium text-gray-500">Date de naissance</label><p className="text-gray-900">{formatDate(teacher.dateNaissance)}</p></div></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions administratives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {actions?.onAssignClasses && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onAssignClasses}><BookOpen className="h-5 w-5" /><span>Assigner des classes</span></Button>}
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/emploi-du-temps`}><Calendar className="h-5 w-5" /><span>Voir emploi du temps</span></Link></Button>
              {actions?.onContactTeacher && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onContactTeacher}><Mail className="h-5 w-5" /><span>Contacter l'enseignant</span></Button>}
              {actions?.onViewHistory && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onViewHistory}><Clock className="h-5 w-5" /><span>Historique des affectations</span></Button>}
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/pointage`}><Clock className="h-5 w-5" /><span>Voir présence / pointage</span></Link></Button>
              {actions?.onManageDocuments && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onManageDocuments}><FileText className="h-5 w-5" /><span>Documents administratifs</span></Button>}
              {actions?.onAssignNotifications && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onAssignNotifications}><Bell className="h-5 w-5" /><span>Attribuer des notifications</span></Button>}
              {actions?.onManageSalary && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onManageSalary}><DollarSign className="h-5 w-5" /><span>Gestion des salaires</span></Button>}
              {actions?.onViewEvaluations && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={actions.onViewEvaluations}><Star className="h-5 w-5" /><span>Évaluations et notes</span></Button>}
              {actions?.onDelete && <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 text-red-600 border-red-200" onClick={() => actions.onDelete(teacher.id)}><UserX className="h-5 w-5" /><span>Désactiver / supprimer</span></Button>}
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/modifier`}><Edit className="h-5 w-5" /><span>Modifier les informations</span></Link></Button>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6"><div className="text-center py-12"><Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" /><h3 className="text-xl font-semibold text-gray-900 mb-2">Emploi du temps</h3><p className="text-gray-600 mb-6">Consultez et gérez l'emploi du temps de {teacher.prenom} {teacher.nom}</p><Button asChild size="lg"><Link href={`/enseignants/${teacher.id}/emploi-du-temps`}>Voir l'emploi du temps complet</Link></Button></div></TabsContent>
          <TabsContent value="history" className="mt-6"><div className="text-center py-12"><Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" /><h3 className="text-xl font-semibold text-gray-900 mb-2">Historique</h3><p className="text-gray-600 mb-6">Historique des activités, modifications et affectations de {teacher.prenom} {teacher.nom}</p><div className="text-sm text-gray-500">Fonctionnalité en cours de développement</div></div></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
