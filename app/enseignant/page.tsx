"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EspaceEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement, deconnecter } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/")
  }, [utilisateur, estEnCoursDeChargement, router])

  if (estEnCoursDeChargement || !utilisateur) return <div className="min-h-screen flex items-center justify-center bg-creme"><p className="text-sm text-muted-foreground">Chargement...</p></div>

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="flex items-start justify-between border-b pb-6">
          <div><p className="text-sm text-muted-foreground">Espace Enseignant</p><h1 className="text-3xl font-semibold tracking-tight">Bonjour{contexte?.first_name ? ` ${contexte.first_name}` : ""}</h1><p className="mt-2 text-sm text-muted-foreground">Retrouvez vos établissements et votre activité pédagogique.</p></div>
          <Button variant="outline" onClick={async () => { await deconnecter(); router.replace("/") }}>Se déconnecter</Button>
        </header>
        <section className="py-10">
          <div className="mb-8"><h2 className="text-xl font-semibold">Mes établissements</h2><p className="mt-1 text-sm text-muted-foreground">Choisissez l'établissement dans lequel vous souhaitez travailler.</p></div>
          {contexte?.establishments?.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{contexte.establishments.map((school) => <Card key={school.id} className="shadow-sm"><CardHeader><CardTitle className="text-lg">{school.name}</CardTitle></CardHeader><CardContent><Button className="w-full" onClick={() => router.push(`/enseignant/etablissement/${school.id}`)}>Entrer</Button></CardContent></Card>)}</div> : <div className="rounded-xl border bg-white p-8 text-center shadow-sm"><h2 className="font-medium">Aucun établissement associé</h2><p className="mt-2 text-sm text-muted-foreground">Votre établissement doit vous rattacher à votre compte enseignant avec votre identifiant.</p></div>}
          <div className="mt-10 grid gap-4 md:grid-cols-3"><Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mon emploi du temps</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Vue générale de vos horaires dans tous vos établissements.</p></CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mes alertes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Notifications et informations de l'administration.</p></CardContent></Card><Card className="shadow-sm"><CardHeader><CardTitle className="text-base">Mon profil</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Gérez vos informations personnelles et votre sécurité.</p></CardContent></Card></div>
        </section>
      </div>
    </main>
  )
}
