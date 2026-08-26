"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Plus, Trash2, Edit, Search, Filter } from "lucide-react"
import Link from "next/link"
import { serviceClasses } from "@/services/classes.service"
import { serviceParametres } from "@/services/parametres.service"
import type { Classe } from "@/types/models"
import type { TarificationTypeEcole } from "@/services/parametres.service"

export default function ClassesPage() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [tarificationTypesEcole, setTarificationTypesEcole] = useState<TarificationTypeEcole[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTypeEcole, setFilterTypeEcole] = useState("")
  const [filterNiveau, setFilterNiveau] = useState("")

  const [nouvelleClasse, setNouvelleClasse] = useState({
    nom: "",
    typeEcole: "",
    niveau: "",
    capacite: 30,
    fraisScolarite: 0
  })

  useEffect(() => {
    chargerClasses()
    chargerTarification()
  }, [])

  const chargerClasses = () => {
    const donnees = serviceClasses.obtenirToutesLesClasses()
    setClasses(donnees)
    setIsLoaded(true)
  }

  const chargerTarification = () => {
    const tarification = serviceParametres.obtenirTarificationParTypeEcole()
    setTarificationTypesEcole(tarification)
  }

  const handleTypeEcoleChange = (typeEcole: string) => {
    setNouvelleClasse({ ...nouvelleClasse, typeEcole, niveau: "", fraisScolarite: 0 })
  }

  const handleNiveauChange = (niveau: string) => {
    const typeEcoleData = tarificationTypesEcole.find(t => t.typeEcole === nouvelleClasse.typeEcole)
    const niveauData = typeEcoleData?.niveaux.find(n => n.niveau === niveau)
    setNouvelleClasse({ 
      ...nouvelleClasse, 
      niveau, 
      fraisScolarite: niveauData?.fraisScolariteAnnuelle || 0 
    })
  }

  const handleAjouterClasse = () => {
    try {
      serviceClasses.ajouterClasse(nouvelleClasse)
      chargerClasses()
      setShowAddModal(false)
      setNouvelleClasse({
        nom: "",
        typeEcole: "",
        niveau: "",
        capacite: 30,
        fraisScolarite: 0
      })
    } catch (erreur) {
      alert(erreur instanceof Error ? erreur.message : "Erreur lors de l'ajout")
    }
  }

  const handleModifierClasse = () => {
    if (!editingClasse) return
    try {
      serviceClasses.modifierClasse(editingClasse.id, editingClasse)
      chargerClasses()
      setShowEditModal(false)
      setEditingClasse(null)
    } catch (erreur) {
      alert(erreur instanceof Error ? erreur.message : "Erreur lors de la modification")
    }
  }

  const handleSupprimerClasse = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette classe ?")) {
      serviceClasses.supprimerClasse(id)
      chargerClasses()
    }
  }

  const handleOuvrirEditModal = (classe: Classe) => {
    setEditingClasse({ ...classe })
    setShowEditModal(true)
  }

  const filteredClasses = classes.filter(classe =>
    classe.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classe.niveau.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classe.typeEcole && classe.typeEcole.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter(classe =>
    !filterTypeEcole || classe.typeEcole === filterTypeEcole
  ).filter(classe =>
    !filterNiveau || classe.niveau === filterNiveau
  )

  const typesEcoleUniques = Array.from(new Set(classes.map(c => c.typeEcole).filter(Boolean)))
  const niveauxUniques = Array.from(new Set(classes.map(c => c.niveau)))
  const statistiques = serviceClasses.obtenirStatistiquesClasses()

  if (!isLoaded) {
    return (
      <div className="min-h-screen p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des classes</h1>
            <p className="text-gray-600">Interface de gestion des classes scolaires</p>
          </div>
          <Button variant="outline" asChild className="mt-4 md:mt-0">
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistiques.totalClasses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Classes actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistiques.classesActives}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Moyenne élèves/classe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistiques.moyenneElevesParClasse.toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Recettes totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistiques.recettesTotales.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher une classe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filterTypeEcole}
                  onChange={(e) => setFilterTypeEcole(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Tous les types</option>
                  {typesEcoleUniques.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filterNiveau}
                  onChange={(e) => setFilterNiveau(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Tous les niveaux</option>
                  {niveauxUniques.map((niveau) => (
                    <option key={niveau} value={niveau}>{niveau}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle classe
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des classes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((classe) => {
            const nombreEleves = serviceClasses.compterElevesParClasse(classe.id)
            const enseignants = serviceClasses.obtenirEnseignantsDeClasse(classe.id)
            
            return (
              <Card key={classe.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{classe.nom}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOuvrirEditModal(classe)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimerClasse(classe.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {classe.typeEcole && <span className="mr-2">{classe.typeEcole}</span>}
                    {classe.niveau}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Capacité:</span>
                      <span className="font-medium">{classe.capacite} élèves</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Élèves inscrits:</span>
                      <span className="font-medium">{nombreEleves} / {classe.capacite}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Frais scolarité:</span>
                      <span className="font-medium">{classe.fraisScolarite.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Enseignants:</span>
                      <span className="font-medium">{enseignants.length}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(nombreEleves / classe.capacite) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {nombreEleves >= classe.capacite ? "Classe complète" : `${classe.capacite - nombreEleves} places disponibles`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredClasses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Aucune classe trouvée</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer une classe
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Nouvelle classe</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de la classe *</Label>
                  <Input
                    id="nom"
                    value={nouvelleClasse.nom}
                    onChange={(e) => setNouvelleClasse({ ...nouvelleClasse, nom: e.target.value })}
                    placeholder="Ex: CM1-A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeEcole">Type d'établissement *</Label>
                  <select
                    id="typeEcole"
                    value={nouvelleClasse.typeEcole}
                    onChange={(e) => handleTypeEcoleChange(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Sélectionner un type</option>
                    {tarificationTypesEcole.map((type) => (
                      <option key={type.typeEcole} value={type.typeEcole}>{type.typeEcole}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niveau">Niveau *</Label>
                  <select
                    id="niveau"
                    value={nouvelleClasse.niveau}
                    onChange={(e) => handleNiveauChange(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    disabled={!nouvelleClasse.typeEcole}
                  >
                    <option value="">Sélectionner d'abord le type d'établissement</option>
                    {nouvelleClasse.typeEcole && tarificationTypesEcole
                      .find(t => t.typeEcole === nouvelleClasse.typeEcole)
                      ?.niveaux.map((niveau) => (
                        <option key={niveau.niveau} value={niveau.niveau}>
                          {niveau.niveau} ({niveau.fraisScolariteAnnuelle.toLocaleString()} FCFA)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacite">Capacité *</Label>
                  <Input
                    id="capacite"
                    type="number"
                    value={nouvelleClasse.capacite}
                    onChange={(e) => setNouvelleClasse({ ...nouvelleClasse, capacite: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fraisScolarite">Frais de scolarité (FCFA) *</Label>
                  <Input
                    id="fraisScolarite"
                    type="number"
                    value={nouvelleClasse.fraisScolarite}
                    onChange={(e) => setNouvelleClasse({ ...nouvelleClasse, fraisScolarite: parseInt(e.target.value) || 0 })}
                    placeholder="Pré-rempli depuis les paramètres"
                  />
                  <p className="text-xs text-gray-500">Pré-rempli automatiquement selon le niveau sélectionné</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAjouterClasse} className="flex-1">
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
        {showEditModal && editingClasse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Modifier la classe</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nom">Nom de la classe *</Label>
                  <Input
                    id="edit-nom"
                    value={editingClasse.nom}
                    onChange={(e) => setEditingClasse({ ...editingClasse, nom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-typeEcole">Type d'établissement *</Label>
                  <select
                    id="edit-typeEcole"
                    value={editingClasse.typeEcole || ""}
                    onChange={(e) => {
                      const typeEcole = e.target.value
                      setEditingClasse({ ...editingClasse, typeEcole, niveau: "", fraisScolarite: 0 })
                    }}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Sélectionner un type</option>
                    {tarificationTypesEcole.map((type) => (
                      <option key={type.typeEcole} value={type.typeEcole}>{type.typeEcole}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-niveau">Niveau *</Label>
                  <select
                    id="edit-niveau"
                    value={editingClasse.niveau}
                    onChange={(e) => {
                      const niveau = e.target.value
                      const typeEcoleData = tarificationTypesEcole.find(t => t.typeEcole === editingClasse.typeEcole)
                      const niveauData = typeEcoleData?.niveaux.find(n => n.niveau === niveau)
                      setEditingClasse({ 
                        ...editingClasse, 
                        niveau, 
                        fraisScolarite: niveauData?.fraisScolariteAnnuelle || editingClasse.fraisScolarite
                      })
                    }}
                    className="w-full border rounded px-3 py-2"
                    disabled={!editingClasse.typeEcole}
                  >
                    <option value="">Sélectionner d'abord le type d'établissement</option>
                    {editingClasse.typeEcole && tarificationTypesEcole
                      .find(t => t.typeEcole === editingClasse.typeEcole)
                      ?.niveaux.map((niveau) => (
                        <option key={niveau.niveau} value={niveau.niveau}>
                          {niveau.niveau} ({niveau.fraisScolariteAnnuelle.toLocaleString()} FCFA)
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacite">Capacité *</Label>
                  <Input
                    id="edit-capacite"
                    type="number"
                    value={editingClasse.capacite}
                    onChange={(e) => setEditingClasse({ ...editingClasse, capacite: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fraisScolarite">Frais de scolarité (FCFA) *</Label>
                  <Input
                    id="edit-fraisScolarite"
                    type="number"
                    value={editingClasse.fraisScolarite}
                    onChange={(e) => setEditingClasse({ ...editingClasse, fraisScolarite: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleModifierClasse} className="flex-1">
                  Modifier
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
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
