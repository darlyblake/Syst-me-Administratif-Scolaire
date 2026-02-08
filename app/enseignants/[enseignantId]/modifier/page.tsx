"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"
import { ArrowLeft, Save, User, Mail, Phone, Calendar, MapPin } from "lucide-react"

interface ModifierEnseignantPageProps {
  params: Promise<{
    enseignantId: string
  }>
}

export default function ModifierEnseignantPage({ params }: ModifierEnseignantPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [enseignantId, setEnseignantId] = useState<string>("")
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    dateNaissance: "",
    adresse: "",
    matieres: [] as string[],
    classes: [] as string[],
    statut: "actif" as "actif" | "inactif" | "conge" | "suspendu"
  })

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      setEnseignantId(resolvedParams.enseignantId)
      chargerEnseignant(resolvedParams.enseignantId)
    }

    initializePage()
  }, [params])

  const chargerEnseignant = (id: string) => {
    try {
      const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
      const enseignantTrouve = enseignants.find((e: DonneesEnseignant) => e.id === id)

      if (enseignantTrouve) {
        setEnseignant(enseignantTrouve)
        setFormData({
          nom: enseignantTrouve.nom,
          prenom: enseignantTrouve.prenom,
          email: enseignantTrouve.email,
          telephone: enseignantTrouve.telephone || "",
          dateNaissance: enseignantTrouve.dateNaissance || "",
          adresse: enseignantTrouve.adresse || "",
          matieres: enseignantTrouve.matieres || [],
          classes: enseignantTrouve.classes || [],
          statut: enseignantTrouve.statut
        })
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'enseignant:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enseignant) return

    setSaving(true)
    try {
      const success = serviceEnseignants.mettreAJourEnseignant(enseignant.id, formData)
      if (success) {
        router.push(`/enseignants/${enseignant.id}`)
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: string, value: string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des informations...</p>
        </div>
      </div>
    )
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enseignant non trouvé</h1>
          <Button onClick={() => router.push("/enseignants")}>
            Retour à la liste
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/enseignants/${enseignant.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au profil
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Modifier l'enseignant
              </h1>
              <p className="text-gray-600">
                {enseignant.prenom} {enseignant.nom}
              </p>
            </div>
            <Badge className={
              enseignant.statut === "actif" ? "bg-green-100 text-green-800" :
              enseignant.statut === "inactif" ? "bg-red-100 text-red-800" :
              enseignant.statut === "conge" ? "bg-yellow-100 text-yellow-800" :
              "bg-gray-100 text-gray-800"
            }>
              {enseignant.statut}
            </Badge>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => handleInputChange("nom", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => handleInputChange("prenom", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange("telephone", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dateNaissance">Date de naissance</Label>
                  <Input
                    id="dateNaissance"
                    type="date"
                    value={formData.dateNaissance}
                    onChange={(e) => handleInputChange("dateNaissance", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => handleInputChange("adresse", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Informations professionnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informations professionnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="matieres">Matières enseignées</Label>
                  <Input
                    id="matieres"
                    value={formData.matieres.join(", ")}
                    onChange={(e) => handleArrayChange("matieres", e.target.value.split(", ").filter(m => m.trim()))}
                    placeholder="Ex: Mathématiques, Physique, Chimie..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Séparez les matières par des virgules
                  </p>
                </div>

                <div>
                  <Label htmlFor="classes">Classes assignées</Label>
                  <Input
                    id="classes"
                    value={formData.classes.join(", ")}
                    onChange={(e) => handleArrayChange("classes", e.target.value.split(", ").filter(c => c.trim()))}
                    placeholder="Ex: 6ème A, 5ème B, 4ème C..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Séparez les classes par des virgules
                  </p>
                </div>

                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={(value) => handleInputChange("statut", value)}>
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
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/enseignants/${enseignant.id}`)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
