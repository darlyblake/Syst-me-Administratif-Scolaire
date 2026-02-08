"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, HistoriqueAffectation } from "@/types/models"
import { Clock, User, ArrowRight, Filter, Download, Calendar } from "lucide-react"

interface HistoriqueAffectationsModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
}

export function HistoriqueAffectationsModal({ isOpen, onClose, enseignant }: HistoriqueAffectationsModalProps) {
  const [historique, setHistorique] = useState<HistoriqueAffectation[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    if (enseignant && isOpen) {
      chargerHistorique()
    }
  }, [enseignant, isOpen])

  const chargerHistorique = () => {
    if (!enseignant) return

    setLoading(true)
    try {
      // Récupérer l'historique des affectations
      const historiqueData = serviceEnseignants.obtenirHistoriqueAffectations(enseignant.id)
      setHistorique(historiqueData)
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error)
    } finally {
      setLoading(false)
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

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "inactif": return "bg-red-100 text-red-800"
      case "conge": return "bg-blue-100 text-blue-800"
      case "suspendu": return "bg-orange-100 text-orange-800"
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

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des affectations
            <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtres et actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="classe">Classes</SelectItem>
                  <SelectItem value="matiere">Matières</SelectItem>
                  <SelectItem value="statut">Statut</SelectItem>
                  <SelectItem value="salaire">Salaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exporterHistorique} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm flex items-center gap-2">
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
                              <ArrowRight className="h-4 w-4 text-gray-400" />
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
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
