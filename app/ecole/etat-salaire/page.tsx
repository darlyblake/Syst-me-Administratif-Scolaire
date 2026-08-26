"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, DollarSign, CheckCircle, Plus, Trash2, Download } from "lucide-react"
import Link from "next/link"
import { serviceEtatSalaire } from "@/services/etat-salaire.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { EtatSalaire } from "@/services/etat-salaire.service"

export default function EtatSalairePage() {
  const [etats, setEtats] = useState<EtatSalaire[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>("")
  const [periodeDebut, setPeriodeDebut] = useState("")
  const [periodeFin, setPeriodeFin] = useState("")
  const [salaireBase, setSalaireBase] = useState("")
  const [heuresSupplementaires, setHeuresSupplementaires] = useState("")
  const [tauxHeureSupp, setTauxHeureSupp] = useState("")
  const [primes, setPrimes] = useState("")
  const [deductions, setDeductions] = useState("")
  const [filterStatut, setFilterStatut] = useState("tous")

  useEffect(() => {
    setEtats(serviceEtatSalaire.obtenirTousLesEtats())
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }, [])

  const handleGenererAutomatiquement = () => {
    if (!periodeDebut || !periodeFin) {
      alert("Veuillez sélectionner la période de début et de fin")
      return
    }

    serviceEtatSalaire.genererEtatsAutomatiques(periodeDebut, periodeFin)
    setEtats(serviceEtatSalaire.obtenirTousLesEtats())
    setShowAutoGenerateModal(false)
    setPeriodeDebut("")
    setPeriodeFin("")
  }

  const handleAjouterEtat = () => {
    if (!selectedPersonnel || !periodeDebut || !periodeFin || !salaireBase) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    const heuresSupp = parseFloat(heuresSupplementaires || "0")
    const tauxSupp = parseFloat(tauxHeureSupp || "0")
    const montantHeuresSupp = heuresSupp * tauxSupp

    serviceEtatSalaire.creerEtat({
      personnelId: selectedPersonnel,
      periodeDebut,
      periodeFin,
      salaireBase: parseFloat(salaireBase),
      heuresSupplementaires: heuresSupp,
      tauxHeureSupp: tauxSupp,
      montantHeuresSupp,
      primes: parseFloat(primes || "0"),
      deductions: parseFloat(deductions || "0"),
      statut: "brouillon",
      modeGeneration: "manuel"
    })

    setEtats(serviceEtatSalaire.obtenirTousLesEtats())
    setShowAddModal(false)
    setSelectedPersonnel("")
    setPeriodeDebut("")
    setPeriodeFin("")
    setSalaireBase("")
    setHeuresSupplementaires("")
    setTauxHeureSupp("")
    setPrimes("")
    setDeductions("")
  }

  const handleValiderEtat = (id: string) => {
    serviceEtatSalaire.validerEtat(id)
    setEtats(serviceEtatSalaire.obtenirTousLesEtats())
  }

  const handleMarquerPaye = (id: string) => {
    serviceEtatSalaire.marquerPaye(id)
    setEtats(serviceEtatSalaire.obtenirTousLesEtats())
  }

  const handleSupprimerEtat = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet état de salaire ?")) {
      serviceEtatSalaire.supprimerEtat(id)
      setEtats(serviceEtatSalaire.obtenirTousLesEtats())
    }
  }

  const handleTelecharger = (etat: EtatSalaire) => {
    const membre = personnel.find(p => p.id === etat.personnelId)
    const nom = membre ? `${membre.prenom} ${membre.nom}` : "Inconnu"
    
    const contenu = `
ÉTAT DE SALAIRE
================

Employé: ${nom}
Période: du ${new Date(etat.periodeDebut).toLocaleDateString()} au ${new Date(etat.periodeFin).toLocaleDateString()}
Date de génération: ${new Date(etat.dateGeneration).toLocaleDateString()}

DÉTAILS
-------
Salaire de base: ${etat.salaireBase.toLocaleString()} FCFA
Heures supplémentaires: ${etat.heuresSupplementaires}h à ${etat.tauxHeureSupp} FCFA/h
Montant heures supp: ${etat.montantHeuresSupp.toLocaleString()} FCFA
Primes: ${etat.primes.toLocaleString()} FCFA
Déductions: ${etat.deductions.toLocaleString()} FCFA

SALAIRE NET: ${etat.salaireNet.toLocaleString()} FCFA

Statut: ${etat.statut}
${etat.datePaiement ? `Date de paiement: ${new Date(etat.datePaiement).toLocaleDateString()}` : ''}
    `.trim()

    const blob = new Blob([contenu], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `etat-salaire-${nom}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredEtats = etats.filter(etat => {
    const matchStatut = filterStatut === "tous" || etat.statut === filterStatut
    return matchStatut
  })

  const getPersonnelNom = (personnelId: string) => {
    const membre = personnel.find(p => p.id === personnelId)
    return membre ? `${membre.prenom} ${membre.nom}` : "Inconnu"
  }

  const getStatutIcon = (statut: EtatSalaire["statut"]) => {
    switch (statut) {
      case "valide":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "paye":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const statistiques = serviceEtatSalaire.obtenirStatistiques()

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
              <DollarSign className="h-6 w-6" />
              États de Salaire
            </h1>
            <p className="text-gray-600">Gestion des fiches de paie</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Masse salariale</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.totalMasse.toLocaleString()} FCFA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total états</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Payés</p>
              <p className="text-2xl font-bold text-blue-600">{statistiques.parStatut.paye || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel état
              </Button>
              <Button onClick={() => setShowAutoGenerateModal(true)} className="ml-2">
                <Download className="h-4 w-4 mr-2" />
                Générer automatiquement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des états */}
        <Card>
          <CardHeader>
            <CardTitle>États de Salaire</CardTitle>
            <CardDescription>{filteredEtats.length} état(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredEtats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun état de salaire</p>
              ) : (
                filteredEtats.map((etat) => (
                  <div key={etat.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getStatutIcon(etat.statut)}
                      </div>
                      <div>
                        <p className="font-semibold">{getPersonnelNom(etat.personnelId)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(etat.periodeDebut).toLocaleDateString()} - {new Date(etat.periodeFin).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            Net: {etat.salaireNet.toLocaleString()} FCFA
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            Base: {etat.salaireBase.toLocaleString()} FCFA
                          </span>
                          {etat.heuresSupplementaires > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                              +{etat.heuresSupplementaires}h supp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleTelecharger(etat)}>
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                      {etat.statut === "brouillon" && (
                        <Button variant="outline" size="sm" onClick={() => handleValiderEtat(etat.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valider
                        </Button>
                      )}
                      {etat.statut === "valide" && (
                        <Button variant="outline" size="sm" onClick={() => handleMarquerPaye(etat.id)}>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Marquer payé
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimerEtat(etat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Nouvel État de Salaire</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personnel">Employé *</Label>
                  <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="periodeDebut">Début période *</Label>
                    <Input
                      id="periodeDebut"
                      type="date"
                      value={periodeDebut}
                      onChange={(e) => setPeriodeDebut(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="periodeFin">Fin période *</Label>
                    <Input
                      id="periodeFin"
                      type="date"
                      value={periodeFin}
                      onChange={(e) => setPeriodeFin(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaireBase">Salaire de base (FCFA) *</Label>
                  <Input
                    id="salaireBase"
                    type="number"
                    value={salaireBase}
                    onChange={(e) => setSalaireBase(e.target.value)}
                    placeholder="150000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heuresSupp">Heures supp.</Label>
                    <Input
                      id="heuresSupp"
                      type="number"
                      value={heuresSupplementaires}
                      onChange={(e) => setHeuresSupplementaires(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tauxSupp">Taux horaire (FCFA)</Label>
                    <Input
                      id="tauxSupp"
                      type="number"
                      value={tauxHeureSupp}
                      onChange={(e) => setTauxHeureSupp(e.target.value)}
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primes">Primes (FCFA)</Label>
                    <Input
                      id="primes"
                      type="number"
                      value={primes}
                      onChange={(e) => setPrimes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductions">Déductions (FCFA)</Label>
                    <Input
                      id="deductions"
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterEtat} className="flex-1">
                  Créer
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de génération automatique */}
        {showAutoGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Générer Automatiquement</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="autoPeriodeDebut">Début période *</Label>
                  <Input
                    id="autoPeriodeDebut"
                    type="date"
                    value={periodeDebut}
                    onChange={(e) => setPeriodeDebut(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoPeriodeFin">Fin période *</Label>
                  <Input
                    id="autoPeriodeFin"
                    type="date"
                    value={periodeFin}
                    onChange={(e) => setPeriodeFin(e.target.value)}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Cette action générera automatiquement les états de salaire pour tout le personnel actif en fonction de leur mode de rémunération (fixe ou horaire) et de leurs heures de pointage.
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleGenererAutomatiquement} className="flex-1">
                  Générer
                </Button>
                <Button variant="outline" onClick={() => setShowAutoGenerateModal(false)} className="flex-1">
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
