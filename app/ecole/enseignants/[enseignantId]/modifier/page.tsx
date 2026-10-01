"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuthentification } from "@/providers/authentification.provider"
import { obtenirEnseignantsSupabase, modifierEnseignantSupabase } from "@/services/enseignants.supabase.service"
import type { DonneesEnseignant } from "@/types/models"
import { ArrowLeft, Save, User, Briefcase } from "lucide-react"

interface ModifierEnseignantPageProps {
  params: Promise<{ enseignantId: string }>
}

type Statut = "actif" | "inactif" | "conge" | "suspendu"

export default function ModifierEnseignantPage({ params }: ModifierEnseignantPageProps) {
  const router = useRouter()
  const { etablissementActif } = useAuthentification()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [enseignantId, setEnseignantId] = useState("")
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    statut: "actif" as Statut,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { enseignantId: id } = await params
        if (cancelled) return
        setEnseignantId(id)

        if (!etablissementActif?.id) {
          setError("Aucun établissement actif n'est sélectionné.")
          return
        }

        const enseignants = await obtenirEnseignantsSupabase(etablissementActif.id)
        const found = enseignants.find((item) => item.id === id)

        if (!found) {
          setError("Enseignant introuvable dans l'établissement actif.")
          return
        }

        if (cancelled) return
        setEnseignant(found)
        setFormData({
          nom: found.nom,
          prenom: found.prenom,
          email: found.email ?? "",
          telephone: found.telephone ?? "",
          statut: found.statut,
        })
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger l'enseignant.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [params, etablissementActif?.id])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!enseignant || !etablissementActif?.id) return

    setSaving(true)
    setError(null)

    try {
      await modifierEnseignantSupabase(enseignant.id, {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        statut: formData.statut,
      }, etablissementActif.id)

      router.push(`/ecole/enseignants/${enseignant.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'enregistrer les modifications.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Chargement des informations...</p></div>
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">Enseignant introuvable</h1>
          <p className="text-muted-foreground mb-6">{error ?? "Cet enseignant n'est pas disponible dans l'établissement actif."}</p>
          <Button onClick={() => router.push("/ecole/enseignants")}>Retour aux enseignants</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push(`/ecole/enseignants/${enseignant.id}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />Retour au profil
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-7 w-7 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Modifier l'enseignant</h1>
            <p className="text-muted-foreground">{enseignant.prenom} {enseignant.nom}</p>
          </div>
          <Badge className="ml-auto">{enseignant.statut}</Badge>
        </div>

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Informations personnelles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="nom">Nom</Label><Input id="nom" value={formData.nom} onChange={(e) => setFormData((p) => ({ ...p, nom: e.target.value }))} required /></div>
              <div><Label htmlFor="prenom">Prénom</Label><Input id="prenom" value={formData.prenom} onChange={(e) => setFormData((p) => ({ ...p, prenom: e.target.value }))} required /></div>
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><Label htmlFor="telephone">Téléphone</Label><Input id="telephone" value={formData.telephone} onChange={(e) => setFormData((p) => ({ ...p, telephone: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Statut</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="statut">Statut de l'enseignant</Label>
              <Select value={formData.statut} onValueChange={(value) => setFormData((p) => ({ ...p, statut: value as Statut }))}>
                <SelectTrigger id="statut"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                  <SelectItem value="conge">En congé</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">Les classes et matières sont gérées depuis « Assigner des classes » afin d'éviter les affectations incohérentes.</p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/ecole/enseignants/${enseignant.id}`)}>Annuler</Button>
            <Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
