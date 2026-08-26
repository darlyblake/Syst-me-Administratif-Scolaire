"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuthentification } from "@/providers/authentification.provider"
import type { Role } from "@/types/models"

export default function LoginPage() {
  const router = useRouter()
  const { connecter, estEnCoursDeChargement } = useAuthentification()
  
  const [adminCredentials, setAdminCredentials] = useState({ nomUtilisateur: "", motDePasse: "" })
  const [ecoleCredentials, setEcoleCredentials] = useState({ identifiant: "", motDePasse: "" })
  const [parentCredentials, setParentCredentials] = useState({ identifiant: "", motDePasse: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await connecter(adminCredentials.nomUtilisateur, adminCredentials.motDePasse)
    
    if (result.succes) {
      router.replace("/admin/dashboard")
    } else {
      setError(result.erreur || "Erreur de connexion")
    }
    
    setLoading(false)
  }

  const handleEcoleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Pour l'instant, utiliser le même service d'auth
    const result = await connecter(ecoleCredentials.identifiant, ecoleCredentials.motDePasse)
    
    if (result.succes) {
      router.replace("/ecole/tableau-bord")
    } else {
      setError(result.erreur || "Erreur de connexion")
    }
    
    setLoading(false)
  }

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Pour l'instant, utiliser le même service d'auth
    const result = await connecter(parentCredentials.identifiant, parentCredentials.motDePasse)
    
    if (result.succes) {
      router.replace("/parents/tableau-bord")
    } else {
      setError(result.erreur || "Erreur de connexion")
    }
    
    setLoading(false)
  }

  if (estEnCoursDeChargement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Système de Gestion Scolaire</CardTitle>
          <CardDescription>Connectez-vous selon votre rôle</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="ecole">École</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Nom d'utilisateur</Label>
                  <Input
                    id="admin-username"
                    type="text"
                    placeholder="freid"
                    value={adminCredentials.nomUtilisateur}
                    onChange={(e) => setAdminCredentials({ ...adminCredentials, nomUtilisateur: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Mot de passe</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••"
                    value={adminCredentials.motDePasse}
                    onChange={(e) => setAdminCredentials({ ...adminCredentials, motDePasse: e.target.value })}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setError("")
                      setLoading(true)
                      const result = await connecter("freid", "123456")
                      if (result.succes) {
                        // Forcer le rechargement de la page pour que le provider détecte la session
                        window.location.href = "/admin/dashboard"
                      } else {
                        setError(result.erreur || "Erreur de connexion")
                      }
                      setLoading(false)
                    }}
                  >
                    Test 1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setError("")
                      setLoading(true)
                      const result = await connecter("admin_test", "admin123")
                      if (result.succes) {
                        window.location.href = "/admin/dashboard"
                      } else {
                        setError(result.erreur || "Erreur de connexion")
                      }
                      setLoading(false)
                    }}
                  >
                    Test 2
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="ecole" className="space-y-4 mt-4">
              <form onSubmit={handleEcoleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ecole-username">Identifiant</Label>
                  <Input
                    id="ecole-username"
                    type="text"
                    placeholder="Votre identifiant"
                    value={ecoleCredentials.identifiant}
                    onChange={(e) => setEcoleCredentials({ ...ecoleCredentials, identifiant: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecole-password">Mot de passe</Label>
                  <Input
                    id="ecole-password"
                    type="password"
                    placeholder="••••••"
                    value={ecoleCredentials.motDePasse}
                    onChange={(e) => setEcoleCredentials({ ...ecoleCredentials, motDePasse: e.target.value })}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setError("")
                      setLoading(true)
                      const result = await connecter("ecole_test", "ecole123")
                      if (result.succes) {
                        window.location.href = "/ecole/tableau-bord"
                      } else {
                        setError(result.erreur || "Erreur de connexion")
                      }
                      setLoading(false)
                    }}
                  >
                    Test
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="parent" className="space-y-4 mt-4">
              <form onSubmit={handleParentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parent-username">Identifiant parent</Label>
                  <Input
                    id="parent-username"
                    type="text"
                    placeholder="Votre identifiant"
                    value={parentCredentials.identifiant}
                    onChange={(e) => setParentCredentials({ ...parentCredentials, identifiant: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent-password">Mot de passe</Label>
                  <Input
                    id="parent-password"
                    type="password"
                    placeholder="••••••"
                    value={parentCredentials.motDePasse}
                    onChange={(e) => setParentCredentials({ ...parentCredentials, motDePasse: e.target.value })}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setError("")
                      setLoading(true)
                      const result = await connecter("parent_test", "parent123")
                      if (result.succes) {
                        window.location.href = "/parents/tableau-bord"
                      } else {
                        setError(result.erreur || "Erreur de connexion")
                      }
                      setLoading(false)
                    }}
                  >
                    Test
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
