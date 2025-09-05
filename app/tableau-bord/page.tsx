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
} from "lucide-react"
import Link from "next/link"
import type { StatistiquesTableauBord } from "@/types/models"
import { serviceStatistiques } from "@/services/statistiques.service"
import { useAuthentification } from "@/providers/authentification.provider"

export default function PageTableauBord() {
  const [actionSelectionnee, setActionSelectionnee] = useState<string>("")
  const [statistiques, setStatistiques] = useState<StatistiquesTableauBord>({
    totalEleves: 0,
    totalEnseignants: 0,
    totalRecettes: 0,
    classesActives: 0,
    elevesImpayes: 0,
    enseignantsPresents: 0,
    tauxPresenceEnseignants: 0,
  })

  const { utilisateur, deconnecter } = useAuthentification()

  useEffect(() => {
    const nouvellesStatistiques = serviceStatistiques.calculerStatistiquesTableauBord()
    setStatistiques(nouvellesStatistiques)
  }, [])

  const gererDeconnexion = () => {
    deconnecter()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
                <Link href="/students">
                  <Users className="mr-2 h-4 w-4" />
                  Élèves
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/enseignants">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Enseignants
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </Button>
              <Button variant="outline" onClick={gererDeconnexion}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
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

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Gestion des inscriptions
              </CardTitle>
              <CardDescription>Ajouter de nouveaux élèves ou enseignants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" asChild>
                <Link href="/students">
                  <Users className="mr-2 h-4 w-4" />
                  Gérer les élèves
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/enseignants">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Gérer les enseignants
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Gestion des enseignants
              </CardTitle>
              <CardDescription>Emploi du temps et pointage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/enseignants">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Liste des enseignants
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/emploi-du-temps">
                  <Calendar className="mr-2 h-4 w-4" />
                  Emploi du temps
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/pointage-telephone">
                  <Clock className="mr-2 h-4 w-4" />
                  Pointage téléphone
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Envoyer notifications
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/students">
                  <Users className="mr-2 h-4 w-4" />
                  Consulter les élèves
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/payments">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Suivi des paiements
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/rapports">
                  <FileText className="mr-2 h-4 w-4" />
                  Rapports et statistiques
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres système
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Année académique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">2024-2025</div>
                <div className="text-sm text-gray-600">Septembre 2024 - Juillet 2025</div>
                <Button variant="link" size="sm" asChild>
                  <Link href="/settings">Modifier</Link>

                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accès rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-gray-600">
                • <strong>{statistiques.elevesImpayes}</strong> élèves avec paiements en attente
              </div>
              <div className="text-sm text-gray-600">
                •{" "}
                <strong>
                  {statistiques.enseignantsPresents}/{statistiques.totalEnseignants}
                </strong>{" "}
                enseignants présents aujourd'hui
              </div>
              <div className="text-sm text-gray-600">
                • <strong>{statistiques.classesActives}</strong> classes actives cette année
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
