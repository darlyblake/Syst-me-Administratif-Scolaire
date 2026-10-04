"use client"

import { FormEvent, useEffect, useState } from "react"
import { Check, Copy, KeyRound, Loader2, LogOut, Save, ShieldCheck, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherProfile } from "@/services/enseignant-portal.service"
import { servicePointage } from "@/services/pointage.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function ProfilEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement, deconnecter } = useAuthentification()
  const establishment = contexte?.establishments?.[0]
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [pointageCode, setPointageCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) {
      router.replace("/")
      return
    }
    if (!estEnCoursDeChargement) {
      void enseignantPortalService.getProfile().then((rows) => {
        const p = rows[0] ?? null
        setProfile(p)
        setFirstName(p?.first_name ?? "")
        setLastName(p?.last_name ?? "")
        setPhone(p?.phone ?? "")
      }).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger le profil.")).finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, router])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.")
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const ok = await enseignantPortalService.updateProfile(firstName, lastName, phone)
      if (!ok) throw new Error("La mise à jour du profil n'a pas été effectuée.")
      setProfile((p) => p ? { ...p, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null } : p)
      setMessage("Profil mis à jour.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de mettre à jour le profil.")
    } finally {
      setSaving(false)
    }
  }

  const generateCode = async () => {
    if (!establishment?.id) return
    setCodeLoading(true)
    setError(null)
    setCopied(false)
    try {
      const code = await servicePointage.genererMonCode(establishment.id)
      setPointageCode(code)
      setMessage("Votre code de pointage est prêt. Utilisez-le sur l'ordinateur de pointage de l'établissement.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de générer le code de pointage.")
    } finally {
      setCodeLoading(false)
    }
  }

  const copyCode = async () => {
    if (!pointageCode) return
    await navigator.clipboard?.writeText(pointageCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (estEnCoursDeChargement || !utilisateur || loading) {
    return <main className="min-h-screen bg-[#f8f8fc] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  }

  const content = (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-[#e4e6ef] pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Paramètres du compte</p>
        <h1 className="mt-1 text-2xl font-bold">Profil et sécurité</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Gérez vos informations, votre accès et votre code de pointage.</p>
      </header>

      {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-4 border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <section className="mt-6 border-b border-[#e4e6ef] pb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9edff] text-[#2441a5]"><UserRound className="h-6 w-6" /></div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{[firstName, lastName].filter(Boolean).join(" ") || "Enseignant"}</h2>
            <p className="text-sm text-[#6d7280]">{profile?.email ?? utilisateur.email ?? "Adresse e-mail non renseignée"}</p>
            <p className="mt-1 text-xs text-[#7a8190]">{profile?.employee_number ? "Matricule " + profile.employee_number : "Compte enseignant"}</p>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="border-b border-[#e4e6ef] py-6">
        <div className="mb-4">
          <h2 className="font-semibold">Informations personnelles</h2>
          <p className="mt-1 text-sm text-[#6d7280]">Ces informations sont utilisées dans votre dossier enseignant.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm"><span className="font-medium">Prénom</span><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
          <label className="space-y-1 text-sm"><span className="font-medium">Nom</span><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
          <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Téléphone</span><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" /></label>
        </div>
        <div className="mt-4 flex justify-end"><Button className="bg-[#0b2b83] hover:bg-[#09236d]" type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer</Button></div>
      </form>

      <section className="border-b border-[#e4e6ef] py-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-[#2944a8]"><KeyRound className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Code de pointage</h2>
            <p className="mt-1 text-sm text-[#6d7280]">Ce code vous identifie sur l'ordinateur de pointage de l'établissement. Il est personnel : ne le partagez pas.</p>
            {pointageCode ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-12 flex-1 items-center rounded-md border border-[#cbd3ee] bg-[#f3f5ff] px-4 font-mono text-xl font-bold tracking-[0.3em] text-[#1737a6]">{pointageCode}</div>
                <button type="button" onClick={() => void copyCode()} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#dfe2ec] bg-white px-4 text-sm font-medium hover:bg-[#f3f4f8]">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copié" : "Copier"}</button>
                <button type="button" onClick={() => void generateCode()} disabled={codeLoading} className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#dfe2ec] bg-white px-4 text-sm font-medium hover:bg-[#f3f4f8] disabled:opacity-50">{codeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Nouveau code</button>
              </div>
            ) : (
              <button type="button" onClick={() => void generateCode()} disabled={codeLoading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{codeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Afficher mon code de pointage</button>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e6ef] py-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#2944a8]" />
          <div><h2 className="font-semibold">Informations professionnelles</h2><div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Spécialité" value={profile?.specialty ?? "—"} /><Field label="Date d'embauche" value={profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString("fr-FR") : "—"} /><Field label="E-mail" value={profile?.email ?? utilisateur.email ?? "—"} /><Field label="Établissement" value={establishment?.name ?? "—"} /></div></div>
        </div>
      </section>

      <section className="py-6">
        <h2 className="font-semibold">Session</h2>
        <p className="mt-1 text-sm text-[#6d7280]">Vous êtes actuellement connecté en tant qu'enseignant.</p>
        <button type="button" onClick={() => void deconnecter()} className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />Se déconnecter</button>
      </section>
    </div>
  )

  return establishment ? <TeacherShell establishmentId={establishment.id} establishmentName={establishment.name} teacherName={[firstName, lastName].filter(Boolean).join(" ")} active="today">{content}</TeacherShell> : <main className="min-h-screen bg-[#f8f8fc] p-4 sm:p-6">{content}</main>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1 text-sm"><p className="text-[#6d7280]">{label}</p><p className="border border-[#dfe2ec] bg-[#f7f8fa] px-3 py-2">{value}</p></div>
}
