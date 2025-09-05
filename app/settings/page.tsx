"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Settings, Calendar, DollarSign, RotateCcw } from "lucide-react"
import Link from "next/link"
import { serviceParametres } from "@/services/parametres.service"
import type { ParametresEcole, TarificationClasse, OptionsSupplementaires } from "@/services/parametres.service"

export default function SettingsPage() {
  const [settings, setSettings] = useState<ParametresEcole>({
    anneeAcademique: "2024-2025",
    dateDebut: "2024-09-01",
    dateFin: "2025-07-31",
    nomEcole: "COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO",
    adresseEcole: "B.P: 16109 Estuaire, Owendo",
    telephoneEcole: "077947410",
    nomDirecteur: "M. DIRECTEUR",
    modePaiement: "les_deux",
  })

  const [pricing, setPricing] = useState<TarificationClasse[]>([])
  const [optionsSupplementaires, setOptionsSupplementaires] = useState<OptionsSupplementaires>({
    tenueScolaire: 15000,
    carteScolaire: 5000,
    cooperative: 10000,
    tenueEPS: 8000,
    assurance: 12000,
  })
  const [nouvelleClasse, setNouvelleClasse] = useState("")
  const [fraisInscriptionNouvelle, setFraisInscriptionNouvelle] = useState(0)
  const [fraisScolariteNouvelle, setFraisScolariteNouvelle] = useState(0)

  useEffect(() => {
    const parametresCharges = serviceParametres.obtenirParametres()
    const tarificationChargee = serviceParametres.obtenirTarification()
    const optionsChargees = serviceParametres.obtenirOptionsSupplementaires()

    setSettings(parametresCharges)
    setPricing(tarificationChargee)
    setOptionsSupplementaires(optionsChargees)
  }, [])

  const handleSettingsChange = (field: keyof ParametresEcole, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handlePricingChange = (classe: string, field: "fraisInscription" | "fraisScolarite", value: number) => {
    setPricing((prev) => prev.map((p) => (p.classe === classe ? { ...p, [field]: value } : p)))
  }

  const handleOptionsChange = (option: keyof OptionsSupplementaires, value: number) => {
    setOptionsSupplementaires((prev) => ({ ...prev, [option]: value }))
  }

  const ajouterClasse = () => {
    if (nouvelleClasse.trim() && fraisInscriptionNouvelle > 0 && fraisScolariteNouvelle > 0) {
      const nouvelleClasseObj: TarificationClasse = {
        classe: nouvelleClasse.trim(),
        fraisInscription: fraisInscriptionNouvelle,
        fraisScolarite: fraisScolariteNouvelle,
      }
      setPricing((prev) => [...prev, nouvelleClasseObj])
      setNouvelleClasse("")
      setFraisInscriptionNouvelle(0)
      setFraisScolariteNouvelle(0)
    }
  }

  const supprimerClasse = (classe: string) => {
    setPricing((prev) => prev.filter((p) => p.classe !== classe))
  }

  const saveSettings = () => {
    try {
      serviceParametres.sauvegarderParametres(settings)
      serviceParametres.sauvegarderTarification(pricing)
      serviceParametres.sauvegarderOptionsSupplementaires(optionsSupplementaires)
      alert("Paramètres sauvegardés avec succès !")
    } catch (error) {
      alert("Erreur lors de la sauvegarde: " + (error as Error).message)
    }
  }

  const resetSettings = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?")) {
      try {
        serviceParametres.reinitialiserParametres()
        const parametresDefaut = serviceParametres.obtenirParametres()
        const tarificationDefaut = serviceParametres.obtenirTarification()
        setSettings(parametresDefaut)
        setPricing(tarificationDefaut)
        alert("Paramètres réinitialisés avec succès !")
      } catch (error) {
        alert("Erreur lors de la réinitialisation: " + (error as Error).message)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Paramètres du Système
                </h1>
                <p className="text-gray-600">Configuration de l'établissement et des tarifs</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="academic">Année académique</TabsTrigger>
            <TabsTrigger value="pricing">Tarification</TabsTrigger>
            <TabsTrigger value="options">Options supplémentaires</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'établissement</CardTitle>
                <CardDescription>Paramètres généraux de l'école</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomEcole">Nom de l'établissement</Label>
                    <Input
                      id="nomEcole"
                      value={settings.nomEcole}
                      onChange={(e) => handleSettingsChange("nomEcole", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomDirecteur">Nom du directeur</Label>
                    <Input
                      id="nomDirecteur"
                      value={settings.nomDirecteur}
                      onChange={(e) => handleSettingsChange("nomDirecteur", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresseEcole">Adresse complète</Label>
                  <Input
                    id="adresseEcole"
                    value={settings.adresseEcole}
                    onChange={(e) => handleSettingsChange("adresseEcole", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephoneEcole">Téléphone</Label>
                  <Input
                    id="telephoneEcole"
                    value={settings.telephoneEcole}
                    onChange={(e) => handleSettingsChange("telephoneEcole", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modePaiement">Mode de paiement autorisé</Label>
                  <Select
                    value={settings.modePaiement}
                    onValueChange={(value) => handleSettingsChange("modePaiement", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel uniquement</SelectItem>
                      <SelectItem value="trimestriel">Par trimestre uniquement</SelectItem>
                      <SelectItem value="les_deux">Mensuel et trimestriel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Année académique
                </CardTitle>
                <CardDescription>Configuration de l'année scolaire</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="anneeAcademique">Année académique</Label>
                  <Input
                    id="anneeAcademique"
                    value={settings.anneeAcademique}
                    onChange={(e) => handleSettingsChange("anneeAcademique", e.target.value)}
                    placeholder="2024-2025"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateDebut">Date de début</Label>
                    <Input
                      id="dateDebut"
                      type="date"
                      value={settings.dateDebut}
                      onChange={(e) => handleSettingsChange("dateDebut", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFin">Date de fin</Label>
                    <Input
                      id="dateFin"
                      type="date"
                      value={settings.dateFin}
                      onChange={(e) => handleSettingsChange("dateFin", e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Informations calculées</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>
                      Durée de l'année:{" "}
                      {Math.ceil(
                        (new Date(settings.dateFin).getTime() - new Date(settings.dateDebut).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      jours
                    </div>
                    <div>
                      Nombre de mois:{" "}
                      {Math.ceil(
                        (new Date(settings.dateFin).getTime() - new Date(settings.dateDebut).getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tarification par classe
                </CardTitle>
                <CardDescription>Définir les frais d'inscription et de scolarité pour chaque niveau</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Liste des classes existantes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Classes existantes</h3>
                    {pricing.map((classPrice) => (
                      <div key={classPrice.classe} className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg items-end">
                        <div className="flex items-center">
                          <Label className="font-medium">{classPrice.classe}</Label>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Frais d'inscription (FCFA)</Label>
                          <Input
                            type="number"
                            value={classPrice.fraisInscription}
                            onChange={(e) =>
                              handlePricingChange(
                                classPrice.classe,
                                "fraisInscription",
                                Number.parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Frais de scolarité (FCFA)</Label>
                          <Input
                            type="number"
                            value={classPrice.fraisScolarite}
                            onChange={(e) =>
                              handlePricingChange(
                                classPrice.classe,
                                "fraisScolarite",
                                Number.parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => supprimerClasse(classPrice.classe)}
                            className="w-full"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ajouter une nouvelle classe */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium mb-4">Ajouter une nouvelle classe</h3>
                    <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg items-end">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Nom de la classe</Label>
                        <Input
                          value={nouvelleClasse}
                          onChange={(e) => setNouvelleClasse(e.target.value)}
                          placeholder="Ex: 1ère A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Frais d'inscription</Label>
                        <Input
                          type="number"
                          value={fraisInscriptionNouvelle || ""}
                          onChange={(e) => setFraisInscriptionNouvelle(Number.parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Frais de scolarité</Label>
                        <Input
                          type="number"
                          value={fraisScolariteNouvelle || ""}
                          onChange={(e) => setFraisScolariteNouvelle(Number.parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Button
                          onClick={ajouterClasse}
                          disabled={!nouvelleClasse.trim() || fraisInscriptionNouvelle <= 0 || fraisScolariteNouvelle <= 0}
                          className="w-full"
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Règles de tarification</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• Réduction de 50% sur les frais d'inscription pour les réinscriptions</div>
                    <div>• Remise de 5% pour paiement comptant de la scolarité</div>
                    <div>• Paiement échelonné possible selon le mode configuré</div>
                    <div>• Frais d'inscription obligatoires à l'inscription</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Options supplémentaires
                </CardTitle>
                <CardDescription>Définir les prix des options supplémentaires pour les élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tenue scolaire</Label>
                      <Input
                        type="number"
                        value={optionsSupplementaires.tenueScolaire}
                        onChange={(e) => handleOptionsChange("tenueScolaire", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Carte scolaire</Label>
                      <Input
                        type="number"
                        value={optionsSupplementaires.carteScolaire}
                        onChange={(e) => handleOptionsChange("carteScolaire", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Coopérative</Label>
                      <Input
                        type="number"
                        value={optionsSupplementaires.cooperative}
                        onChange={(e) => handleOptionsChange("cooperative", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tenue EPS</Label>
                      <Input
                        type="number"
                        value={optionsSupplementaires.tenueEPS}
                        onChange={(e) => handleOptionsChange("tenueEPS", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assurance</Label>
                      <Input
                        type="number"
                        value={optionsSupplementaires.assurance}
                        onChange={(e) => handleOptionsChange("assurance", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Informations sur les options</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• Ces options sont facultatives et peuvent être choisies lors de l'inscription</div>
                    <div>• Les prix sont en FCFA et s'ajoutent aux frais d'inscription et de scolarité</div>
                    <div>• Les options peuvent être modifiées à tout moment dans les paramètres</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
