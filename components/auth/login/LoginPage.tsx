"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn, UserPlus, KeyRound } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabase } from "@/lib/supabase"
import styles from "./LoginPage.module.css"

const espaceLabels = { parent: "Espace Parent", ecole: "Mon établissement", enseignant: "Espace Enseignant" } as const
type Espace = keyof typeof espaceLabels
type BookView = "closed" | "login" | "register"
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null
  return value
}

export function LoginPage() {
  const router = useRouter()
  const { connecter, estConnecte, estEnCoursDeChargement, obtenirCheminRedirection } = useAuthentification()
  const [espace, setEspace] = useState<Espace>("ecole")
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [view, setView] = useState<BookView>("closed")
  const [introFinished, setIntroFinished] = useState(false)
  const [turning, setTurning] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)
  const [registerMessage, setRegisterMessage] = useState("")
  const [registerError, setRegisterError] = useState("")
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerData, setRegisterData] = useState({ firstName: "", lastName: "", email: "", password: "" })

  const bookOpen = view !== "closed"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextEspace = (params.get("espace") as Espace | null) || "ecole"
    setEspace(nextEspace in espaceLabels ? nextEspace : "ecole")
    setRedirectTo(safeRedirect(params.get("redirectTo")))
    const timer = window.setTimeout(() => setIntroFinished(true), 1250)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!estEnCoursDeChargement && estConnecte) {
      router.replace(redirectTo ?? obtenirCheminRedirection())
    }
  }, [estConnecte, estEnCoursDeChargement, router, obtenirCheminRedirection, redirectTo])

  const openBook = (nextView: "login" | "register") => {
    if (!introFinished || turning) return
    setLoginError("")
    setRegisterMessage("")
    setRegisterError("")
    setTurning(true)
    window.setTimeout(() => { setView(nextView); setTurning(false) }, 520)
  }

  const closeBook = () => {
    if (turning) return
    setTurning(true)
    window.setTimeout(() => { setLoginError(""); setRegisterMessage(""); setRegisterError(""); setView("closed"); setTurning(false) }, 520)
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")
    const email = loginEmail.trim()
    if (!email) return setLoginError("L’email est requis")
    if (!isValidEmail(email)) return setLoginError("Format d’email invalide")
    if (!loginPassword) return setLoginError("Le mot de passe est requis")
    setLoading(true)
    try {
      const result = await connecter(email, loginPassword)
      if (!result.succes) {
        setLoginError(result.erreur ?? "Connexion impossible.")
      } else {
        router.replace(redirectTo ?? obtenirCheminRedirection())
      }
    } catch {
      setLoginError("Une erreur inattendue s’est produite.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterMessage("")
    setRegisterError("")

    const firstName = registerData.firstName.trim()
    const lastName = registerData.lastName.trim()
    const email = registerData.email.trim().toLowerCase()
    const password = registerData.password

    if (!firstName || !lastName) return setRegisterError("Veuillez renseigner votre prénom et votre nom.")
    if (!email) return setRegisterError("L’adresse email est requise.")
    if (!isValidEmail(email)) return setRegisterError("Format d’email invalide.")
    if (password.length < 8) return setRegisterError("Le mot de passe doit contenir au moins 8 caractères.")

    setRegisterLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes("already registered") || message.includes("already exists") || message.includes("user already registered")) {
          setRegisterError("Un compte existe déjà avec cette adresse email. Utilisez la connexion ou récupérez votre mot de passe.")
        } else {
          setRegisterError(error.message)
        }
        return
      }

      if (data.session) {
        setRegisterMessage("Compte créé avec succès. Vous pouvez maintenant vous connecter.")
        setLoginEmail(email)
        setRegisterData({ firstName: "", lastName: "", email: "", password: "" })
      } else {
        setRegisterMessage("Compte créé. Consultez votre email pour confirmer votre adresse avant de vous connecter.")
      }
    } catch {
      setRegisterError("Impossible de créer le compte pour le moment. Veuillez réessayer.")
    } finally {
      setRegisterLoading(false)
    }
  }

  if (estEnCoursDeChargement) return <main className={styles.loading}><Loader2 className={styles.spinner} /><p>Chargement de votre espace…</p></main>
  if (estConnecte) return <main className={styles.loading}><Loader2 className={styles.spinner} /><p>Redirection vers votre espace…</p></main>

  const pageNumber = view === "login" ? "2" : view === "register" ? "6" : "—"
  const guideNumber = view === "login" ? "1" : view === "register" ? "5" : "—"

  return (
    <main className={styles.shell}>
      <div className={styles.topBar}><button type="button" className={styles.backButton} onClick={() => (bookOpen ? closeBook() : router.push("/"))}><ArrowLeft size={16} /> {bookOpen ? "Fermer le livre" : "Retour"}</button></div>
      <div className={`${styles.stage} ${introFinished ? styles.stageReady : styles.stageApproaching} ${bookOpen ? styles.stageOpen : ""} ${turning ? styles.stageTurning : ""}`}>
        <div className={`${styles.book} ${bookOpen ? styles.bookOpen : styles.bookClosed}`}>
          <div className={styles.shadow} /><div className={styles.spine} /><div className={styles.ribbon} />
          <aside className={styles.leftPage} aria-label="Guide de l'application">
            <div className={styles.pageContent}>
              <span className={styles.pageNumber}>Page {guideNumber}</span>
              <span className={styles.eyebrow}>{view === "register" ? "Guide inscription" : "Administration scolaire"}</span>
              <h1>{view === "register" ? "Créer votre espace" : "Système de Gestion Scolaire"}</h1>
              <p className={styles.intro}>{view === "register" ? "Créez votre espace pour accéder aux outils de gestion et accompagner efficacement votre établissement." : "Un espace unique pour organiser simplement la vie administrative et pédagogique de votre établissement."}</p>
              <div className={styles.features}>
                {view === "register" ? <><span>Renseigner vos informations</span><span>Créer votre accès</span><span>Sécuriser votre compte</span><span>Accéder à votre espace</span></> : <><span>Élèves</span><span>Enseignants</span><span>Classes</span><span>Notes</span><span>Absences</span><span>Finances</span><span>Communication</span></>}
              </div>
            </div>
          </aside>
          <section className={styles.rightPage} aria-label={view === "register" ? "Formulaire d'inscription" : "Formulaire de connexion"} aria-hidden={!bookOpen}>
            <div className={styles.pageContent}>
              <span className={styles.pageNumber}>Page {pageNumber}</span>
              {view === "login" ? <>
                <span className={styles.eyebrow}>Accès sécurisé</span><h2>{espaceLabels[espace]}</h2><p className={styles.formIntro}>Connectez-vous pour accéder à votre espace.</p>
                <form onSubmit={handleLoginSubmit} className={styles.form} noValidate>
                  <label>Adresse email<input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="votre@ecole.fr" autoComplete="email" /></label>
                  <label>Mot de passe<span className={styles.password}><input type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Afficher ou masquer le mot de passe">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
                  {loginError && <p className={styles.error} role="alert">{loginError}</p>}
                  <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? <><Loader2 className={styles.smallSpin} /> Connexion...</> : <><LogIn size={17} /> Se connecter</>}</button>
                  <button type="button" className={styles.textButton} onClick={() => router.push(`/auth/mot-de-passe-oublie?espace=${encodeURIComponent(espace)}`)}><KeyRound size={15} /> Mot de passe oublié ?</button>
                </form>
              </> : <>
                <span className={styles.eyebrow}>Nouveau compte</span><h2>Inscription</h2><p className={styles.formIntro}>Créez votre accès à l’espace de gestion scolaire.</p>
                <form onSubmit={handleRegisterSubmit} className={styles.form} noValidate>
                  <div className={styles.twoColumns}><label>Prénom<input value={registerData.firstName} onChange={e => setRegisterData(v => ({ ...v, firstName: e.target.value }))} autoComplete="given-name" /></label><label>Nom<input value={registerData.lastName} onChange={e => setRegisterData(v => ({ ...v, lastName: e.target.value }))} autoComplete="family-name" /></label></div>
                  <label>Adresse email<input type="email" value={registerData.email} onChange={e => setRegisterData(v => ({ ...v, email: e.target.value }))} autoComplete="email" /></label>
                  <label>Mot de passe<span className={styles.password}><input type={showRegisterPassword ? "text" : "password"} value={registerData.password} onChange={e => setRegisterData(v => ({ ...v, password: e.target.value }))} autoComplete="new-password" /><button type="button" onClick={() => setShowRegisterPassword(v => !v)} aria-label="Afficher ou masquer le mot de passe">{showRegisterPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
                  {registerError && <p className={styles.error} role="alert">{registerError}</p>}
                  {registerMessage && <p className={styles.notice} role="status">{registerMessage}</p>}
                  <button type="submit" className={styles.primaryButton} disabled={registerLoading}>{registerLoading ? <><Loader2 className={styles.smallSpin} /> Création...</> : <><UserPlus size={17} /> Créer mon compte</>}</button>
                </form>
              </>}
            </div>
          </section>
          <div className={styles.cover} aria-hidden={bookOpen}><div className={styles.coverBorder} /><div className={styles.emblem}>GS</div><span className={styles.coverKicker}>Établissement scolaire</span><strong>Système de<br />Gestion Scolaire</strong><span className={styles.coverRule} /><small>Un espace pour toute votre école</small></div>
        </div>
        {!bookOpen && <div className={`${styles.actions} ${introFinished ? styles.actionsReady : ""}`}><button type="button" className={styles.primaryAction} disabled={!introFinished} onClick={() => openBook("login")}><LogIn size={17} /> Connexion</button><button type="button" className={styles.secondaryAction} disabled={!introFinished} onClick={() => openBook("register")}><UserPlus size={17} /> Inscription</button></div>}
        {bookOpen && <button type="button" className={styles.innerBack} onClick={closeBook}><ArrowLeft size={15} /> Fermer et revenir au livre</button>}
      </div>
    </main>
  )
}
