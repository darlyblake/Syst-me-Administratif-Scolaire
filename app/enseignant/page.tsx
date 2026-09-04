"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, BookOpen, Check, ClipboardCheck, LifeBuoy, LogOut, School, UserCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EspaceEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, estEnCoursDeChargement, deconnecter, selectionnerEtablissement } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/")
  }, [utilisateur, estEnCoursDeChargement, router])

  if (estEnCoursDeChargement || !utilisateur) {
    return <div className="min-h-screen flex items-center justify-center bg-creme"><p className="text-sm text-muted-foreground">Chargement...</p></div>
  }

  const etablissements = contexte?.establishments ?? []
  const ouvrirEtablissement = (id: string) => {
    if (selectionnerEtablissement(id)) router.push(`/enseignant/etablissement/${id}`)
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Espace Enseignant</p>
            <h1 className="text-3xl font-semibold tracking-tight">Bonjour{contexte?.first_name ? ` ${contexte.first_name}` : ""}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choisissez l'établissement dans lequel vous souhaitez travailler.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/notifications")}><Bell className="mr-2 h-4 w-4" />Notifications</Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/enseignant/profil")}><UserRound className="mr-2 h-4 w-4" />Mon profil</Button>
            <Button variant="outline" size="sm" onClick={async () => { await deconnecter(); router.replace("/") }}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</Button>
          </div>
        </header>

        <section className="py-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Mes établissements</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {etablissements.length > 1 ? "Votre compte enseignant peut travailler dans plusieurs établissements. Les données sont séparées par établissement." : "Votre établissement de travail est associé à votre compte enseignant."}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/enseignant/service-technique")}><LifeBuoy className="mr-2 h-4 w-4" />Service technique</Button>
          </div>

          {etablissements.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {etablissements.map((school) => {
                const active = etablissementActif?.id === school.id
                return (
                  <Card key={school.id} className={active ? "border-primary/50 shadow-md" : "shadow-sm"}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><School className="h-5 w-5" /></div>
                          <CardTitle className="truncate text-lg">{school.name}</CardTitle>
                        </div>
                        {active && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"><Check className="h-3 w-3" />Actif</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full" onClick={() => ouvrirEtablissement(school.id)}>
                        <BookOpen className="mr-2 h-4 w-4" />{active ? "Continuer" : "Sélectionner et ouvrir"}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => { if (selectionnerEtablissement(school.id)) router.push(`/enseignant/etablissement/${school.id}/notes`) }}><ClipboardCheck className="mr-2 h-4 w-4" />Notes</Button>
                        <Button variant="outline" size="sm" onClick={() => { if (selectionnerEtablissement(school.id)) router.push(`/enseignant/etablissement/${school.id}/presences`) }}><UserCheck className="mr-2 h-4 w-4" />Présences</Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
              <School className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-3 font-medium">Aucun établissement associé</h2>
              <p className="mt-2 text-sm text-muted-foreground">Votre établissement doit vous rattacher à votre compte enseignant avec votre identifiant.</p>
            </div>
          )}

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mon emploi du temps</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Consultez vos horaires depuis l'établissement actuellement sélectionné.</p></CardContent></Card>
            <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mes alertes</CardTitle></CardHeader><CardContent><Button variant="link" className="px-0" onClick={() => router.push("/enseignant/notifications")}>Voir mes notifications</Button></CardContent></Card>
            <Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mon profil</CardTitle></CardHeader><CardContent><Button variant="link" className="px-0" onClick={() => router.push("/enseignant/profil")}>Gérer mon profil</Button></CardContent></Card>
          </div>
        </section>
      </div>
    </main>
  )
}
