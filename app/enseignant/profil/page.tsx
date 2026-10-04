"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, Save, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherProfile } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function ProfilEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.[0]
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  if (estEnCoursDeChargement || !utilisateur || loading) return <main className="min-h-screen bg-[#f8f8fc] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>

  const content = (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Mon compte</p>
        <h1 className="mt-1 text-2xl font-bold">Mon profil</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Vos informations personnelles et professionnelles.</p>
      </header>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}

      <form onSubmit={save} className="mt-5">
        <Card className="rounded-md"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4" />Informations personnelles</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="font-medium">Prénom</span><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">Nom</span><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">Téléphone</span><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" /></label>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-md"><CardHeader><CardTitle className="text-base">Informations professionnelles</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Matricule" value={profile?.employee_number ?? "—"} />
            <Field label="Spécialité" value={profile?.specialty ?? "—"} />
            <Field label="E-mail" value={profile?.email ?? "—"} />
            <Field label="Date d'embauche" value={profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString("fr-FR") : "—"} />
          </CardContent>
        </Card>

        <div className="mt-5 flex justify-end"><Button className="bg-[#0b2b83] hover:bg-[#09236d]" type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer</Button></div>
      </form>
    </div>
  )

  return establishment ? <TeacherShell establishmentId={establishment.id} establishmentName={establishment.name} active="today">{content}</TeacherShell> : <main className="min-h-screen bg-[#f8f8fc] p-4 sm:p-6">{content}</main>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1 text-sm"><p className="text-[#6d7280]">{label}</p><p className="rounded-md border border-[#dfe2ec] bg-[#f7f8fa] px-3 py-2">{value}</p></div>
}
