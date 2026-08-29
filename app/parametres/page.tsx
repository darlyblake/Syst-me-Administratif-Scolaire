"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuthentification } from "@/providers/authentification.provider"
import { Settings, Building2 } from "lucide-react"

export default function ParametresPage() {
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, selectionnerEtablissement, estEnCoursDeChargement } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement && !utilisateur) {
      router.replace("/login")
    }
  }, [utilisateur, estEnCoursDeChargement, router])

  if (estEnCoursDeChargement || !utilisateur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme">
        <p className="text-sm text-muted-foreground">Chargement des paramètres...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.replace("/profil")}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour au profil
          </button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gérez vos préférences et vos établissements
            </p>
          </div>
        </div>

        {/* Établissements */}
        {contexte?.establishments && contexte.establishments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Établissements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contexte.establishments.length === 1 ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vous avez accès à un établissement :
                  </p>
                  <div className="p-4 rounded-lg border bg-white">
                    <p className="font-medium">{contexte.establishments[0].name}</p>
                    {contexte.establishments[0].role && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Rôle: {contexte.establishments[0].role}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Vous avez accès à {contexte.establishments.length} établissements.
                    Sélectionnez-en un pour y accéder :
                  </p>
                  <div className="space-y-2">
                    {contexte.establishments.map((establishment) => {
                      const estSelectionne = etablissementActif?.id === establishment.id

                      return (
                        <button
                          key={establishment.id}
                          onClick={() => selectionnerEtablissement(establishment.id)}
                          className={`w-full rounded-lg border p-4 text-left transition-colors ${
                            estSelectionne ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{establishment.name}</p>
                              {establishment.role && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Rôle: {establishment.role}
                                </p>
                              )}
                            </div>
                            {estSelectionne && (
                              <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                                Actif
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Préférences d'interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Préférences d'interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Thème</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bientôt disponible
              </p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium">Langue</p>
              <p className="text-xs text-muted-foreground mt-1">
                Actuellement : Français
              </p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bientôt disponible
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
