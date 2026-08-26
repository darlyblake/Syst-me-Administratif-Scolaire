"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Star, Plus, Trash2, Search, TrendingUp } from "lucide-react"
import Link from "next/link"
import { serviceEvaluation } from "@/services/evaluation.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { Evaluation } from "@/services/evaluation.service"

export default function EvaluationPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<string>("")
  const [selectedType, setSelectedType] = useState<Evaluation["type"]>("parent")
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState("")
  const [evaluateur, setEvaluateur] = useState("")
  const [criteres, setCriteres] = useState({
    pedagogie: 5,
    ponctualite: 5,
    communication: 5,
    discipline: 5
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("tous")

  useEffect(() => {
    setEvaluations(serviceEvaluation.obtenirToutesLesEvaluations())
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }, [])

  const handleAjouterEvaluation = () => {
    if (!selectedPersonnel || !commentaire) {
      alert("Veuillez sélectionner un membre du personnel et ajouter un commentaire")
      return
    }

    const evaluation = serviceEvaluation.creerEvaluation({
      personnelId: selectedPersonnel,
      type: selectedType,
      date: new Date().toISOString(),
      note,
      commentaire,
      criteres,
      evaluateur: evaluateur || undefined
    })

    setEvaluations(serviceEvaluation.obtenirToutesLesEvaluations())
    setShowAddModal(false)
    setSelectedPersonnel("")
    setNote(5)
    setCommentaire("")
    setEvaluateur("")
    setCriteres({ pedagogie: 5, ponctualite: 5, communication: 5, discipline: 5 })
  }

  const handleSupprimerEvaluation = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette évaluation ?")) {
      serviceEvaluation.supprimerEvaluation(id)
      setEvaluations(serviceEvaluation.obtenirToutesLesEvaluations())
    }
  }

  const filteredEvaluations = evaluations.filter(evaluation => {
    const personnelMember = personnel.find(p => p.id === evaluation.personnelId)
    const matchSearch = !searchTerm || 
      personnelMember?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personnelMember?.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchType = filterType === "tous" || evaluation.type === filterType
    
    return matchSearch && matchType
  })

  const getPersonnelNom = (personnelId: string) => {
    const member = personnel.find(p => p.id === personnelId)
    return member ? `${member.prenom} ${member.nom}` : "Personnel inconnu"
  }

  const getPersonnelPoste = (personnelId: string) => {
    const member = personnel.find(p => p.id === personnelId)
    return member?.poste || "Poste inconnu"
  }

  const renderStars = (note: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= note ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const statistiques = serviceEvaluation.obtenirStatistiquesGlobales()

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
              <TrendingUp className="h-6 w-6" />
              Évaluation du Personnel
            </h1>
            <p className="text-gray-600">Évaluations par les parents et l'administration</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total évaluations</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Moyenne générale</p>
              <p className="text-2xl font-bold text-blue-600">{statistiques.moyenneGenerale}/5</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Évaluations parents</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.parType.parent || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="administration">Administration</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle évaluation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des évaluations */}
        <Card>
          <CardHeader>
            <CardTitle>Évaluations</CardTitle>
            <CardDescription>{filteredEvaluations.length} évaluation(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredEvaluations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune évaluation</p>
              ) : (
                filteredEvaluations.map((evaluation) => {
                  const stats = serviceEvaluation.calculerStatistiquesPersonnel(evaluation.personnelId)
                  return (
                    <div key={evaluation.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{getPersonnelNom(evaluation.personnelId)}</p>
                          <p className="text-sm text-gray-600">{getPersonnelPoste(evaluation.personnelId)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderStars(evaluation.note)}
                          <span className="text-lg font-bold">{evaluation.note}/5</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="text-sm">
                          <span className="text-gray-600">Pédagogie:</span>
                          <span className="ml-1 font-semibold">{evaluation.criteres.pedagogie}/5</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Ponctualité:</span>
                          <span className="ml-1 font-semibold">{evaluation.criteres.ponctualite}/5</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Communication:</span>
                          <span className="ml-1 font-semibold">{evaluation.criteres.communication}/5</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Discipline:</span>
                          <span className="ml-1 font-semibold">{evaluation.criteres.discipline}/5</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-2 italic">"{evaluation.commentaire}"</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {evaluation.type === 'parent' ? 'Parent' : 'Administration'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            {new Date(evaluation.date).toLocaleDateString()}
                          </span>
                          {evaluation.evaluateur && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                              Par: {evaluation.evaluateur}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleSupprimerEvaluation(evaluation.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 pt-3 border-t text-sm">
                        <p className="text-gray-600">
                          Moyenne globale: <span className="font-bold text-blue-600">{stats.moyenne}/5</span>
                          ({stats.nombre} évaluation(s))
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Nouvelle Évaluation</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personnel">Membre du personnel *</Label>
                  <Select value={selectedPersonnel} onValueChange={setSelectedPersonnel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {personnel.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.prenom} {member.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type d'évaluation *</Label>
                  <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evaluateur">Évaluateur (optionnel)</Label>
                  <Input
                    id="evaluateur"
                    value={evaluateur}
                    onChange={(e) => setEvaluateur(e.target.value)}
                    placeholder="Nom de l'évaluateur"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes par critère (1-5)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pedagogie">Pédagogie</Label>
                      <Input
                        id="pedagogie"
                        type="number"
                        min="1"
                        max="5"
                        value={criteres.pedagogie}
                        onChange={(e) => setCriteres({ ...criteres, pedagogie: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ponctualite">Ponctualité</Label>
                      <Input
                        id="ponctualite"
                        type="number"
                        min="1"
                        max="5"
                        value={criteres.ponctualite}
                        onChange={(e) => setCriteres({ ...criteres, ponctualite: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="communication">Communication</Label>
                      <Input
                        id="communication"
                        type="number"
                        min="1"
                        max="5"
                        value={criteres.communication}
                        onChange={(e) => setCriteres({ ...criteres, communication: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="discipline">Discipline</Label>
                      <Input
                        id="discipline"
                        type="number"
                        min="1"
                        max="5"
                        value={criteres.discipline}
                        onChange={(e) => setCriteres({ ...criteres, discipline: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note globale (1-5) *</Label>
                  <Input
                    id="note"
                    type="number"
                    min="1"
                    max="5"
                    value={note}
                    onChange={(e) => setNote(parseInt(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commentaire">Commentaire *</Label>
                  <textarea
                    id="commentaire"
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Commentez l'évaluation..."
                    className="w-full min-h-[100px] p-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterEvaluation} className="flex-1">
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
