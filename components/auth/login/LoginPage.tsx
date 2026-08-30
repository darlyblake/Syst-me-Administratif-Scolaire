"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn } from "lucide-react"
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
  const [bookOpen, setBookOpen] = useState(false)
  const [introFinished, setIntroFinished] = useState(false)

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

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroFinished(true), 1250)
    return () => window.clearTimeout(timer)
  }, [])

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
    try {
      const result = await connecter(email, password)
      if (!result.succes) {
        setLoginError(result.erreur ?? "Connexion impossible.")
      }
    } catch {
      setLoginError("Une erreur inattendue s’est produite.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = () => {
    router.push(`/auth/mot-de-passe-oublie?espace=${espace}`)
  }

  const openBook = () => {
    if (!introFinished || bookOpen) return
    setBookOpen(true)
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
    <main className="login-shell login-shell--book">
      <div className="login-back-button-wrap">
        <button type="button" className="login-back-button" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      <div className={`login-book-scene ${introFinished ? "login-book-scene--ready" : "login-book-scene--approaching"} ${bookOpen ? "login-book-scene--opened" : ""}`}>
        <div className={`login-book-shell ${bookOpen ? "login-book-shell--open" : "login-book-shell--closed"}`}>
          <div className="login-book-shadow" aria-hidden="true" />
          <div className="login-book-ribbon" aria-hidden="true" />
          <div className="login-book-spine" aria-hidden="true" />

          <aside className="login-book-page login-book-page--left" aria-label="Présentation de l'application">
            <div className="login-book-page-inner">
              <p className="login-book-page-kicker">Administration scolaire</p>
              <h1 className="login-book-page-header">Système de Gestion Scolaire</h1>
              <p className="login-book-page-intro">
                Un espace unique pour organiser simplement la vie administrative et pédagogique de votre établissement.
              </p>
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

          <section className="login-book-page login-book-page--right" aria-label="Formulaire de connexion" aria-hidden={!bookOpen}>
            <div className="login-book-page-inner login-book-form-wrap">
              <div className="login-header-block">
                <p className="login-header-eyebrow">Accès sécurisé</p>
                <h2 className="login-header-title">{espaceLabels[espace]}</h2>
                <p className="login-book-form-subtitle">Connectez-vous pour accéder à votre espace.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="login-form-shell" noValidate>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="login-field-label">Adresse email</label>
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      placeholder="votre@ecole.fr"
                      autoComplete="email"
                      className={loginError ? "login-input login-input--error" : "login-input"}
                      tabIndex={bookOpen ? 0 : -1}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="login-field-label">Mot de passe</label>
                    <div className="login-password-wrap">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={loginError ? "login-input login-input--error login-input--password" : "login-input login-input--password"}
                        tabIndex={bookOpen ? 0 : -1}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        onClick={() => setShowPassword((current) => !current)}
                        className="login-password-toggle"
                        tabIndex={bookOpen ? 0 : -1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {loginError ? <p role="alert" className="login-error-message">{loginError}</p> : null}

                <button type="submit" className="login-submit-button" disabled={loading} tabIndex={bookOpen ? 0 : -1}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Connexion...</span>
                  ) : (
                    <><LogIn className="h-4 w-4" />Se connecter</>
                  )}
                </button>

                <div className="mt-5 text-center">
                  <button type="button" onClick={handleForgotPassword} className="login-link-button" tabIndex={bookOpen ? 0 : -1}>
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            </div>
          </section>

          <div className="login-book-closed-cover" aria-hidden={bookOpen}>
            <div className="login-book-cover-border" aria-hidden="true" />
            <div className="login-book-cover-emblem">GS</div>
            <p className="login-book-cover-kicker">Établissement scolaire</p>
            <div className="login-book-cover-title">Système de<br />Gestion Scolaire</div>
            <div className="login-book-cover-rule" aria-hidden="true" />
            <p className="login-book-cover-subtitle">Un espace pour toute votre école</p>
          </div>
        </div>

        {!bookOpen ? (
          <button
            type="button"
            className={`login-book-cta ${introFinished ? "login-book-cta--ready" : ""}`}
            onClick={openBook}
            disabled={!introFinished}
            aria-label="Ouvrir le livre et accéder à la connexion"
          >
            <LogIn className="h-4 w-4" />
            Connexion
          </button>
        ) : null}
      </div>
    </main>
  )
}
