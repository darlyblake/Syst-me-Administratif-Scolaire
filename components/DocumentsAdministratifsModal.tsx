"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, DocumentAdministratif } from "@/types/models"
import { FileText, Upload, Download, Eye, Trash2, Plus, CheckCircle, X } from "lucide-react"

// Composant Dialog simplifié intégré
const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

const DialogContent = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <div className={`bg-white rounded-lg shadow-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto ${className}`}>
    {children}
  </div>
)

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">
    {children}
  </div>
)

const DialogTitle = ({ className = "", children }: { className?: string; children: React.ReactNode }) => (
  <h2 className={`text-lg font-semibold ${className}`}>
    {children}
  </h2>
)

interface DocumentsAdministratifsModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function DocumentsAdministratifsModal({ isOpen, onClose, enseignant, onSuccess }: DocumentsAdministratifsModalProps) {
  const [documents, setDocuments] = useState<DocumentAdministratif[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [nouveauDocument, setNouveauDocument] = useState({
    type: "contrat" as DocumentAdministratif["type"],
    nom: "",
    cheminFichier: ""
  })

  useEffect(() => {
    if (enseignant && isOpen) {
      chargerDocuments()
    }
  }, [enseignant, isOpen])

  const chargerDocuments = () => {
    if (!enseignant) return

    setLoading(true)
    try {
      const documentsData = serviceEnseignants.gererDocumentsAdministratifs(enseignant.id)
      setDocuments(documentsData)
    } catch (error) {
      console.error("Erreur lors du chargement des documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnvoyerDocument = (documentId: string) => {
    setLoading(true)
    try {
      const success = serviceEnseignants.envoyerDocumentAdministratif(documentId)
      if (success) {
        chargerDocuments()
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du document:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAjouterDocument = async () => {
    if (!enseignant || !nouveauDocument.nom.trim()) return

    setLoading(true)
    try {
      const document = await serviceEnseignants.ajouterDocumentAdministratif({
        enseignantId: enseignant.id,
        type: nouveauDocument.type,
        nom: nouveauDocument.nom.trim(),
        cheminFichier: nouveauDocument.cheminFichier || "document.pdf",
        statut: "actif"
      })

      setDocuments(prev => [...prev, document])
      setShowAddForm(false)
      setNouveauDocument({
        type: "contrat",
        nom: "",
        cheminFichier: ""
      })
      onSuccess?.()
    } catch (error) {
      console.error("Erreur lors de l'ajout du document:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSupprimerDocument = (documentId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      // Mettre à jour le statut à "supprime"
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? { ...doc, statut: "supprime" as const }
            : doc
        )
      )
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

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents administratifs
            <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bouton ajouter document */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Documents actifs: {documentsActifs.length}
              </h3>
              <p className="text-sm text-gray-500">
                Gérez les documents administratifs de l'enseignant
              </p>
            </div>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un document
            </Button>
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Nouveau document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="typeDocument">Type de document</Label>
                    <Select
                      value={nouveauDocument.type}
                      onValueChange={(value: DocumentAdministratif["type"]) =>
                        setNouveauDocument(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contrat">Contrat de travail</SelectItem>
                        <SelectItem value="diplome">Diplôme</SelectItem>
                        <SelectItem value="certificat">Certificat</SelectItem>
                        <SelectItem value="attestation">Attestation</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nomDocument">Nom du document</Label>
                    <Input
                      id="nomDocument"
                      placeholder="Ex: Contrat 2024"
                      value={nouveauDocument.nom}
                      onChange={(e) => setNouveauDocument(prev => ({ ...prev, nom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAjouterDocument} disabled={loading || !nouveauDocument.nom.trim()}>
                    {loading ? "Ajout en cours..." : "Ajouter"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Documents</CardTitle>
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
                        <Button variant="ghost" size="sm" title="Voir">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Télécharger">
                          <Download className="h-4 w-4" />
                        </Button>
                        {document.statut === "actif" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSupprimerDocument(document.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnvoyerDocument(document.id)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Envoyer"
                              disabled={document.envoye}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {document.envoye && (
                          <Badge className="bg-blue-100 text-blue-800 ml-2">Envoyé</Badge>
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
