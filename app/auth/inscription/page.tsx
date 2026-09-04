"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function InscriptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" })

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()

    if (!firstName || !lastName || !email || !form.password) {
      setError("Veuillez renseigner tous les champs obligatoires.")
      return
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: form.phone.trim() || null,
        },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    })
    setLoading(false)

    if (signUpError) {
      const message = signUpError.message.toLowerCase()
      if (message.includes("already registered") || message.includes("already exists")) {
        setError("Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.")
      } else {
        setError(signUpError.message)
      }
      return
    }

    // Supabase may return a session immediately when email confirmation is disabled.
    // We deliberately do not assign an application role here: roles and establishment
    // access remain controlled by the existing authorization system/backend.
    if (data.session) {
      router.replace("/connexion")
      router.refresh()
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Compte créé</h1>
          <p className="mt-3 text-slate-600">
            Votre compte a été créé. Consultez votre boîte email pour confirmer votre adresse avant de vous connecter.
          </p>
          <button onClick={() => router.push("/connexion")} className="mt-7 w-full rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
            Aller à la connexion
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <button type="button" onClick={() => router.push("/connexion")} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Retour à la connexion
        </button>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <header className="border-b bg-slate-900 p-6 text-white sm:p-8">
            <UserPlus size={30} />
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Créer votre compte</h1>
            <p className="mt-2 text-slate-300">Créez votre compte pour accéder aux services de la plateforme.</p>
          </header>

          <form onSubmit={submit} className="space-y-5 p-6 sm:p-8" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom *" value={form.firstName} onChange={v => update("firstName", v)} autoComplete="given-name" />
              <Field label="Nom *" value={form.lastName} onChange={v => update("lastName", v)} autoComplete="family-name" />
            </div>
            <Field label="Adresse email *" type="email" value={form.email} onChange={v => update("email", v)} autoComplete="email" />
            <Field label="Téléphone" value={form.phone} onChange={v => update("phone", v)} autoComplete="tel" />

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField label="Mot de passe *" value={form.password} show={showPassword} onToggle={() => setShowPassword(v => !v)} onChange={v => update("password", v)} autoComplete="new-password" />
              <PasswordField label="Confirmer le mot de passe *" value={form.confirmPassword} show={showPassword} onToggle={() => setShowPassword(v => !v)} onChange={v => update("confirmPassword", v)} autoComplete="new-password" />
            </div>
            <p className="text-xs text-slate-500">Utilisez au moins 8 caractères pour votre mot de passe.</p>

            {error && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button disabled={loading} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus size={18} />}
              {loading ? "Création du compte…" : "Créer mon compte"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Vous avez déjà un compte ?{" "}
              <button type="button" onClick={() => router.push("/connexion")} className="font-medium text-slate-900 underline underline-offset-2">Se connecter</button>
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, type = "text", autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input type={type} value={value} autoComplete={autoComplete} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
    </label>
  )
}

function PasswordField({ label, value, show, onToggle, onChange, autoComplete }: { label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void; autoComplete?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <span className="relative mt-1 block">
        <input type={show ? "text" : "password"} value={value} autoComplete={autoComplete} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 pr-11 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        <button type="button" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-900">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  )
}
