"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { serviceAuthentification } from "@/services/authentification.supabase.service"

export default function MotDePasseOubliePage() {
  const router = useRouter()
  const params = useSearchParams()
  const espace = params.get("espace") || "ecole"
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setErreur(""); setMessage(""); setLoading(true)
    const result = await serviceAuthentification.reinitialiserMotDePasse(email)
    setLoading(false)
    if (!result.succes) setErreur(result.erreur ?? "Impossible d'envoyer le lien.")
    else setMessage("Si cette adresse correspond à un compte, un lien de réinitialisation vient d'être envoyé.")
  }

  return <main className="min-h-screen bg-creme flex items-center justify-center px-5 py-10"><div className="w-full max-w-md"><button className="mb-8 text-sm text-muted-foreground" onClick={() => router.push(`/login?espace=${espace}`)}>← Retour à la connexion</button><div className="mb-7"><p className="text-sm text-muted-foreground">Sécurité du compte</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Mot de passe oublié</h1><p className="mt-2 text-sm text-muted-foreground">Saisissez votre adresse email pour recevoir un lien sécurisé.</p></div><form onSubmit={submit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"><div className="space-y-2"><Label htmlFor="email">Adresse email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>{erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}<Button className="w-full" disabled={loading}>{loading ? "Envoi..." : "Envoyer le lien"}</Button></form></div></main>
}
