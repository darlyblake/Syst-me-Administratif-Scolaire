"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Building2, Users, CreditCard, Settings, LogOut, Plus, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthentification } from "@/providers/authentification.provider"
import { supabaseBrowser } from "@/lib/supabase/client"

export default function AdminDashboard() {
  const { utilisateur, deconnecter } = useAuthentification()
  const [schools, setSchools] = useState<Array<{ id: string; name: string; code: string | null; status: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", code: "" })

  const loadSchools = async () => {
    setLoading(true)
    const { data } = await supabaseBrowser.from("establishments").select("id,name,code,status").order("created_at", { ascending: false })
    setSchools(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadSchools() }, [])

  const createSchool = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    if (!form.name.trim()) return setMessage("Le nom de l'établissement est obligatoire.")
    setSaving(true)
    const code = form.code.trim().toUpperCase() || `ECOLE-${Date.now().toString().slice(-6)}`
    const { error } = await supabaseBrowser.from("establishments").insert({ name: form.name.trim(), code, status: "active" })
    setSaving(false)
    if (error) return setMessage(error.message)
    setForm({ name: "", code: "" })
    setMessage("Établissement créé avec succès.")
    await loadSchools()
  }

  return (
    <div className="min-h-screen bg-creme p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Administration générale</p>
            <h1 className="text-2xl font-bold text-gray-900">Gestion de la plateforme</h1>
            <p className="text-sm text-gray-600">Créez et gérez les établissements autorisés à utiliser le système.</p>
          </div>
          <Button variant="outline" onClick={() => deconnecter()}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Créer une école</CardTitle>
              <CardDescription>Ajoutez directement un établissement à la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createSchool} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="school-name">Nom de l'établissement *</Label><Input id="school-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex. Complexe Scolaire La Réussite" /></div>
                <div className="space-y-2"><Label htmlFor="school-code">Code établissement</Label><Input id="school-code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex. CSR001" /></div>
                <Button type="submit" className="w-full" disabled={saving}>{saving ? "Création..." : "Créer l'établissement"}</Button>
                {message && <p className="text-sm text-gray-600" role="status">{message}</p>}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Établissements</CardTitle><CardDescription>Écoles actuellement enregistrées.</CardDescription></div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">{schools.length}</span>
            </CardHeader>
            <CardContent>
              {loading ? <p className="py-8 text-center text-sm text-gray-500">Chargement...</p> : schools.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-gray-400" /><p className="font-medium">Aucun établissement</p><p className="mt-1 text-sm text-gray-500">Utilisez le formulaire pour créer la première école.</p></div> : <div className="space-y-3">{schools.map(school => <div key={school.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{school.name}</p><p className="text-sm text-gray-500">Code : {school.code || "—"}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">{school.status === "active" ? "Actif" : "Inactif"}</span><Button size="sm" variant="outline" asChild><Link href={`/admin/ecoles/${school.id}`}>Gérer <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>)}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Utilisateurs</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><Link href="/admin/utilisateurs"><Users className="mr-2 h-4 w-4" />Gérer</Link></Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Abonnements</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><Link href="/admin/abonnements"><CreditCard className="mr-2 h-4 w-4" />Gérer</Link></Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Paramètres</CardTitle></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><Link href="/admin/parametres"><Settings className="mr-2 h-4 w-4" />Configurer</Link></Button></CardContent></Card></div>
      </div>
    </div>
  )
}
