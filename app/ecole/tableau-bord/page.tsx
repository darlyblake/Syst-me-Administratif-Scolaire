"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  UserPlus,
  Users,
  Settings,
  BookOpen,
  CreditCard,
  FileText,
  LogOut,
  GraduationCap,
  Clock,
  Bell,
  Calendar,
  UserCheck,
  Calculator,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Box,
} from "lucide-react"
import Link from "next/link"
import type { StatistiquesTableauBord } from "@/types/models"
import { serviceStatistiques } from "@/services/statistiques.service"
import { serviceAbsences } from "@/services/absences.service"
import { serviceNotifications } from "@/services/notifications.service"
import { serviceEvenements } from "@/services/evenements.service"
import { serviceParametres } from "@/services/parametres-fixed.service"
import { useAuthentification } from "@/providers/authentification.provider"

export default function PageTableauBord() {
  const [statistiques, setStatistiques] = useState<StatistiquesTableauBord>({
    totalEleves: 0,
    totalEnseignants: 0,
    totalRecettes: 0,
    classesActives: 0,
    elevesImpayes: 0,
    enseignantsPresents: 0,
    tauxPresenceEnseignants: 0,
  })
  const [absencesDuJour, setAbsencesDuJour] = useState(0)
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [evenementsPlanifies, setEvenementsPlanifies] = useState(0)
  const [anneeAcademique, setAnneeAcademique] = useState("")

  const { utilisateur, deconnecter } = useAuthentification()

  useEffect(() => {
    // Statistiques principales
    const nouvellesStatistiques = serviceStatistiques.calculerStatistiquesTableauBord()
    setStatistiques(nouvellesStatistiques)

    // Absences du jour (données réelles)
    const aujourdhui = new Date().toISOString().split("T")[0]
    const absencesAujourdhui = serviceAbsences.obtenirAbsencesParDate(aujourdhui)
    setAbsencesDuJour(absencesAujourdhui.length)

    // Notifications (données réelles)
    const statsNotifs = serviceNotifications.obtenirStatistiquesNotifications()
    setTotalNotifications(statsNotifs.total)

    // Événements planifiés (données réelles)
    const evtPlanifies = serviceEvenements.obtenirEvenementsParStatut("planifie")
    setEvenementsPlanifies(evtPlanifies.length)

    // Année académique depuis les paramètres
    const parametres = serviceParametres.obtenirParametres()
    setAnneeAcademique(parametres.anneeAcademique)
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="bg-white shadow-sm border-b rounded-xl mb-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Système Administratif Scolaire</h1>
            <p className="text-gray-600">Gestion complète de l'établissement scolaire</p>
            {utilisateur && (
              <p className="text-sm text-blue-600 mt-1">
                Connecté en tant que : <strong>{utilisateur.nomUtilisateur}</strong> ({utilisateur.role})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/ecole/communication/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </Button>
            <Button variant="outline" onClick={deconnecter}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Widgets rapides (données réelles) */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{absencesDuJour}</div>
                <div className="text-sm text-gray-600">Absences du jour</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalNotifications}</div>
                <div className="text-sm text-gray-600">Notifications</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{evenementsPlanifies}</div>
                <div className="text-sm text-gray-600">Événements à venir</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.elevesImpayes}</div>
                <div className="text-sm text-gray-600">Élèves impayés</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques principales */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.totalEleves}</div>
                <div className="text-sm text-gray-600">Élèves</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.totalEnseignants}</div>
                <div className="text-sm text-gray-600">Enseignants</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.enseignantsPresents}</div>
                <div className="text-sm text-gray-600">Présents</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.tauxPresenceEnseignants}%</div>
                <div className="text-sm text-gray-600">Présence</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{statistiques.classesActives}</div>
                <div className="text-sm text-gray-600">Classes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-bold">{statistiques.totalRecettes.toLocaleString()}</div>
                <div className="text-sm text-gray-600">FCFA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules — Ligne 1 */}
      <div className="grid lg:grid-cols-4 gap-6 mb-6">
        {/* Module Inscriptions */}
        <Card className="w-full cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/ecole/inscriptions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Inscriptions
              </CardTitle>
              <CardDescription>Gestion des inscriptions</CardDescription>
            </CardHeader>
          </Link>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/inscriptions/nouvelle">
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvelle inscription
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/inscriptions/reinscription">
                <Clock className="mr-2 h-4 w-4" />
                Réinscription
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/inscriptions/transfert">
                <FileText className="mr-2 h-4 w-4" />
                Transfert d'élève
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/inscriptions/statistiques">
                <BookOpen className="mr-2 h-4 w-4" />
                Statistiques
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Élèves & Enseignants */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Élèves & Enseignants
            </CardTitle>
            <CardDescription>Gestion des personnes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/students">
                <Users className="mr-2 h-4 w-4" />
                Gérer les élèves
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/enseignants">
                <GraduationCap className="mr-2 h-4 w-4" />
                Gérer les enseignants
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/options">
                <Settings className="mr-2 h-4 w-4" />
                Options scolaires
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/archivage">
                <Box className="mr-2 h-4 w-4" />
                Archivage
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Pédagogie */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Pédagogie
            </CardTitle>
            <CardDescription>Classes, matières et emplois du temps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/classes">
                <Users className="mr-2 h-4 w-4" />
                Gestion des classes
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/matieres">
                <BookOpen className="mr-2 h-4 w-4" />
                Matières
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/emploi-du-temps-classes">
                <Calendar className="mr-2 h-4 w-4" />
                Emploi du temps classes
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/evaluation">
                <TrendingUp className="mr-2 h-4 w-4" />
                Évaluations
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Notes & Bulletins */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Notes & Bulletins
            </CardTitle>
            <CardDescription>Suivi académique</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/notes/saisie">
                <Calculator className="mr-2 h-4 w-4" />
                Saisir les notes
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/notes/bulletins">
                <FileText className="mr-2 h-4 w-4" />
                Bulletins
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/notes/statistiques">
                <BookOpen className="mr-2 h-4 w-4" />
                Statistiques
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modules — Ligne 2 */}
      <div className="grid lg:grid-cols-4 gap-6 mb-6">
        {/* Module Personnel */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Personnel
            </CardTitle>
            <CardDescription>Gestion administrative du personnel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/personnel">
                <Users className="mr-2 h-4 w-4" />
                Gestion du personnel
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/etat-salaire">
                <DollarSign className="mr-2 h-4 w-4" />
                États de salaire
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/heures-vacataires">
                <Clock className="mr-2 h-4 w-4" />
                Heures vacataires
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Comptabilité */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Comptabilité
            </CardTitle>
            <CardDescription>Gestion financière</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/comptabilite">
                <DollarSign className="mr-2 h-4 w-4" />
                Comptabilité professionnelle
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/payments">
                <CreditCard className="mr-2 h-4 w-4" />
                Suivi des paiements
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Présences */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Présences
            </CardTitle>
            <CardDescription>Pointage et absences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/absences/pointage">
                <Clock className="mr-2 h-4 w-4" />
                Pointage quotidien
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/absences/liste">
                <Calendar className="mr-2 h-4 w-4" />
                Liste des présences
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/registre-appel">
                <UserCheck className="mr-2 h-4 w-4" />
                Registre d'appel
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/absences/statistiques">
                <BookOpen className="mr-2 h-4 w-4" />
                Statistiques
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Communication */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication
            </CardTitle>
            <CardDescription>Contact avec les parents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/communication/messagerie">
                <MessageSquare className="mr-2 h-4 w-4" />
                Messagerie
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/communication/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/communication/convocations">
                <Calendar className="mr-2 h-4 w-4" />
                Convocations
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/communication/rendez-vous">
                <Clock className="mr-2 h-4 w-4" />
                Rendez-vous
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ligne 3 — Système & Infos */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Module Événements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Événements
            </CardTitle>
            <CardDescription>Calendrier et activités</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/evenements">
                <Bell className="mr-2 h-4 w-4" />
                Calendrier des événements
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Module Système */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Système
            </CardTitle>
            <CardDescription>Paramètres et configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" asChild>
              <Link href="/ecole/settings">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
              <Link href="/ecole/documents">
                <FileText className="mr-2 h-4 w-4" />
                Génération de documents
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Informations rapides — Année académique depuis les paramètres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Année académique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {anneeAcademique || "—"}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {anneeAcademique
                  ? `Septembre ${anneeAcademique.split("-")[0]} — Juillet ${anneeAcademique.split("-")[1]}`
                  : "Non configurée"}
              </div>
              <Button variant="link" size="sm" asChild className="mt-2">
                <Link href="/ecole/settings">Modifier</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
