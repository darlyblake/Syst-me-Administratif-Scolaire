"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, Bell, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"

export default function ParentsTableauBord() {
  const { utilisateur, deconnecter } = useAuthentification()

  const gererDeconnexion = () => {
    deconnecter()
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Parents</h1>
            <p className="text-gray-600">
              Bienvenue, {utilisateur?.nomUtilisateur}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gererDeconnexion}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mes Enfants
              </CardTitle>
              <CardDescription>Gérer les profils de vos enfants</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/parents/enfants">Voir mes enfants</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes et Bulletins
              </CardTitle>
              <CardDescription>Suivi scolaire</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/parents/notes">Voir les notes</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Messages de l'école</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/parents/notifications">Voir les notifications</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                L'interface parents est en cours de développement. Vous pourrez bientôt :
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
                <li>Consulter les notes et bulletins de vos enfants</li>
                <li>Suivre les absences et retards</li>
                <li>Voir l'historique des paiements</li>
                <li>Recevoir des notifications de l'école</li>
                <li>Communiquer avec l'administration</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
