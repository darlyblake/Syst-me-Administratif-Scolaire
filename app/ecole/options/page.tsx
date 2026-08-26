"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Edit, Trash2, Utensils, Bus, Shirt, Shield, Activity, Coffee } from "lucide-react"
import Link from "next/link"
import { serviceOptions } from "@/services/options.service"
import type { OptionScolaire } from "@/services/options.service"

const TYPE_OPTIONS = [
  { value: "cantine", label: "Cantine", icon: Utensils },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "tenue", label: "Tenue", icon: Shirt },
  { value: "assurance", label: "Assurance", icon: Shield },
  { value: "activite_parascolaire", label: "Activité parascolaire", icon: Activity },
  { value: "cooperative", label: "Coopérative", icon: Coffee }
] as const

export default function OptionsPage() {
  const [options, setOptions] = useState<OptionScolaire[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState("tous")
  const [nouvelleOption, setNouvelleOption] = useState({
    nom: "",
    type: "cantine" as OptionScolaire["type"],
    prix: 0,
    description: "",
    obligatoire: false,
    actif: true
  })

  useEffect(() => {
    serviceOptions.initialiserOptionsParDefaut()
    setOptions(serviceOptions.obtenirToutesLesOptions())
  }, [])

  const handleAjouterOption = () => {
    if (!nouvelleOption.nom || nouvelleOption.prix <= 0) {
      alert("Veuillez remplir le nom et le prix")
      return
    }

    serviceOptions.creerOption(nouvelleOption)
    setOptions(serviceOptions.obtenirToutesLesOptions())
    setShowAddModal(false)
    setNouvelleOption({
      nom: "",
      type: "cantine",
      prix: 0,
      description: "",
      obligatoire: false,
      actif: true
    })
  }

  const handleSupprimerOption = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette option ?")) {
      serviceOptions.supprimerOption(id)
      setOptions(serviceOptions.obtenirToutesLesOptions())
    }
  }

  const handleActiverDesactiver = (id: string, actif: boolean) => {
    serviceOptions.mettreAJourOption(id, { actif })
    setOptions(serviceOptions.obtenirToutesLesOptions())
  }

  const filteredOptions = filterType === "tous" 
    ? options 
    : options.filter(o => o.type === filterType)

  const getTypeIcon = (type: OptionScolaire["type"]) => {
    const typeOption = TYPE_OPTIONS.find(t => t.value === type)
    if (!typeOption) return null
    const Icon = typeOption.icon
    return <Icon className="h-5 w-5" />
  }

  const getTypeLabel = (type: OptionScolaire["type"]) => {
    return TYPE_OPTIONS.find(t => t.value === type)?.label || type
  }

  const totalOptions = options.length
  const optionsActives = options.filter(o => o.actif).length
  const coutMoyen = options.length > 0 
    ? Math.round(options.reduce((sum, o) => sum + o.prix, 0) / options.length) 
    : 0

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Gestion des Options Scolaires
            </h1>
            <p className="text-gray-600">Cantine, transport, tenue, assurance, activités</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total options</p>
              <p className="text-2xl font-bold">{totalOptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Options actives</p>
              <p className="text-2xl font-bold text-green-600">{optionsActives}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Coût moyen</p>
              <p className="text-2xl font-bold text-blue-600">{coutMoyen.toLocaleString()} FCFA</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle option
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des options */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Options</CardTitle>
            <CardDescription>{filteredOptions.length} option(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredOptions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune option trouvée</p>
              ) : (
                filteredOptions.map((option) => (
                  <div key={option.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(option.type)}
                      </div>
                      <div>
                        <p className="font-semibold">{option.nom}</p>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {getTypeLabel(option.type)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            option.obligatoire ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {option.obligatoire ? 'Obligatoire' : 'Optionnel'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            option.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {option.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-lg">{option.prix.toLocaleString()} FCFA</p>
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleActiverDesactiver(option.id, !option.actif)}
                        >
                          {option.actif ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleSupprimerOption(option.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Nouvelle Option</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={nouvelleOption.nom}
                    onChange={(e) => setNouvelleOption({ ...nouvelleOption, nom: e.target.value })}
                    placeholder="Ex: Cantine - Repas complet"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={nouvelleOption.type} onValueChange={(value) => setNouvelleOption({ ...nouvelleOption, type: value as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prix">Prix (FCFA) *</Label>
                  <Input
                    id="prix"
                    type="number"
                    value={nouvelleOption.prix}
                    onChange={(e) => setNouvelleOption({ ...nouvelleOption, prix: parseInt(e.target.value) || 0 })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={nouvelleOption.description}
                    onChange={(e) => setNouvelleOption({ ...nouvelleOption, description: e.target.value })}
                    placeholder="Description de l'option"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="obligatoire"
                    checked={nouvelleOption.obligatoire}
                    onChange={(e) => setNouvelleOption({ ...nouvelleOption, obligatoire: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="obligatoire">Obligatoire</Label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterOption} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
