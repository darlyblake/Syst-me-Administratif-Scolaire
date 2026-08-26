"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Users, Download, Filter, Calendar, User } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, HistoriqueAffectation } from "@/types/models"
import { HistoriqueAffectationsModal } from "@/components/HistoriqueAffectationsModal"

export default function HistoriqueAffectationsPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(true)
  const [historique, setHistorique] = useState<HistoriqueAffectation[]>([])
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    if (enseignantId) {
      chargerDonnees()
    }
  }, [enseignantId])

  const chargerDonnees = () => {
    setLoading(true)
    try {
      const data = serviceEnseignants.obtenirEnseignantParIdentifiant(enseignantId)
      setEnseignant(data)

      // Charger l'historique des affectations
      const historiqueData = serviceEnseignants.obtenirHistoriqueAffectations(enseignantId)
      setHistorique(historiqueData)
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "inactif": return "bg-red-100 text-red-800"
      case "conge": return "bg-blue-100 text-blue-800"
      case "suspendu": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeLabel = (type: HistoriqueAffectation["type"]) => {
    switch (type) {
      case "classe": return "Classe"
      case "matiere": return "Matière"
      case "statut": return "Statut"
      case "salaire": return "Salaire"
      default: return type
    }
  }

  const getTypeColor = (type: HistoriqueAffectation["type"]) => {
    switch (type) {
      case "classe": return "bg-blue-100 text-blue-800"
      case "matiere": return "bg-green-100 text-green-800"
      case "statut": return "bg-orange-100 text-orange-800"
      case "salaire": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const historiqueFiltree = historique.filter(item => {
    if (filterType === "all") return true
    return item.type === filterType
  })

  const exporterHistorique = () => {
    const csvContent = [
      ["Date", "Type", "Ancienne valeur", "Nouvelle valeur", "Motif", "Modifié par"].join(","),
      ...historiqueFiltree.map(item => [
        new Date(item.dateModification).toLocaleDateString("fr-FR"),
        getTypeLabel(item.type),
        item.ancienneValeur || "",
        item.nouvelleValeur || "",
        item.motif || "",
        item.modifiePar
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historique-affectations-${enseignant?.nom}-${enseignant?.prenom}.csv`
    try {
      a.click()
    } finally {
      try { window.URL.revokeObjectURL(url) } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Enseignant non trouvé</h2>
          <p className="text-gray-600 mb-4">L'enseignant demandé n'existe pas ou a été supprimé.</p>
          <Button asChild>
            <Link href="/enseignants">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* En-tête */}
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/enseignants">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste des enseignants
            </Link>
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-lg font-semibold text-gray-600">
                {enseignant.prenom[0]}{enseignant.nom[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Historique des affectations - {enseignant.prenom} {enseignant.nom}
              </h1>
              <p className="text-gray-600">
                Consultez l'historique complet des modifications et affectations
              </p>
            </div>
          </div>
        </div>

        {/* Informations de l'enseignant */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations de l'enseignant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Informations personnelles</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Email:</span> {enseignant.email}</p>
                  <p><span className="text-gray-500">Statut:</span>
                    <Badge className={getStatusColor(enseignant.statut)}>
                      {enseignant.statut}
                    </Badge>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Affectations actuelles</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Matières:</span> {enseignant.matieres.join(", ") || "Aucune"}</p>
                  <p><span className="text-gray-500">Classes:</span> {enseignant.classes.length} classe(s)</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Statistiques</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Total modifications:</span> {historique.length}</p>
                  <p><span className="text-gray-500">Dernière modification:</span>
                    {historique.length > 0
                      ? new Date(historique[0].dateModification).toLocaleDateString("fr-FR")
                      : "Aucune"
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions et filtres */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tous les types</option>
              <option value="classe">Classes</option>
              <option value="matiere">Matières</option>
              <option value="statut">Statut</option>
              <option value="salaire">Salaire</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={exporterHistorique} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            <Button onClick={() => setShowModal(true)} size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Voir détails complets
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{historique.length}</div>
              <div className="text-sm text-gray-600">Total modifications</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {historique.filter(h => h.type === "classe").length}
              </div>
              <div className="text-sm text-gray-600">Changements classes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {historique.filter(h => h.type === "statut").length}
              </div>
              <div className="text-sm text-gray-600">Changements statut</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(historique.map(h => h.modifiePar)).size}
              </div>
              <div className="text-sm text-gray-600">Administrateurs</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste de l'historique */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Chronologie des modifications ({historiqueFiltree.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de l'historique...</p>
              </div>
            ) : historiqueFiltree.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Aucun historique disponible</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historiqueFiltree.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      {index < historiqueFiltree.length - 1 && (
                        <div className="w-px h-16 bg-gray-300 mt-2"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTypeColor(item.type)}>
                          {getTypeLabel(item.type)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(item.dateModification).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Modifié par: {item.modifiePar}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        {item.ancienneValeur && (
                          <>
                            <span className="text-gray-600">{item.ancienneValeur}</span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="font-medium text-gray-900">{item.nouvelleValeur || "Supprimé"}</span>
                      </div>

                      {item.motif && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                          <strong>Motif:</strong> {item.motif}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal d'historique détaillé */}
        <HistoriqueAffectationsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          enseignant={enseignant}
        />
      </div>
    </div>
  )
}
