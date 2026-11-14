"use client"

import { useEffect, useState, type FormEvent } from "react"
import { KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"
import { serviceAuthentification } from "@/services/authentification.supabase.service"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"

export default function ParentProfile() {
  const { utilisateur, deconnecter, actualiser } = useAuthentification()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [initialEmail, setInitialEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    void supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return
      const metadata = data.user.user_metadata ?? {}
      const context = await serviceAuthentification.obtenirContexte()
      if (!active) return
      setFirstName(String(metadata.first_name ?? context?.first_name ?? ""))
      setLastName(String(metadata.last_name ?? context?.last_name ?? ""))
      setEmail(data.user.email ?? "")
      setInitialEmail(data.user.email ?? "")
    })
    return () => { active = false }
  }, [utilisateur?.nomUtilisateur])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setProfileMessage("")
    if (!firstName.trim() || !lastName.trim()) {
      setError("Renseignez votre prénom et votre nom.")
      return
    }
    setLoadingProfile(true)
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({
        ...(email.trim().toLowerCase() !== initialEmail.toLowerCase() && email.trim() ? { email: email.trim().toLowerCase() } : {}),
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      })
      if (updateError) throw updateError
      await actualiser()
      setInitialEmail(email.trim().toLowerCase())
      setProfileMessage("Vos informations ont été enregistrées. Si vous avez changé d’adresse email, confirmez la nouvelle adresse depuis le message reçu.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer vos informations.")
    } finally {
      setLoadingProfile(false)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordMessage("")
    setError("")
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoadingPassword(true)
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({ password })
      if (updateError) throw updateError
      setPassword("")
      setConfirmPassword("")
      setPasswordMessage("Votre mot de passe a été modifié.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de modifier le mot de passe.")
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <ParentPageHeader
        eyebrow="Mon compte"
        title="Profil et paramètres"
        description="Mettez à jour vos informations personnelles et sécurisez votre compte."
      />

      {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700"><UserRound className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-slate-900">Informations personnelles</h2><p className="text-sm text-slate-500">Les informations utilisées pour votre compte parent.</p></div>
        </div>
        <form onSubmit={saveProfile} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Prénom</span><Input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" required /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Nom</span><Input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" required /></label>
          </div>
          <label className="block max-w-xl space-y-1.5"><span className="text-sm font-medium text-slate-700">Adresse email</span><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">Une modification de l’adresse email peut nécessiter une confirmation.</p>
            <Button type="submit" disabled={loadingProfile}><Save className="mr-2 h-4 w-4" />{loadingProfile ? "Enregistrement…" : "Enregistrer les informations"}</Button>
          </div>
          {profileMessage && <p role="status" className="text-sm text-emerald-700">{profileMessage}</p>}
        </form>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700"><KeyRound className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-slate-900">Mot de passe</h2><p className="text-sm text-slate-500">Choisissez un mot de passe personnel et difficile à deviner.</p></div>
        </div>
        <form onSubmit={changePassword} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Nouveau mot de passe</span><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Confirmer le mot de passe</span><Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
          </div>
          <div className="flex border-t border-slate-100 pt-4 [&>button]:w-full sm:justify-end sm:[&>button]:w-auto"><Button type="submit" variant="outline" disabled={loadingPassword}><ShieldCheck className="mr-2 h-4 w-4" />{loadingPassword ? "Modification…" : "Modifier le mot de passe"}</Button></div>
          {passwordMessage && <p role="status" className="text-sm text-emerald-700">{passwordMessage}</p>}
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium text-slate-900">Déconnexion</p><p className="text-sm text-slate-500">Pensez à fermer votre session sur un appareil partagé.</p></div>
        <Button variant="outline" onClick={() => void deconnecter()}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</Button>
      </section>
    </div>
  )
}
