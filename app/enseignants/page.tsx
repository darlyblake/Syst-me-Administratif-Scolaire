/**
 * PAGE DE GESTION DES ENSEIGNANTS
 *
 * Cette page permet à l'administration de :
 * - Visualiser la liste complète des enseignants
 * - Filtrer et rechercher les enseignants
 * - Voir les statistiques générales
 * - Accéder aux fonctionnalités de gestion (ajout, modification, suppression)
 * - Gérer les emplois du temps et le pointage
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Edit, Trash2, Users, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"
import { ProtectionRoute } from "@/components/protection-route"

export default function EnseignantsPage() {
  // === ÉTATS LOCAUX ===

  /** Liste complète des enseignants chargée depuis le service */
  const [enseignants, setEnseignants] = useState<DonneesEnseignant[]>([])

  /** Filtre par statut (actif, inactif, congé, suspendu) */
  const [filtreStatut, setFiltreStatut] = useState<string>("tous")

  /** Terme de recherche pour filtrer par nom/prénom */
  const [rechercheNom, setRechercheNom] = useState("")

  // === EFFETS ===

  /**
   * Chargement initial des données des enseignants
   * Se déclenche au montage du composant
   */
  useEffect(() => {
    chargerEnseignants()
  }, [])

  // === FONCTIONS UTILITAIRES ===

  /**
   * Charge la liste des enseignants depuis le service
   * Met à jour l'état local avec les données fraîches
   */
  const chargerEnseignants = () => {
    const donneesEnseignants = serviceEnseignants.obtenirTousLesEnseignants()
    setEnseignants(donneesEnseignants)
  }

  /**
   * Filtre la liste des enseignants selon les critères de recherche
   * Combine le filtre par nom/prénom et le filtre par statut
   */
  const enseignantsFiltres = enseignants.filter((enseignant) => {
    // Vérification de correspondance avec le nom ou prénom (insensible à la casse)
    const correspondNom =
      enseignant.nom.toLowerCase().includes(rechercheNom.toLowerCase()) ||
      enseignant.prenom.toLowerCase().includes(rechercheNom.toLowerCase())

    // Vérification de correspondance avec le statut sélectionné
    const correspondStatut = filtreStatut === "tous" || enseignant.statut === filtreStatut

    return correspondNom && correspondStatut
  })

  /**
   * Supprime un enseignant après confirmation
   * @param id - Identifiant unique de l'enseignant à supprimer
   */
  const supprimerEnseignant = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) {
      serviceEnseignants.supprimerEnseignant(id)
      chargerEnseignants() // Recharge la liste après suppression
    }
  }

  /**
   * Détermine la couleur du badge selon le statut de l'enseignant
   * @param statut - Statut actuel de l'enseignant
   * @returns Classes CSS pour le style du badge
   */
  const obtenirCouleurStatut = (statut: DonneesEnseignant["statut"]) => {
    switch (statut) {
      case "actif":
        return "bg-green-100 text-green-800" // Vert pour actif
      case "inactif":
        return "bg-gray-100 text-gray-800" // Gris pour inactif
      case "conge":
        return "bg-blue-100 text-blue-800" // Bleu pour congé
      case "suspendu":
        return "bg-red-100 text-red-800" // Rouge pour suspendu
      default:
        return "bg-gray-100 text-gray-800" // Gris par défaut
    }
  }

  return (
    <ProtectionRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* === EN-TÊTE DE LA PAGE === */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Bouton de retour vers le tableau de bord */}
              <Button variant="outline" size="sm" asChild>
                <Link href="/tableau-bord">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>

              {/* Titre et description de la page */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Gestion des Enseignants
                </h1>
                <p className="text-gray-600">Gérer les enseignants, leurs affectations et emplois du temps</p>
              </div>
            </div>

            {/* Bouton d'ajout d'un nouvel enseignant */}
            <Button asChild>
              <Link href="/enseignants/ajouter">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un enseignant
              </Link>
            </Button>
          </div>

          {/* === STATISTIQUES RAPIDES === */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {/* Total des enseignants */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{enseignants.length}</div>
                  <div className="text-sm text-gray-600">Total enseignants</div>
                </div>
              </CardContent>
            </Card>

            {/* Enseignants actifs */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {enseignants.filter((e) => e.statut === "actif").length}
                  </div>
                  <div className="text-sm text-gray-600">Actifs</div>
                </div>
              </CardContent>
            </Card>

            {/* Enseignants en congé */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {enseignants.filter((e) => e.statut === "conge").length}
                  </div>
                  <div className="text-sm text-gray-600">En congé</div>
                </div>
              </CardContent>
            </Card>

            {/* Total des affectations de classes */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {enseignants.reduce((total, e) => total + e.classes.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Affectations</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* === SECTION DE FILTRAGE === */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Champ de recherche par nom */}
                <div className="space-y-2">
                  <Label>Rechercher par nom</Label>
                  <Input
                    placeholder="Nom ou prénom..."
                    value={rechercheNom}
                    onChange={(e) => setRechercheNom(e.target.value)}
                  />
                </div>

                {/* Sélecteur de statut */}
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={filtreStatut} onValueChange={setFiltreStatut}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les statuts</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="conge">En congé</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === LISTE DES ENSEIGNANTS === */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des enseignants ({enseignantsFiltres.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enseignantsFiltres.map((enseignant) => (
                  <div key={enseignant.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      {/* === INFORMATIONS DE L'ENSEIGNANT === */}
                      <div className="flex-1">
                        {/* Nom, prénom et statut */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {enseignant.prenom} {enseignant.nom.toUpperCase()}
                          </h3>
                          <Badge className={obtenirCouleurStatut(enseignant.statut)}>{enseignant.statut}</Badge>
                        </div>

                        {/* Détails organisés en grille */}
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          {/* Colonne 1 : Informations de contact */}
                          <div>
                            <p>
                              <strong>Identifiant:</strong> {enseignant.identifiant}
                            </p>
                            <p>
                              <strong>Email:</strong> {enseignant.email}
                            </p>
                            <p>
                              <strong>Téléphone:</strong> {enseignant.telephone}
                            </p>
                          </div>

                          {/* Colonne 2 : Informations professionnelles */}
                          <div>
                            <p>
                              <strong>Date d'embauche:</strong>{" "}
                              {new Date(enseignant.dateEmbauche).toLocaleDateString("fr-FR")}
                            </p>
                            <p>
                              <strong>Matières:</strong> {enseignant.matieres.join(", ") || "Aucune"}
                            </p>
                            <p>
                              <strong>Classes:</strong> {enseignant.classes.join(", ") || "Aucune"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* === BOUTONS D'ACTION === */}
                      <div className="flex gap-2">
                        {/* Bouton emploi du temps */}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/enseignants/${enseignant.id}/emploi-du-temps`}>
                            <Clock className="h-4 w-4 mr-1" />
                            Emploi du temps
                          </Link>
                        </Button>

                        {/* Bouton pointage */}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/enseignants/${enseignant.id}/pointage`}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Pointage
                          </Link>
                        </Button>

                        {/* Bouton modification */}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/enseignants/${enseignant.id}/modifier`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>

                        {/* Bouton suppression */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => supprimerEnseignant(enseignant.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Message si aucun enseignant trouvé */}
                {enseignantsFiltres.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Aucun enseignant trouvé</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectionRoute>
  )
}
