"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import { ProtectionRoute } from "@/components/protection-route"
import type { DonneesEnseignant } from "@/types/models"

type Statut = "actif" | "inactif" | "conge" | "suspendu"

export default function AjouterEnseignantPage() {
  // === ÉTAT DU FORMULAIRE ===
  const [form, setForm] = useState<{
    prenom: string
    nom: string
    email: string
    telephone: string
    identifiant: string
    dateEmbauche: string
    dateNaissance: string
    matieres: string
    classes: string
    statut: Statut
  }>({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    identifiant: "",
    dateEmbauche: "",
    dateNaissance: "",
    matieres: "",
    classes: "",
    statut: "actif",
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!form.prenom || !form.nom || !form.email || !form.dateNaissance) {
      alert("Veuillez remplir au moins le prénom, le nom, l'email et la date de naissance.")
      return
    }

    const nouvelEnseignant: Omit<DonneesEnseignant, "id" | "motDePasse"> = {
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone,
      identifiant: form.identifiant,
      dateEmbauche: form.dateEmbauche,
      dateNaissance: form.dateNaissance,
      matieres: form.matieres.split(",").map((m) => m.trim()),
      classes: form.classes.split(",").map((c) => c.trim()),
      statut: form.statut, // ✅ Typé correctement
    }

    serviceEnseignants.ajouterEnseignant(nouvelEnseignant)
    alert("Enseignant ajouté avec succès !")

    setForm({
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      identifiant: "",
      dateEmbauche: "",
      dateNaissance: "",
      matieres: "",
      classes: "",
      statut: "actif",
    })
  }

  return (
    <ProtectionRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/enseignants">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Ajouter un Enseignant</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations de l'enseignant</CardTitle>
              <CardDescription>Remplissez les informations nécessaires pour ajouter un nouvel enseignant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={form.prenom} onChange={(e) => handleChange("prenom", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={form.nom} onChange={(e) => handleChange("nom", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.telephone} onChange={(e) => handleChange("telephone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Identifiant</Label>
                  <Input value={form.identifiant} onChange={(e) => handleChange("identifiant", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date d'embauche</Label>
                  <Input type="date" value={form.dateEmbauche} onChange={(e) => handleChange("dateEmbauche", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date de naissance</Label>
                  <Input type="date" value={form.dateNaissance} onChange={(e) => handleChange("dateNaissance", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Matières (séparées par des virgules)</Label>
                  <Input value={form.matieres} onChange={(e) => handleChange("matieres", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Classes (séparées par des virgules)</Label>
                  <Input value={form.classes} onChange={(e) => handleChange("classes", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={form.statut} onValueChange={(value) => handleChange("statut", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="conge">En congé</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectionRoute>
  )
}
