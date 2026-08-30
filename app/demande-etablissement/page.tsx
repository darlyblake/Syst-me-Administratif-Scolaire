"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, CheckCircle2, Loader2, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DemandeEtablissementPage() {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    establishmentName: "", establishmentType: "", country: "Gabon", city: "", address: "",
    phone: "", establishmentEmail: "", firstName: "", lastName: "", email: "", requesterPhone: "", message: "",
  })

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!form.establishmentName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("Veuillez renseigner le nom de l’établissement, votre nom et votre adresse email.")
      return
    }
    setLoading(true)
    const { error: insertError } = await supabase.from("establishment_registration_requests").insert({
      establishment_name: form.establishmentName.trim(), establishment_type: form.establishmentType || null,
      country: form.country.trim() || "Gabon", city: form.city.trim() || null, address: form.address.trim() || null,
      phone: form.phone.trim() || null, establishment_email: form.establishmentEmail.trim() || null,
      requester_first_name: form.firstName.trim(), requester_last_name: form.lastName.trim(), requester_email: form.email.trim(),
      requester_phone: form.requesterPhone.trim() || null, message: form.message.trim() || null,
    })
    setLoading(false)
    if (insertError) setError("Impossible d’envoyer la demande pour le moment. Veuillez réessayer.")
    else setSubmitted(true)
  }

  if (submitted) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm border text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h1 className="mt-5 text-2xl font-bold">Demande envoyée</h1>
        <p className="mt-3 text-slate-600">Votre demande d’enregistrement a été transmise à l’administration générale. Vous serez contacté après validation.</p>
        <button className="mt-7 rounded-lg bg-slate-900 px-5 py-3 text-white" onClick={() => router.push("/connexion")}>Retour à la connexion</button>
      </section>
    </main>
  )

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => router.push("/connexion")} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Retour</button>
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <header className="border-b bg-slate-900 text-white p-6 sm:p-8">
            <Building2 size={30} />
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold">Enregistrer un établissement</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Soumettez une demande. L’administration générale vérifiera les informations avant de créer l’établissement et son accès administrateur.</p>
          </header>
          <form onSubmit={submit} className="p-6 sm:p-8 space-y-8">
            <fieldset className="space-y-4"><legend className="text-lg font-semibold">Établissement</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de l’établissement *" value={form.establishmentName} onChange={v => update("establishmentName", v)} />
                <Field label="Type d’établissement" value={form.establishmentType} onChange={v => update("establishmentType", v)} placeholder="Primaire, collège, lycée…" />
                <Field label="Pays" value={form.country} onChange={v => update("country", v)} />
                <Field label="Ville" value={form.city} onChange={v => update("city", v)} />
                <Field label="Téléphone de l’établissement" value={form.phone} onChange={v => update("phone", v)} />
                <Field label="Email de l’établissement" type="email" value={form.establishmentEmail} onChange={v => update("establishmentEmail", v)} />
              </div>
              <Field label="Adresse" value={form.address} onChange={v => update("address", v)} />
            </fieldset>
            <fieldset className="space-y-4"><legend className="text-lg font-semibold">Responsable de la demande</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Prénom *" value={form.firstName} onChange={v => update("firstName", v)} />
                <Field label="Nom *" value={form.lastName} onChange={v => update("lastName", v)} />
                <Field label="Email *" type="email" value={form.email} onChange={v => update("email", v)} />
                <Field label="Téléphone" value={form.requesterPhone} onChange={v => update("requesterPhone", v)} />
              </div>
              <label className="block text-sm font-medium">Message / précision<textarea className="mt-1 w-full rounded-lg border p-3 min-h-24" value={form.message} onChange={e => update("message", e.target.value)} /></label>
            </fieldset>
            {error && <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <button disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-60" type="submit">{loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />} {loading ? "Envoi…" : "Envoyer la demande"}</button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block text-sm font-medium">{label}<input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-300" /></label>
}
