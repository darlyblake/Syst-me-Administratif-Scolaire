"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clock, DollarSign, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { serviceHeuresVacataires } from "@/services/heures-vacataires.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { HeureVacataire } from "@/services/heures-vacataires.service"

export default function HeuresVacatairesPage() {
  const [heures, setHeures] = useState<HeureVacataire[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedVacataire, setSelectedVacataire] = useState<string>("")
  const [date, setDate] = useState("")
  const [heuresTravaillees, setHeuresTravaillees] = useState("")
  const [tauxHoraire, setTauxHoraire] = useState("")
  const [motif, setMotif] = useState("")
  const [classe, setClasse] = useState("")
  const [matiere, setMatiere] = useState("")
  const [filterStatut, setFilterStatut] = useState("tous")
  const [filterVacataire, setFilterVacataire] = useState("tous")

  useEffect(() => {
    setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }, [])

  const handleAjouterHeure = () => {
    if (!selectedVacataire || !date || !heuresTravaillees || !tauxHoraire) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    serviceHeuresVacataires.creerHeure({
      vacataireId: selectedVacataire,
      date,
      heuresTravaillees: parseFloat(heuresTravaillees),
      tauxHoraire: parseFloat(tauxHoraire),
      motif: motif || undefined,
      classe: classe || undefined,
      matiere: matiere || undefined,
      statut: "en_attente"
    })

    setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())
    setShowAddModal(false)
    setSelectedVacataire("")
    setDate("")
    setHeuresTravaillees("")
    setTauxHoraire("")
    setMotif("")
    setClasse("")
    setMatiere("")
  }

  const handleValiderHeure = (id: string) => {
    const validePar = "Administrateur"
    serviceHeuresVacataires.validerHeure(id, validePar)
    setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())
  }

  const handleMarquerPaye = (id: string) => {
    serviceHeuresVacataires.marquerPaye(id)
    setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())
  }

  const handleSupprimerHeure = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette heure ?")) {
      serviceHeuresVacataires.supprimerHeure(id)
      setHeures(serviceHeuresVacataires.obtenirToutesLesHeures())
    }
  }

  const filteredHeures = heures.filter(heure => {
    const matchStatut = filterStatut === "tous" || heure.statut === filterStatut
    const matchVacataire = filterVacataire === "tous" || heure.vacataireId === filterVacataire
    return matchStatut && matchVacataire
  })

  const getVacataireNom = (vacataireId: string) => {
    const vacataire = personnel.find(p => p.id === vacataireId)
    return vacataire ? `${vacataire.prenom} ${vacataire.nom}` : "Vacataire inconnu"
  }

  const getStatutIcon = (statut: HeureVacataire["statut"]) => {
    switch (statut) {
      case "valide":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "paye":
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const statistiques = serviceHeuresVacataires.obtenirStatistiques()

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
              <Clock className="h-6 w-6" />
              Heures des Vacataires
            </h1>
            <p className="text-gray-600">Gestion et calcul des heures de travail</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total heures</p>
              <p className="text-2xl font-bold">{statistiques.totalHeures}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total à payer</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.totalMontant.toLocaleString()} FCFA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{statistiques.parStatut.en_attente || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Payées</p>
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
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVacataire} onValueChange={setFilterVacataire}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par vacataire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les vacataires</SelectItem>
                  {personnel.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter des heures
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des heures */}
        <Card>
          <CardHeader>
            <CardTitle>Heures Enregistrées</CardTitle>
            <CardDescription>{filteredHeures.length} heure(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredHeures.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune heure enregistrée</p>
              ) : (
                filteredHeures.map((heure) => (
                  <div key={heure.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getStatutIcon(heure.statut)}
                      </div>
                      <div>
                        <p className="font-semibold">{getVacataireNom(heure.vacataireId)}</p>
                        <p className="text-sm text-gray-600">{heure.heuresTravaillees}h à {heure.tauxHoraire} FCFA/h</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                            {heure.montant.toLocaleString()} FCFA
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            {new Date(heure.date).toLocaleDateString()}
                          </span>
                          {heure.classe && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                              {heure.classe}
                            </span>
                          )}
                          {heure.matiere && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                              {heure.matiere}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {heure.statut === "en_attente" && (
                        <Button variant="outline" size="sm" onClick={() => handleValiderHeure(heure.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Valider
                        </Button>
                      )}
                      {heure.statut === "valide" && (
                        <Button variant="outline" size="sm" onClick={() => handleMarquerPaye(heure.id)}>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Marquer payé
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimerHeure(heure.id)}>
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
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Ajouter des Heures</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vacataire">Vacataire *</Label>
                  <Select value={selectedVacataire} onValueChange={setSelectedVacataire}>
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
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heures">Heures travaillées *</Label>
                  <Input
                    id="heures"
                    type="number"
                    step="0.5"
                    value={heuresTravaillees}
                    onChange={(e) => setHeuresTravaillees(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taux">Taux horaire (FCFA) *</Label>
                  <Input
                    id="taux"
                    type="number"
                    value={tauxHoraire}
                    onChange={(e) => setTauxHoraire(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe">Classe (optionnel)</Label>
                  <Input
                    id="classe"
                    value={classe}
                    onChange={(e) => setClasse(e.target.value)}
                    placeholder="CM1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matiere">Matière (optionnel)</Label>
                  <Input
                    id="matiere"
                    value={matiere}
                    onChange={(e) => setMatiere(e.target.value)}
                    placeholder="Mathématiques"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motif">Motif (optionnel)</Label>
                  <Input
                    id="motif"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Remplacement"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterHeure} className="flex-1">
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
