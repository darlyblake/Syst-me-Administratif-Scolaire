"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthentification } from "@/providers/authentification.provider"

const espaceLabels = { parent: "Espace Parent", ecole: "Mon établissement", enseignant: "Espace Enseignant" } as const

type Espace = keyof typeof espaceLabels

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const espace = (params.get("espace") as Espace) || "ecole"
  const { connecter, estConnecte, estEnCoursDeChargement } = useAuthentification()
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState("")
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!estEnCoursDeChargement && estConnecte) router.replace("/")
  }, [estConnecte, estEnCoursDeChargement, router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setErreur(""); setChargement(true)
    const result = await connecter(email, motDePasse)
    setChargement(false)
    if (!result.succes) { setErreur(result.erreur ?? "Connexion impossible."); return }
    router.replace("/")
  }

  if (estEnCoursDeChargement || estConnecte) return <div className="min-h-screen flex items-center justify-center bg-creme"><p className="text-sm text-muted-foreground">Chargement...</p></div>

  return (
    <main className="min-h-screen bg-creme flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <button className="mb-8 text-sm text-muted-foreground hover:text-foreground" onClick={() => router.push("/")}>← Retour</button>
        <div className="mb-7"><p className="text-sm font-medium text-muted-foreground">Connexion</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{espaceLabels[espace]}</h1><p className="mt-2 text-sm text-muted-foreground">Utilisez votre adresse email et votre mot de passe. Le système identifiera automatiquement votre compte et vos droits.</p></div>
        <form onSubmit={submit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
          <div className="space-y-2"><Label htmlFor="email">Adresse email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@exemple.com" /></div>
          <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required placeholder="Votre mot de passe" /></div>
          {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
          <Button type="submit" className="w-full" disabled={chargement}>{chargement ? "Connexion..." : "Se connecter"}</Button>
          <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => router.push(`/auth/mot-de-passe-oublie?espace=${espace}`)}>Mot de passe oublié ?</button>
        </form>
      </div>
    </main>
  )
}
