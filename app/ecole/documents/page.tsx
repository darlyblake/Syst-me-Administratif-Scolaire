"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileText, Download, Printer, Trash2, Search, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceDocuments } from "@/services/documents.service"
import { serviceEleves } from "@/services/eleves.service"
import type { Document } from "@/services/documents.service"

const TYPES_DOCUMENTS = [
  { value: "certificat_scolarite", label: "Certificat de scolarité" },
  { value: "attestation_assurance", label: "Attestation d'assurance" },
  { value: "recu_paiement", label: "Reçu de paiement" },
  { value: "convocation", label: "Convocation" },
  { value: "fiche_inscription", label: "Fiche d'inscription" },
  { value: "dossier_transfert", label: "Dossier de transfert" },
  { value: "bulletin", label: "Bulletin scolaire" }
] as const

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [eleves, setEleves] = useState<any[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedEleve, setSelectedEleve] = useState<string>("")
  const [selectedType, setSelectedType] = useState<Document["type"]>("certificat_scolarite")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("tous")
  const [montantPaiement, setMontantPaiement] = useState("")
  const [motifPaiement, setMotifPaiement] = useState("")
  const [typeConvocation, setTypeConvocation] = useState("")
  const [dateConvocation, setDateConvocation] = useState("")
  const [heureConvocation, setHeureConvocation] = useState("")

  useEffect(() => {
    setDocuments(serviceDocuments.obtenirTousLesDocuments())
    setEleves(serviceEleves.obtenirTousLesEleves())
  }, [])

  const handleGenererDocument = () => {
    if (!selectedEleve) {
      alert("Veuillez sélectionner un élève")
      return
    }

    const eleve = eleves.find(e => e.id === selectedEleve)
    if (!eleve) {
      alert("Élève non trouvé")
      return
    }

    try {
      switch (selectedType) {
        case "certificat_scolarite":
          serviceDocuments.genererCertificatScolarite(selectedEleve, eleve)
          break
        case "attestation_assurance":
          serviceDocuments.genererAttestationAssurance(selectedEleve, eleve)
          break
        case "recu_paiement":
          if (!montantPaiement || !motifPaiement) {
            alert("Veuillez remplir le montant et le motif du paiement")
            return
          }
          serviceDocuments.genererRecuPaiement(selectedEleve, eleve, parseInt(montantPaiement), motifPaiement)
          break
        case "convocation":
          if (!typeConvocation || !dateConvocation || !heureConvocation) {
            alert("Veuillez remplir le type, la date et l'heure de la convocation")
            return
          }
          serviceDocuments.genererConvocation(selectedEleve, eleve, typeConvocation, dateConvocation, heureConvocation)
          break
        default:
          alert("Type de document non implémenté")
          return
      }

      setDocuments(serviceDocuments.obtenirTousLesDocuments())
      setShowGenerateModal(false)
      setSelectedEleve("")
      setMontantPaiement("")
      setMotifPaiement("")
      setTypeConvocation("")
      setDateConvocation("")
      setHeureConvocation("")
    } catch (error) {
      alert("Erreur lors de la génération du document")
    }
  }

  const handleImprimer = (document: Document) => {
    serviceDocuments.mettreAJourStatut(document.id, "imprime")
    setDocuments(serviceDocuments.obtenirTousLesDocuments())
    
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Document</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${document.contenu}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleTelecharger = (doc: Document) => {
    const blob = new Blob([doc.contenu], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${doc.type}_${doc.eleveId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSupprimer = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      serviceDocuments.supprimerDocument(id)
      setDocuments(serviceDocuments.obtenirTousLesDocuments())
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchSearch = !searchTerm || 
      doc.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchType = filterType === "tous" || doc.type === filterType
    
    return matchSearch && matchType
  })

  const getEleveNom = (eleveId: string) => {
    const eleve = eleves.find(e => e.id === eleveId)
    return eleve ? `${eleve.prenom} ${eleve.nom}` : "Élève inconnu"
  }

  const getTypeLabel = (type: Document["type"]) => {
    return TYPES_DOCUMENTS.find(t => t.value === type)?.label || type
  }

  const statistiques = serviceDocuments.obtenirStatistiques()

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
              <FileText className="h-6 w-6" />
              Génération de Documents
            </h1>
            <p className="text-gray-600">Certificats, attestations, reçus, convocations</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total documents</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Imprimés</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.parStatut.imprime || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Générés</p>
              <p className="text-2xl font-bold text-blue-600">{statistiques.parStatut.genere || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par ID..."
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
                  {TYPES_DOCUMENTS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowGenerateModal(true)} className="ml-auto">
                <FileText className="h-4 w-4 mr-2" />
                Générer un document
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents Générés</CardTitle>
            <CardDescription>{filteredDocuments.length} document(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun document généré</p>
              ) : (
                filteredDocuments.map((document) => (
                  <div key={document.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{getTypeLabel(document.type)}</p>
                        <p className="text-sm text-gray-600">Élève: {getEleveNom(document.eleveId)}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(document.dateGeneration).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            document.statut === 'imprime' ? 'bg-green-100 text-green-800' :
                            document.statut === 'envoye' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {document.statut}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleImprimer(document)}>
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTelecharger(document)}>
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimer(document.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de génération */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Générer un Document</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eleve">Élève *</Label>
                  <Select value={selectedEleve} onValueChange={setSelectedEleve}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un élève" />
                    </SelectTrigger>
                    <SelectContent>
                      {eleves.map((eleve) => (
                        <SelectItem key={eleve.id} value={eleve.id}>
                          {eleve.prenom} {eleve.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type de document *</Label>
                  <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_DOCUMENTS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedType === "recu_paiement" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="montant">Montant (FCFA) *</Label>
                      <Input
                        id="montant"
                        type="number"
                        value={montantPaiement}
                        onChange={(e) => setMontantPaiement(e.target.value)}
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motif">Motif *</Label>
                      <Input
                        id="motif"
                        value={motifPaiement}
                        onChange={(e) => setMotifPaiement(e.target.value)}
                        placeholder="Frais d'inscription"
                      />
                    </div>
                  </>
                )}

                {selectedType === "convocation" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="typeConvocation">Type de convocation *</Label>
                      <Input
                        id="typeConvocation"
                        value={typeConvocation}
                        onChange={(e) => setTypeConvocation(e.target.value)}
                        placeholder="Réunion parents-professeurs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateConvocation">Date *</Label>
                      <Input
                        id="dateConvocation"
                        type="date"
                        value={dateConvocation}
                        onChange={(e) => setDateConvocation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heureConvocation">Heure *</Label>
                      <Input
                        id="heureConvocation"
                        type="time"
                        value={heureConvocation}
                        onChange={(e) => setHeureConvocation(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleGenererDocument} className="flex-1">
                  Générer
                </Button>
                <Button variant="outline" onClick={() => setShowGenerateModal(false)} className="flex-1">
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
