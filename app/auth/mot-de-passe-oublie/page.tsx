"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, LockKeyhole } from "lucide-react"
import { serviceAuthentification } from "@/services/authentification.supabase.service"
import styles from "@/components/auth/login/LoginPage.module.css"

type Etape = 1 | 2 | 3

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const etapeInfo: Record<Etape, { guidePage: string; formPage: string; label: string }> = {
  1: { guidePage: "1", formPage: "2", label: "Demander le code" },
  2: { guidePage: "3", formPage: "4", label: "Vérifier le code" },
  3: { guidePage: "5", formPage: "6", label: "Créer le mot de passe" },
}

export default function MotDePasseOubliePage() {
  const router = useRouter()
  const [espace, setEspace] = useState("ecole")
  const [etape, setEtape] = useState<Etape>(1)
  const [introFinished, setIntroFinished] = useState(false)
  const [turning, setTurning] = useState(false)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEspace(params.get("espace") || "ecole")
    const timer = window.setTimeout(() => setIntroFinished(true), 500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const clearFeedback = () => {
    setErreur("")
    setMessage("")
  }

  const tournerVers = (nextStep: Etape) => {
    if (turning) return
    setTurning(true)
    window.setTimeout(() => {
      setEtape(nextStep)
      setTurning(false)
    }, 520)
  }

  const retourConnexion = () => {
    if (turning) return
    router.push(`/connexion?espace=${encodeURIComponent(espace)}`)
  }

  const envoyerCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return setErreur("L'adresse email est requise.")
    if (!isValidEmail(normalizedEmail)) return setErreur("Format d'email invalide.")

    setLoading(true)
    const result = await serviceAuthentification.reinitialiserMotDePasse(normalizedEmail)
    setLoading(false)
    if (!result.succes) {
      setErreur(result.erreur ?? "Impossible d'envoyer le code de réinitialisation.")
      return
    }

    setEmail(normalizedEmail)
    setResendSeconds(60)
    setMessage("Le code de validation a été envoyé. Consultez votre boîte email, puis continuez avec l'étape suivante.")
    tournerVers(2)
  }

  const verifierCode = async (event: FormEvent<HTMLFormElement>) => {
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

    setMessage("Code validé. Vous pouvez maintenant choisir votre nouveau mot de passe.")
    tournerVers(3)
  }

  const renvoyerCode = async () => {
    if (resendSeconds > 0 || loading) return
    clearFeedback()
    setLoading(true)
    const result = await serviceAuthentification.reinitialiserMotDePasse(email)
    setLoading(false)
    if (!result.succes) {
      setErreur(result.erreur ?? "Impossible de renvoyer le code.")
      return
    }
    setResendSeconds(60)
    setMessage("Un nouveau code de validation vient d'être envoyé.")
  }

  const changerMotDePasse = async (event: FormEvent<HTMLFormElement>) => {
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
    router.replace(`/connexion?espace=${encodeURIComponent(espace)}&reset=success`)
  }

  const guide = etape === 1
    ? {
        eyebrow: "Étape 1 · Votre adresse",
        title: "Retrouver votre accès",
        intro: "Indiquez l'adresse email associée à votre compte. Un code de validation sécurisé vous sera envoyé.",
        features: ["Saisir votre email", "Recevoir le code", "Vérifier votre identité", "Créer un nouveau mot de passe"],
      }
    : etape === 2
      ? {
          eyebrow: "Étape 2 · Votre code",
          title: "Vérifier votre identité",
          intro: "Un code à 6 chiffres vous a été envoyé par email. Saisissez-le ici pour poursuivre la réinitialisation.",
          features: ["Ouvrir votre boîte email", "Saisir le code à 6 chiffres", "Valider le code", "Passer à l'étape suivante"],
        }
      : {
          eyebrow: "Étape 3 · Sécuriser l'accès",
          title: "Créer un nouveau mot de passe",
          intro: "Votre code est validé. Choisissez maintenant un mot de passe suffisamment robuste pour protéger votre compte.",
          features: ["Choisir un mot de passe", "Confirmer le mot de passe", "Enregistrer la modification", "Se reconnecter"],
        }

  const formTitle = etape === 1 ? "Adresse email" : etape === 2 ? "Code de validation" : "Nouveau mot de passe"

  return (
    <main className={styles.shell}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={retourConnexion}>
          <ArrowLeft size={16} /> Retour à la connexion
        </button>
      </div>

      <div className={`${styles.stage} ${introFinished ? styles.stageReady : styles.stageApproaching} ${styles.stageOpen} ${turning ? styles.stageTurning : ""}`}>
        <div className={`${styles.book} ${styles.bookOpen}`}>
          <div className={styles.shadow} />
          <div className={styles.spine} />
          <div className={styles.ribbon} />

          <aside className={styles.leftPage} aria-label={`Instructions de l'étape ${etape}`}>
            <div className={styles.pageContent}>
              <span className={styles.pageNumber}>Page {etapeInfo[etape].guidePage}</span>
              <span className={styles.eyebrow}>{guide.eyebrow}</span>
              <h1>{guide.title}</h1>
              <p className={styles.intro}>{guide.intro}</p>
              <div className={styles.features}>
                {guide.features.map((feature) => <span key={feature}>{feature}</span>)}
              </div>
            </div>
          </aside>

          <section className={styles.rightPage} aria-label={`Formulaire de réinitialisation, étape ${etape}`}>
            <div className={styles.pageContent}>
              <span className={styles.pageNumber}>Page {etapeInfo[etape].formPage}</span>

              {etape === 1 && (
                <>
                  <span className={styles.eyebrow}>Récupération du compte</span>
                  <h2>{formTitle}</h2>
                  <p className={styles.formIntro}>Saisissez l'adresse email utilisée pour votre compte. Vous recevrez ensuite un code de validation.</p>
                  <form onSubmit={envoyerCode} className={styles.form} noValidate>
                    <label>
                      Adresse email
                      <span className={styles.password}>
                        <input id="email" type="email" autoComplete="email" placeholder="votre@ecole.fr" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                        <Mail size={17} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "#697386" }} />
                      </span>
                    </label>
                    {erreur && <p role="alert" className={styles.error}>{erreur}</p>}
                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      {loading ? <><Loader2 className={styles.smallSpin} /> Envoi...</> : <><KeyRound size={17} /> Envoyer le code</>}
                    </button>
                  </form>
                </>
              )}

              {etape === 2 && (
                <>
                  <span className={styles.eyebrow}>Code reçu par email</span>
                  <h2>{formTitle}</h2>
                  <p className={styles.formIntro}>Entrez le code à 6 chiffres envoyé à <strong>{email}</strong>.</p>
                  <form onSubmit={verifierCode} className={styles.form} noValidate>
                    <label>
                      Code de validation
                      <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} required autoFocus />
                    </label>
                    {erreur && <p role="alert" className={styles.error}>{erreur}</p>}
                    {message && <p role="status" className={styles.notice}>{message}</p>}
                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      {loading ? <><Loader2 className={styles.smallSpin} /> Vérification...</> : <><ShieldCheck size={17} /> Vérifier le code</>}
                    </button>
                    <button type="button" className={styles.textButton} onClick={renvoyerCode} disabled={resendSeconds > 0 || loading}>
                      {resendSeconds > 0 ? `Renvoyer le code dans ${resendSeconds}s` : "Renvoyer le code"}
                    </button>
                  </form>
                </>
              )}

              {etape === 3 && (
                <>
                  <span className={styles.eyebrow}>Accès sécurisé</span>
                  <h2>{formTitle}</h2>
                  <p className={styles.formIntro}>Définissez votre nouveau mot de passe, puis confirmez-le pour terminer.</p>
                  <form onSubmit={changerMotDePasse} className={styles.form} noValidate>
                    <label>
                      Nouveau mot de passe
                      <span className={styles.password}>
                        <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} required autoFocus />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Afficher ou masquer le mot de passe">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                      </span>
                    </label>
                    <label>
                      Confirmer le mot de passe
                      <span className={styles.password}>
                        <input id="confirm-password" type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
                        <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label="Afficher ou masquer la confirmation">{showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                      </span>
                    </label>
                    <p className={styles.formIntro}>Minimum 8 caractères.</p>
                    {erreur && <p role="alert" className={styles.error}>{erreur}</p>}
                    {message && <p role="status" className={styles.notice}>{message}</p>}
                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      {loading ? <><Loader2 className={styles.smallSpin} /> Enregistrement...</> : <><LockKeyhole size={17} /> Modifier le mot de passe</>}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
        <button type="button" className={styles.innerBack} onClick={retourConnexion}>
          <ArrowLeft size={15} /> Retour à la connexion
        </button>
      </div>
    </main>
  )
}
