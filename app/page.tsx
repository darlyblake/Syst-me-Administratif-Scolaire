"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"

const espaces = [
  { key: "parent", titre: "Mon espace Parent", description: "Suivre la scolarité, les informations et les paiements de vos enfants.", href: "/login?espace=parent" },
  { key: "ecole", titre: "Mon établissement", description: "Accéder à l'administration et aux outils de gestion de votre établissement.", href: "/login?espace=ecole" },
  { key: "enseignant", titre: "Mon espace Enseignant", description: "Retrouver vos établissements, classes, élèves, horaires et activités pédagogiques.", href: "/login?espace=enseignant" },
]

export default function PageAccueil() {
  const router = useRouter()
  const { estConnecte, estEnCoursDeChargement, utilisateur } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement && estConnecte && utilisateur) {
      if (utilisateur.role === "admin") router.replace("/admin/dashboard")
      else if (utilisateur.role === "ecole") router.replace("/ecole/tableau-bord")
      else if (utilisateur.role === "enseignant") router.replace("/enseignant")
      else if (utilisateur.role === "parent") router.replace("/parents/tableau-bord")
    }
  }, [estConnecte, estEnCoursDeChargement, utilisateur, router])

  if (estEnCoursDeChargement || estConnecte) {
    return <div className="min-h-screen flex items-center justify-center bg-creme"><p className="text-sm text-muted-foreground">Chargement...</p></div>
  }

  return (
    <main className="min-h-screen bg-creme text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
        <header className="flex items-center justify-between border-b pb-6">
          <div><p className="text-lg font-semibold tracking-tight">Système Administratif Scolaire</p><p className="text-sm text-muted-foreground">Une gestion scolaire simple et professionnelle.</p></div>
          <Button variant="ghost" onClick={() => router.push("/login")}>Se connecter</Button>
        </header>
        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="max-w-2xl mb-10"><p className="mb-3 text-sm font-medium text-muted-foreground">Bienvenue</p><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Tout ce dont votre communauté scolaire a besoin, au même endroit.</h1><p className="mt-5 text-base leading-7 text-muted-foreground">Choisissez votre espace pour continuer. Vos droits et votre accès réel sont déterminés automatiquement après authentification.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {espaces.map((espace) => <Card key={espace.key} className="border-slate-200 shadow-sm transition-shadow hover:shadow-md"><CardHeader><CardTitle className="text-xl">{espace.titre}</CardTitle><CardDescription className="leading-6">{espace.description}</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={() => router.push(espace.href)}>Accéder</Button></CardContent></Card>)}
          </div>
        </section>
        <footer className="border-t pt-5 text-xs text-muted-foreground">Système Administratif Scolaire</footer>
      </div>
    </main>
  )
}
