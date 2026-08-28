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
  onDelete?: (id: string) => void
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

  const statusLabel: Record<string, string> = { actif: "Actif", inactif: "Inactif", conge: "En congé", suspendu: "Suspendu" }
  const statusClass: Record<string, string> = {
    actif: "bg-green-100 text-green-800",
    inactif: "bg-red-100 text-red-800",
    conge: "bg-blue-100 text-blue-800",
    suspendu: "bg-orange-100 text-orange-800",
  }
  const statusIndicator: Record<string, string> = { actif: "bg-green-500", inactif: "bg-gray-500", conge: "bg-blue-500", suspendu: "bg-orange-500" }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non renseignée"
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "Date invalide"
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-4">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="relative shrink-0">
              <Avatar className="w-14 h-14 md:w-20 md:h-20">
                <AvatarFallback className="text-base md:text-lg font-semibold bg-muted">{teacher.prenom?.[0]}{teacher.nom?.[0]}</AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-background ${statusIndicator[teacher.statut] ?? "bg-gray-500"}`} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl md:text-2xl font-bold truncate">{teacher.prenom} {teacher.nom}</DialogTitle>
              <p className="text-sm text-muted-foreground truncate">{teacher.matieres.join(", ") || "Aucune matière assignée"}</p>
              <Badge className={`${statusClass[teacher.statut] ?? ""} mt-1`}>{statusLabel[teacher.statut] ?? teacher.statut}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full overflow-x-auto justify-start md:grid md:grid-cols-4">
            <TabsTrigger value="details" className="shrink-0">Détails</TabsTrigger>
            <TabsTrigger value="actions" className="shrink-0">Actions</TabsTrigger>
            <TabsTrigger value="schedule" className="shrink-0">Emploi du temps</TabsTrigger>
            <TabsTrigger value="history" className="shrink-0">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5" />Informations professionnelles</h3>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium text-muted-foreground">Identifiant</label><p className="font-mono">{teacher.identifiant}</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">Date d'embauche</label><p>{formatDate(teacher.dateEmbauche)}</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">Type de contrat</label><p className="capitalize">{teacher.typeContrat || "Non spécifié"}</p></div>
                  <div><label className="text-sm font-medium text-muted-foreground">Matières enseignées</label><div className="flex flex-wrap gap-1 mt-1">{teacher.matieres.map((matiere, index) => <Badge key={`${matiere}-${index}`} variant="outline">{matiere}</Badge>)}</div></div>
                  <div><label className="text-sm font-medium text-muted-foreground">Classes assignées</label><div className="flex flex-wrap gap-1 mt-1">{teacher.classes.length ? teacher.classes.map((classe, index) => <Badge key={`${classe}-${index}`} variant="secondary">{classe}</Badge>) : <span className="text-muted-foreground">Aucune classe assignée</span>}</div></div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" />Coordonnées</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><div><label className="text-sm font-medium text-muted-foreground">Email</label><p>{teacher.email || "Non renseigné"}</p></div></div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><div><label className="text-sm font-medium text-muted-foreground">Téléphone</label><p>{teacher.telephone || "Non renseigné"}</p></div></div>
                  {teacher.adresse && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-1" /><div><label className="text-sm font-medium text-muted-foreground">Adresse</label><p>{teacher.adresse}</p></div></div>}
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><div><label className="text-sm font-medium text-muted-foreground">Date de naissance</label><p>{formatDate(teacher.dateNaissance)}</p></div></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-5">
            <h3 className="text-lg font-semibold mb-4">Actions administratives</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {actions?.onAssignClasses && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onAssignClasses}><BookOpen className="h-5 w-5" /><span className="text-center text-sm">Assigner des classes</span></Button>}
              <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/emploi-du-temps`}><Calendar className="h-5 w-5" /><span className="text-center text-sm">Emploi du temps</span></Link></Button>
              {actions?.onContactTeacher && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onContactTeacher}><Mail className="h-5 w-5" /><span className="text-center text-sm">Contacter</span></Button>}
              {actions?.onViewHistory && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onViewHistory}><Clock className="h-5 w-5" /><span className="text-center text-sm">Historique</span></Button>}
              <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/pointage`}><Clock className="h-5 w-5" /><span className="text-center text-sm">Présence / pointage</span></Link></Button>
              {actions?.onManageDocuments && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onManageDocuments}><FileText className="h-5 w-5" /><span className="text-center text-sm">Documents</span></Button>}
              {actions?.onAssignNotifications && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onAssignNotifications}><Bell className="h-5 w-5" /><span className="text-center text-sm">Notifications</span></Button>}
              {actions?.onManageSalary && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onManageSalary}><DollarSign className="h-5 w-5" /><span className="text-center text-sm">Salaires</span></Button>}
              {actions?.onViewEvaluations && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" onClick={actions.onViewEvaluations}><Star className="h-5 w-5" /><span className="text-center text-sm">Évaluations</span></Button>}
              {actions?.onDelete && <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2 text-destructive border-destructive/30" onClick={() => actions.onDelete?.(teacher.id)}><UserX className="h-5 w-5" /><span className="text-center text-sm">Désactiver</span></Button>}
              <Button variant="outline" className="h-auto min-h-20 p-3 flex flex-col items-center gap-2" asChild><Link href={`/enseignants/${teacher.id}/modifier`}><Edit className="h-5 w-5" /><span className="text-center text-sm">Modifier</span></Link></Button>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-5"><div className="text-center py-10"><Calendar className="h-14 w-14 mx-auto mb-4 text-muted-foreground" /><h3 className="text-xl font-semibold mb-2">Emploi du temps</h3><p className="text-muted-foreground mb-5">Consultez l'emploi du temps de {teacher.prenom} {teacher.nom}.</p><Button asChild><Link href={`/enseignants/${teacher.id}/emploi-du-temps`}>Voir l'emploi du temps</Link></Button></div></TabsContent>
          <TabsContent value="history" className="mt-5"><div className="text-center py-10"><Clock className="h-14 w-14 mx-auto mb-4 text-muted-foreground" /><h3 className="text-xl font-semibold mb-2">Historique</h3><p className="text-muted-foreground mb-5">Historique des activités, modifications et affectations.</p><div className="text-sm text-muted-foreground">Fonctionnalité en cours de développement</div></div></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
