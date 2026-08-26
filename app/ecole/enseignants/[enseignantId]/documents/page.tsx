"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Users, Download, Eye, Plus, Upload } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, DocumentAdministratif } from "@/types/models"
import { DocumentsAdministratifsModal } from "@/components/DocumentsAdministratifsModal"

export default function DocumentsAdministratifsPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<DocumentAdministratif[]>([])
  const [showModal, setShowModal] = useState(false)

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

      // Charger les documents administratifs
      const documentsData = serviceEnseignants.gererDocumentsAdministratifs(enseignantId)
      setDocuments(documentsData)
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

  const getTypeLabel = (type: DocumentAdministratif["type"]) => {
    switch (type) {
      case "contrat": return "Contrat de travail"
      case "diplome": return "Diplôme"
      case "certificat": return "Certificat"
      case "attestation": return "Attestation"
      case "autre": return "Autre"
      default: return type
    }
  }

  const getTypeColor = (type: DocumentAdministratif["type"]) => {
    switch (type) {
      case "contrat": return "bg-blue-100 text-blue-800"
      case "diplome": return "bg-green-100 text-green-800"
      case "certificat": return "bg-purple-100 text-purple-800"
      case "attestation": return "bg-orange-100 text-orange-800"
      case "autre": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatutColor = (statut: DocumentAdministratif["statut"]) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "archive": return "bg-yellow-100 text-yellow-800"
      case "supprime": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const documentsActifs = documents.filter(doc => doc.statut === "actif")

  const handleDownload = (document: DocumentAdministratif) => {
    // Simulation du téléchargement
    console.log("Téléchargement du document:", document.nom)
    // Ici vous implémenteriez la logique de téléchargement réelle
  }

  const handleView = (document: DocumentAdministratif) => {
    // Simulation de la visualisation
    console.log("Visualisation du document:", document.nom)
    // Ici vous implémenteriez la logique de visualisation réelle
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
                Documents administratifs - {enseignant.prenom} {enseignant.nom}
              </h1>
              <p className="text-gray-600">
                Gérez les documents administratifs de l'enseignant
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
                <h4 className="font-medium text-gray-900 mb-2">Documents</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Total documents:</span> {documents.length}</p>
                  <p><span className="text-gray-500">Documents actifs:</span> {documentsActifs.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions principales */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Gestion des documents</h2>
            <p className="text-gray-600">
              {documentsActifs.length} document(s) actif(s) • {documents.filter(d => d.statut === "archive").length} archivé(s)
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </div>

        {/* Statistiques des documents */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{documentsActifs.length}</div>
              <div className="text-sm text-gray-600">Actifs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {documents.filter(d => d.statut === "archive").length}
              </div>
              <div className="text-sm text-gray-600">Archivés</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {documents.filter(d => d.type === "contrat").length}
              </div>
              <div className="text-sm text-gray-600">Contrats</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {documents.filter(d => d.type === "diplome").length}
              </div>
              <div className="text-sm text-gray-600">Diplômes</div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Aucun document disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{document.nom}</span>
                          <Badge className={getTypeColor(document.type)}>
                            {getTypeLabel(document.type)}
                          </Badge>
                          <Badge className={getStatutColor(document.statut)}>
                            {document.statut}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          Ajouté le {new Date(document.dateAjout).toLocaleDateString("fr-FR")}
                          {document.tailleFichier && (
                            <span className="ml-2">
                              • {Math.round(document.tailleFichier / 1024)} KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de gestion des documents */}
        <DocumentsAdministratifsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          enseignant={enseignant}
          onSuccess={() => {
            chargerDonnees() // Recharger les données
            setShowModal(false)
          }}
        />
      </div>
    </div>
  )
}
