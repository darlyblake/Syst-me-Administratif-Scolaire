"use client"

import { FormEvent, useEffect, useState } from "react"
import { ArrowLeft, Loader2, Save, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherProfile } from "@/services/enseignant-portal.service"

export default function ProfilEnseignantPage() {
  const router = useRouter(); const { utilisateur, estEnCoursDeChargement } = useAuthentification()
  const [profile, setProfile] = useState<TeacherProfile | null>(null); const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [phone, setPhone] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/"); else if (!estEnCoursDeChargement) void enseignantPortalService.getProfile().then((rows) => { const p = rows[0] ?? null; setProfile(p); setFirstName(p?.first_name ?? ""); setLastName(p?.last_name ?? ""); setPhone(p?.phone ?? "") }).catch((e) => setError(e instanceof Error ? e.message : "Impossible de charger le profil.")).finally(() => setLoading(false)) }, [estEnCoursDeChargement, utilisateur, router])
  const save = async (event: FormEvent) => { event.preventDefault(); if (!firstName.trim() || !lastName.trim()) { setError("Le prénom et le nom sont obligatoires."); return }; setSaving(true); setError(null); setMessage(null); try { const ok = await enseignantPortalService.updateProfile(firstName, lastName, phone); if (!ok) throw new Error("La mise à jour du profil n'a pas été effectuée."); setProfile((p) => p ? { ...p, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null } : p); setMessage("Profil mis à jour.") } catch (e) { setError(e instanceof Error ? e.message : "Impossible de mettre à jour le profil.") } finally { setSaving(false) } }
  if (estEnCoursDeChargement || !utilisateur || loading) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  return <main className="min-h-screen bg-creme"><div className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><Button variant="ghost" size="sm" onClick={() => router.push("/enseignant")}><ArrowLeft className="mr-2 h-4 w-4" />Retour à mon espace</Button><div className="mb-6 mt-5"><p className="text-xs font-medium uppercase tracking-wide text-terre">Espace enseignant</p><h1 className="text-2xl font-semibold">Mon profil</h1><p className="mt-1 text-sm text-muted-foreground">Vos informations personnelles et professionnelles.</p></div>
    {error && <div className="mb-4 rounded-lg border p-4 text-sm text-rouge-terre">{error}</div>}{message && <div className="mb-4 rounded-lg border p-4 text-sm">{message}</div>}
    <form onSubmit={save}><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound className="h-4 w-4" />Informations personnelles</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Prénom</span><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label><label className="space-y-1 text-sm"><span>Nom</span><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label><label className="space-y-1 text-sm sm:col-span-2"><span>Téléphone</span><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" /></label></CardContent></Card>
      <Card className="mt-4"><CardHeader><CardTitle className="text-base">Informations professionnelles</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Matricule" value={profile?.employee_number ?? "—"} /><Field label="Spécialité" value={profile?.specialty ?? "—"} /><Field label="E-mail" value={profile?.email ?? "—"} /><Field label="Date d'embauche" value={profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString("fr-FR") : "—"} /></CardContent></Card>
      <div className="mt-5 flex justify-end"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer</Button></div>
    </form></div></main>
}
function Field({ label, value }: { label: string; value: string }) { return <div className="space-y-1 text-sm"><p className="text-muted-foreground">{label}</p><p className="rounded-md border bg-muted/20 px-3 py-2">{value}</p></div> }
