"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Archive, Download, Trash2, Search, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceArchivage } from "@/services/archivage.service"
import { serviceEleves } from "@/services/eleves.service"
import type { EleveArchive } from "@/services/archivage.service"

export default function ArchivagePage() {
  const [archives, setArchives] = useState<EleveArchive[]>([])
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [selectedEleve, setSelectedEleve] = useState<string>("")
  const [motifArchivage, setMotifArchivage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("tous")
  const [elevesActifs, setElevesActifs] = useState<any[]>([])

  useEffect(() => {
    setArchives(serviceArchivage.obtenirTousLesArchives())
    setElevesActifs(serviceEleves.obtenirTousLesEleves().filter(e => e.statut === "actif"))
  }, [])

  const handleArchiverEleve = () => {
    if (!selectedEleve || !motifArchivage) {
      alert("Veuillez sélectionner un élève et un motif d'archivage")
      return
    }

    const eleve = elevesActifs.find(e => e.id === selectedEleve)
    if (!eleve) {
      alert("Élève non trouvé")
      return
    }

    if (confirm(`Êtes-vous sûr de vouloir archiver ${eleve.prenom} ${eleve.nom} ?`)) {
      serviceArchivage.archiverEleve(eleve, motifArchivage)
      
      // Mettre à jour le statut de l'élève
      serviceEleves.mettreAJourStatut(selectedEleve, "archive")
      
      setArchives(serviceArchivage.obtenirTousLesArchives())
      setElevesActifs(serviceEleves.obtenirTousLesEleves().filter(e => e.statut === "actif"))
      setShowArchiveModal(false)
      setSelectedEleve("")
      setMotifArchivage("")
    }
  }

  const handleDesarchiver = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir désarchiver cet élève ?")) {
      serviceArchivage.desarchiverEleve(id)
      
      // Réactiver l'élève
      serviceEleves.mettreAJourStatut(id, "actif")
      
      setArchives(serviceArchivage.obtenirTousLesArchives())
      setElevesActifs(serviceEleves.obtenirTousLesEleves().filter(e => e.statut === "actif"))
    }
  }

  const handleExporter = (id: string) => {
    const donnees = serviceArchivage.exporterDonneesEleve(id)
    if (donnees) {
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `archive-${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const filteredArchives = archives.filter(archive => {
    const matchSearch = !searchTerm || 
      archive.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchAnnee = filterAnnee === "tous" || archive.anneeScolaire === filterAnnee
    
    return matchSearch && matchAnnee
  })

  const anneesDisponibles = Array.from(new Set(archives.map(a => a.anneeScolaire))).sort()
  const statistiques = serviceArchivage.obtenirStatistiques()

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
              <Archive className="h-6 w-6" />
              Archivage des Élèves
            </h1>
            <p className="text-gray-600">Gestion des élèves ayant quitté l'école</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total archivés</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Années scolaires</p>
              <p className="text-2xl font-bold text-blue-600">{Object.keys(statistiques.parAnnee).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Élèves actifs</p>
              <p className="text-2xl font-bold text-green-600">{elevesActifs.length}</p>
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
              <Select value={filterAnnee} onValueChange={setFilterAnnee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les années</SelectItem>
                  {anneesDisponibles.map((annee) => (
                    <SelectItem key={annee} value={annee}>{annee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowArchiveModal(true)} className="ml-auto">
                <Archive className="h-4 w-4 mr-2" />
                Archiver un élève
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des élèves archivés */}
        <Card>
          <CardHeader>
            <CardTitle>Élèves Archivés</CardTitle>
            <CardDescription>{filteredArchives.length} élève(s) archivé(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredArchives.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun élève archivé</p>
              ) : (
                filteredArchives.map((archive) => (
                  <div key={archive.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Archive className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{archive.prenom} {archive.nom}</p>
                        <p className="text-sm text-gray-600">Dernière classe: {archive.classeDerniere}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {archive.anneeScolaire}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                            {archive.motifArchivage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-600">
                        Archivé le {new Date(archive.dateArchivage).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleExporter(archive.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Exporter
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDesarchiver(archive.id)}>
                          Désarchiver
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal d'archivage */}
        {showArchiveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Archiver un Élève</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eleve">Élève *</Label>
                  <Select value={selectedEleve} onValueChange={setSelectedEleve}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un élève" />
                    </SelectTrigger>
                    <SelectContent>
                      {elevesActifs.map((eleve) => (
                        <SelectItem key={eleve.id} value={eleve.id}>
                          {eleve.prenom} {eleve.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motif">Motif d'archivage *</Label>
                  <Select value={motifArchivage} onValueChange={setMotifArchivage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diplome">Obtention du diplôme</SelectItem>
                      <SelectItem value="transfert">Transfert vers une autre école</SelectItem>
                      <SelectItem value="abandon">Abandon scolaire</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleArchiverEleve} className="flex-1">
                  Archiver
                </Button>
                <Button variant="outline" onClick={() => setShowArchiveModal(false)} className="flex-1">
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
