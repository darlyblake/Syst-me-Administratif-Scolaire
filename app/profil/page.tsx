"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuthentification } from "@/providers/authentification.provider"
import { LogOut, Building2, Mail, User } from "lucide-react"

export default function ProfilPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement, deconnecter } = useAuthentification()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!estEnCoursDeChargement && !utilisateur) {
      router.replace("/login")
    }
  }, [utilisateur, estEnCoursDeChargement, router])

  const handleLogout = async () => {
    setLoading(true)
    await deconnecter()
    router.replace("/login")
  }

  if (estEnCoursDeChargement || !utilisateur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme">
        <p className="text-sm text-muted-foreground">Chargement du profil...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour
          </button>
          <h1 className="text-3xl font-semibold tracking-tight">Mon profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consultez vos informations d'authentification et votre contexte d'accès
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
              <p className="mt-1 text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {utilisateur.nomUtilisateur}
              </p>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Rôle</p>
              <div className="mt-2">
                <Badge>{utilisateur.role}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">ID Utilisateur</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground break-all">
                {utilisateur.id}
              </p>
            </div>
          </CardContent>
        </Card>

        {contexte && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Contexte d'accès
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Type de compte</p>
                <p className="mt-1 text-sm font-mono">{contexte.account_type}</p>
              </div>

              {contexte.establishments && contexte.establishments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Établissements</p>
                    <div className="mt-3 space-y-2">
                      {contexte.establishments.map((e) => (
                        <div key={e.id} className="p-3 rounded-lg border bg-white">
                          <p className="text-sm font-medium">{e.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">ID: {e.id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={() => router.push("/parametres")} variant="outline" className="flex-1">
            Paramètres
          </Button>
          <Button
            onClick={handleLogout}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {loading ? "Déconnexion..." : "Se déconnecter"}
          </Button>
        </div>
      </div>
    </main>
  )
}
