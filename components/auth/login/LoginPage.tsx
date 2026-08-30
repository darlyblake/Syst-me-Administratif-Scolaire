"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"

const espaceLabels = {
  parent: "Espace Parent",
  ecole: "Mon établissement",
  enseignant: "Espace Enseignant",
} as const

type Espace = keyof typeof espaceLabels

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export function LoginPage() {
  const router = useRouter()
  const { connecter, estConnecte, estEnCoursDeChargement, obtenirCheminRedirection } = useAuthentification()
  const [espace, setEspace] = useState<Espace>("ecole")
  const [showPassword, setShowPassword] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)

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

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")

    const email = loginEmail.trim()
    const password = loginPassword

    if (!email) {
      setLoginError("L’email est requis")
      return
    }

    if (!isValidEmail(email)) {
      setLoginError("Format d’email invalide")
      return
    }

    if (!password) {
      setLoginError("Le mot de passe est requis")
      return
    }

    setLoading(true)
    const result = await connecter(email, password)
    setLoading(false)

    if (!result.succes) {
      setLoginError(result.erreur ?? "Connexion impossible.")
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

      <div className="login-book-scene login-book-scene--open">
        <div className="login-book-shell login-book-shell--open">
          <div className="login-book-spine" />

          <aside className="login-book-page login-book-page--left" aria-label="Présentation de l'application">
            <div className="login-book-page-header">Système de Gestion Scolaire</div>
            <div className="login-book-page-body">
              <ul className="login-book-feature-list">
                <li>Gestion des élèves</li>
                <li>Gestion des enseignants</li>
                <li>Classes et organisation académique</li>
                <li>Notes et évaluations</li>
                <li>Absences</li>
                <li>Paiements et finances</li>
                <li>Communication scolaire</li>
              </ul>
            </div>
          </aside>

          <section className="login-book-page login-book-page--right" aria-label="Formulaire de connexion">
            <div className="login-book-form-wrap">
              <div className="login-header-block">
                <p className="login-header-eyebrow">Espace</p>
                <h2 className="login-header-title">{espaceLabels[espace]}</h2>
              </div>

              <form onSubmit={handleLoginSubmit} className="login-form-shell" noValidate>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="login-field-label">
                      Adresse email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      placeholder="votre@ecole.fr"
                      autoComplete="email"
                      className={loginError ? "login-input login-input--error" : "login-input"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="login-field-label">
                      Mot de passe
                    </label>
                    <div className="login-password-wrap">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={loginError ? "login-input login-input--error login-input--password" : "login-input login-input--password"}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        onClick={() => setShowPassword((current) => !current)}
                        className="login-password-toggle"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {loginError ? (
                  <p role="alert" className="login-error-message">
                    {loginError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  className="login-submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion...
                    </span>
                  ) : (
                    "Se connecter"
                  )}
                </button>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="login-link-button"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
