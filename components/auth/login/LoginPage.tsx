"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { LoginFooter } from "@/components/auth/login/LoginFooter"
import { LoginForm } from "@/components/auth/login/LoginForm"
import { LoginHeader } from "@/components/auth/login/LoginHeader"
import { LoginVisualPanel } from "@/components/auth/login/LoginVisualPanel"
import { useAuthentification } from "@/providers/authentification.provider"

const espaceLabels = {
  parent: "Espace Parent",
  ecole: "Mon établissement",
  enseignant: "Espace Enseignant",
} as const

type Espace = keyof typeof espaceLabels

export function LoginPage() {
  const router = useRouter()
  const { connecter, estConnecte, estEnCoursDeChargement, obtenirCheminRedirection } = useAuthentification()
  const [espace, setEspace] = useState<Espace>("ecole")
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState("")
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const nextEspace = (params.get("espace") as Espace | null) || "ecole"
    setEspace(nextEspace in espaceLabels ? nextEspace : "ecole")
  }, [])

  useEffect(() => {
    if (!estEnCoursDeChargement && estConnecte) {
      router.replace(obtenirCheminRedirection())
    }
  }, [estConnecte, estEnCoursDeChargement, router, obtenirCheminRedirection])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErreur("")
    setChargement(true)

    const result = await connecter(email, motDePasse)
    setChargement(false)

    if (!result.succes) {
      setErreur(result.erreur ?? "Connexion impossible.")
      return
    }
  }

  const handleForgotPassword = () => {
    router.push(`/auth/mot-de-passe-oublie?espace=${espace}`)
  }

  if (estEnCoursDeChargement || estConnecte) {
    return (
      <main className="login-shell loading-shell">
        <div className="login-loading-card">
          <div className="login-loading-spinner" />
          <p>Chargement de votre espace…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <div className="login-back-button-wrap">
        <button type="button" className="login-back-button" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      <div className="login-panel">
        <LoginVisualPanel />

        <section className="login-form-panel" aria-label="Formulaire de connexion">
          <LoginHeader espaceLabel={espaceLabels[espace]} />
          <LoginForm
            email={email}
            motDePasse={motDePasse}
            erreur={erreur}
            chargement={chargement}
            espace={espaceLabels[espace]}
            onEmailChange={setEmail}
            onPasswordChange={setMotDePasse}
            onSubmit={handleSubmit}
            onForgotPassword={handleForgotPassword}
          />
          <LoginFooter />
        </section>
      </div>
    </main>
  )
}
