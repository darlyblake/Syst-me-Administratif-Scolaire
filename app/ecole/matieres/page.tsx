"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"
import { serviceMatieres } from "@/services/matieres.service"
import type { Matiere } from "@/types/models"

export default function MatieresPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [nouvelleMatiere, setNouvelleMatiere] = useState({
    code: "",
    nom: "",
    niveau: [] as string[],
    coefficient: 1,
    couleur: "#3B82F6",
    description: ""
  })

  const niveauxDisponibles = ["6ème", "5ème", "4ème", "3ème", "Seconde", "Première", "Terminale"]

  useEffect(() => {
    chargerMatieres()
  }, [])

  const chargerMatieres = () => {
    const donnees = serviceMatieres.obtenirToutesLesMatieres()
    setMatieres(donnees)
    setIsLoaded(true)
  }

  const handleAjouterMatiere = () => {
    try {
      serviceMatieres.ajouterMatiere(nouvelleMatiere)
      chargerMatieres()
      setShowAddModal(false)
      setNouvelleMatiere({
        code: "",
        nom: "",
        niveau: [],
        coefficient: 1,
        couleur: "#3B82F6",
        description: ""
      })
    } catch (erreur) {
      alert(erreur instanceof Error ? erreur.message : "Erreur lors de l'ajout")
    }
  }

  const handleModifierMatiere = () => {
    if (!editingMatiere) return
    try {
      serviceMatieres.modifierMatiere(editingMatiere.id, editingMatiere)
      chargerMatieres()
      setShowEditModal(false)
      setEditingMatiere(null)
    } catch (erreur) {
      alert(erreur instanceof Error ? erreur.message : "Erreur lors de la modification")
    }
  }

  const handleSupprimerMatiere = (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette matière ?")) return
    try {
      serviceMatieres.supprimerMatiere(id)
      chargerMatieres()
    } catch (erreur) {
      alert(erreur instanceof Error ? erreur.message : "Erreur lors de la suppression")
    }
  }

  const handleOuvrirEditModal = (matiere: Matiere) => {
    setEditingMatiere({ ...matiere })
    setShowEditModal(true)
  }

  const filteredMatieres = matieres.filter(matiere =>
    matiere.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    matiere.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statistiques = serviceMatieres.obtenirStatistiquesMatieres()

  if (!isLoaded) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    )
  }

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
              <BookOpen className="h-6 w-6" />
              Gestion des Matières
            </h1>
            <p className="text-gray-600">Administration des matières scolaires</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Matières</p>
              <p className="text-2xl font-bold">{statistiques.totalMatieres}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Niveaux couverts</p>
              <p className="text-2xl font-bold">{statistiques.niveauxCouverts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Coefficient moyen</p>
              <p className="text-2xl font-bold">{statistiques.coefficientMoyen.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par nom ou code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des matières */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Matières</CardTitle>
            <CardDescription>{filteredMatieres.length} matière(s) trouvée(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredMatieres.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune matière trouvée</p>
              ) : (
                filteredMatieres.map((matiere) => (
                  <div key={matiere.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: matiere.couleur || "#3B82F6" }}
                          >
                            {matiere.code}
                          </div>
                          <div>
                            <p className="font-semibold">{matiere.nom}</p>
                            <p className="text-sm text-gray-600">Code: {matiere.code} • Coefficient: {matiere.coefficient}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {matiere.niveau.map((n) => (
                            <span key={n} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                              {n}
                            </span>
                          ))}
                        </div>
                        {matiere.description && (
                          <p className="text-sm text-gray-500 mt-2">{matiere.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOuvrirEditModal(matiere)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleSupprimerMatiere(matiere.id)}>
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
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Nouvelle Matière</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={nouvelleMatiere.code}
                      onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: MAT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coefficient">Coefficient *</Label>
                    <Input
                      id="coefficient"
                      type="number"
                      value={nouvelleMatiere.coefficient}
                      onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, coefficient: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={nouvelleMatiere.nom}
                    onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, nom: e.target.value })}
                    placeholder="Ex: Mathématiques"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="couleur">Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="couleur"
                      type="color"
                      value={nouvelleMatiere.couleur}
                      onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, couleur: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={nouvelleMatiere.couleur}
                      onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, couleur: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Niveaux *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {niveauxDisponibles.map((niveau) => (
                      <label key={niveau} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nouvelleMatiere.niveau.includes(niveau)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNouvelleMatiere({ ...nouvelleMatiere, niveau: [...nouvelleMatiere.niveau, niveau] })
                            } else {
                              setNouvelleMatiere({ ...nouvelleMatiere, niveau: nouvelleMatiere.niveau.filter(n => n !== niveau) })
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{niveau}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={nouvelleMatiere.description}
                    onChange={(e) => setNouvelleMatiere({ ...nouvelleMatiere, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Description de la matière..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterMatiere} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de modification */}
        {showEditModal && editingMatiere && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Modifier la Matière</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Code *</Label>
                    <Input
                      id="edit-code"
                      value={editingMatiere.code}
                      onChange={(e) => setEditingMatiere({ ...editingMatiere, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: MAT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-coefficient">Coefficient *</Label>
                    <Input
                      id="edit-coefficient"
                      type="number"
                      value={editingMatiere.coefficient}
                      onChange={(e) => setEditingMatiere({ ...editingMatiere, coefficient: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nom">Nom *</Label>
                  <Input
                    id="edit-nom"
                    value={editingMatiere.nom}
                    onChange={(e) => setEditingMatiere({ ...editingMatiere, nom: e.target.value })}
                    placeholder="Ex: Mathématiques"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-couleur">Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="edit-couleur"
                      type="color"
                      value={editingMatiere.couleur || "#3B82F6"}
                      onChange={(e) => setEditingMatiere({ ...editingMatiere, couleur: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={editingMatiere.couleur || "#3B82F6"}
                      onChange={(e) => setEditingMatiere({ ...editingMatiere, couleur: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Niveaux *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {niveauxDisponibles.map((niveau) => (
                      <label key={niveau} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingMatiere.niveau.includes(niveau)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingMatiere({ ...editingMatiere, niveau: [...editingMatiere.niveau, niveau] })
                            } else {
                              setEditingMatiere({ ...editingMatiere, niveau: editingMatiere.niveau.filter(n => n !== niveau) })
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{niveau}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <textarea
                    id="edit-description"
                    value={editingMatiere.description || ""}
                    onChange={(e) => setEditingMatiere({ ...editingMatiere, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Description de la matière..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleModifierMatiere} className="flex-1">
                  Modifier
                </Button>
                <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingMatiere(null) }} className="flex-1">
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
