"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, CreditCard, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"

export default function AdminDashboard() {
  const { utilisateur, deconnecter } = useAuthentification()

  const gererDeconnexion = () => {
    deconnecter()
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration SaaS</h1>
            <p className="text-gray-600">
              Gestion des écoles et abonnements
            </p>
            {utilisateur && (
              <p className="text-sm text-blue-600 mt-1">
                Connecté en tant que : <strong>{utilisateur.nomUtilisateur}</strong> ({utilisateur.role})
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gererDeconnexion}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Écoles
              </CardTitle>
              <CardDescription>Gérer les écoles inscrites</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/admin/ecoles">Voir les écoles</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Utilisateurs
              </CardTitle>
              <CardDescription>Gérer les utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/admin/utilisateurs">Voir les utilisateurs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Abonnements
              </CardTitle>
              <CardDescription>Gérer les abonnements</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/admin/abonnements">Voir les abonnements</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres
              </CardTitle>
              <CardDescription>Configuration plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/admin/parametres">Paramètres</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques globales</CardTitle>
              <CardDescription>Vue d'ensemble de la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Écoles actives</span>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total utilisateurs</span>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revenus mensuels</span>
                  <span className="font-bold">0 FCFA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Nouvelles inscriptions</span>
                  <span className="font-bold">0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                L'interface administrateur SaaS est en cours de développement. Vous pourrez bientôt :
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-600 space-y-1">
                <li>Gérer les écoles inscrites sur la plateforme</li>
                <li>Créer et modifier les plans d'abonnement</li>
                <li>Facturer les écoles</li>
                <li>Gérer le support technique</li>
                <li>Accéder aux rapports globaux</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
