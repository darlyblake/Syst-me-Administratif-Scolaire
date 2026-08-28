/**
 * Page de connexion
 * Interface d'authentification pour accéder à l'application
 */

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogIn, School, AlertCircle } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"

export default function PageConnexion() {
  const [nomUtilisateur, setNomUtilisateur] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState("")
  const [estEnCoursDeConnexion, setEstEnCoursDeConnexion] = useState(false)

  const { connecter } = useAuthentification()
  const router = useRouter()

  const gererSoumissionFormulaire = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur("")
    setEstEnCoursDeConnexion(true)

    try {
      const resultat = await connecter(nomUtilisateur, motDePasse)

      if (resultat.succes) {
        router.push("/tableau-bord")
      } else {
        setErreur(resultat.erreur || "Erreur de connexion")
      }
    } catch (error) {
      setErreur("Une erreur inattendue s'est produite")
    } finally {
      setEstEnCoursDeConnexion(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* En-tête avec logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Système de Gestion Scolaire</h1>
          <p className="text-gray-600 mt-2">Connectez-vous pour accéder à l'administration</p>
        </div>

        {/* Formulaire de connexion */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Connexion
            </CardTitle>
            <CardDescription>Saisissez vos identifiants pour accéder au système</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={gererSoumissionFormulaire} className="space-y-4">
              {/* Champ nom d'utilisateur */}
              <div className="space-y-2">
                <Label htmlFor="nomUtilisateur">Nom d'utilisateur</Label>
                <Input
                  id="nomUtilisateur"
                  type="text"
                  value={nomUtilisateur}
                  onChange={(e) => setNomUtilisateur(e.target.value)}
                  placeholder="Saisissez votre nom d'utilisateur"
                  required
                  disabled={estEnCoursDeConnexion}
                />
              </div>

              {/* Champ mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <Input
                  id="motDePasse"
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Saisissez votre mot de passe"
                  required
                  disabled={estEnCoursDeConnexion}
                />
              </div>

              {/* Affichage des erreurs */}
              {erreur && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{erreur}</AlertDescription>
                </Alert>
              )}

              {/* Bouton de connexion */}
              <Button type="submit" className="w-full" disabled={estEnCoursDeConnexion}>
                {estEnCoursDeConnexion ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>

            {/* Informations de test */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Identifiants de test :</h4>
              <div className="text-sm text-blue-700">
                <p>
                  <strong>Utilisateur :</strong> freid
                </p>
                <p>
                  <strong>Mot de passe :</strong> 123456
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pied de page */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 Système de Gestion Scolaire</p>
          <p>Développé pour l'administration scolaire</p>
        </div>
      </div>
    </div>
  )
}
