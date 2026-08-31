"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { serviceAuthentification } from "@/services/authentification.supabase.service"

export default function MotDePasseOubliePage() {
  const router = useRouter()
  const [espace, setEspace] = useState("ecole")
  const [etape, setEtape] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEspace(params.get("espace") || "ecole")
  }, [])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const clearFeedback = () => { setErreur(""); setMessage("") }

  const envoyerCode = async (event: React.FormEvent) => {
    event.preventDefault()
    clearFeedback()
    setLoading(true)
    const result = await serviceAuthentification.reinitialiserMotDePasse(email)
    setLoading(false)
    if (!result.succes) {
      setErreur(result.erreur ?? "Impossible d'envoyer le code.")
      return
    }
    setEtape(2)
    setResendSeconds(60)
    setMessage("Si cette adresse correspond à un compte, un code de validation à 6 chiffres vient d'être envoyé.")
  }

  const verifierCode = async (event: React.FormEvent) => {
    event.preventDefault()
    clearFeedback()
    if (!/^\d{6}$/.test(code)) {
      setErreur("Le code doit contenir exactement 6 chiffres.")
      return
    }
    setLoading(true)
    const result = await serviceAuthentification.verifierCodeReinitialisation(email, code)
    setLoading(false)
    if (!result.succes) {
      setErreur(result.erreur ?? "Code invalide ou expiré.")
      return
    }
    setEtape(3)
    setMessage("Code validé. Choisissez maintenant votre nouveau mot de passe.")
  }

  const changerMotDePasse = async (event: React.FormEvent) => {
    event.preventDefault()
    clearFeedback()
    if (nouveauMotDePasse.length < 8) {
      setErreur("Le nouveau mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    const result = await serviceAuthentification.mettreAJourMotDePasse(nouveauMotDePasse)
    setLoading(false)
    if (!result.succes) {
      setErreur(result.erreur ?? "Impossible de modifier le mot de passe.")
      return
    }
    await serviceAuthentification.deconnecter()
    router.replace(`/login?espace=${encodeURIComponent(espace)}&reset=success`)
  }

  const titre = etape === 1 ? "Mot de passe oublié" : etape === 2 ? "Vérifier le code" : "Nouveau mot de passe"
  const description = etape === 1
    ? "Saisissez votre adresse email pour recevoir un code sécurisé."
    : etape === 2
      ? `Saisissez le code à 6 chiffres reçu sur ${email}.`
      : "Votre identité est vérifiée. Définissez un nouveau mot de passe."

  return (
    <main className="min-h-screen bg-creme flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <button className="mb-8 text-sm text-muted-foreground" onClick={() => router.push(`/login?espace=${espace}`)}>
          ← Retour à la connexion
        </button>

        <div className="mb-7">
          <p className="text-sm text-muted-foreground">Sécurité du compte · Étape {etape}/3</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{titre}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>

        <form onSubmit={etape === 1 ? envoyerCode : etape === 2 ? verifierCode : changerMotDePasse} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
          {etape === 1 && (
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}

          {etape === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">Code de validation</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                />
              </div>
              <button
                type="button"
                disabled={resendSeconds > 0 || loading}
                className="text-sm text-primary underline disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  clearFeedback()
                  setLoading(true)
                  const result = await serviceAuthentification.reinitialiserMotDePasse(email)
                  setLoading(false)
                  if (!result.succes) setErreur(result.erreur ?? "Impossible de renvoyer le code.")
                  else { setResendSeconds(60); setMessage("Un nouveau code vient d'être demandé.") }
                }}
              >
                {resendSeconds > 0 ? `Renvoyer le code dans ${resendSeconds}s` : "Renvoyer le code"}
              </button>
            </>
          )}

          {etape === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Minimum 8 caractères.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
              </div>
            </>
          )}

          {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}

          <Button className="w-full" disabled={loading}>
            {loading ? "Traitement..." : etape === 1 ? "Envoyer le code" : etape === 2 ? "Vérifier le code" : "Modifier le mot de passe"}
          </Button>
        </form>
      </div>
    </main>
  )
}
