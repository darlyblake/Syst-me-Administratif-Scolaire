"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { serviceEnseignants } from "@/services/enseignants.service"
import { DocumentsAdministratifsModal } from "@/components/DocumentsAdministratifsModal"
import type { DonneesEnseignant } from "@/types/models"
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  Users,
  Edit,
  FileText,
  Clock,
  MessageSquare,
  History,
  Bell,
  Settings
} from "lucide-react"

interface EnseignantProfilePageProps {
  params: Promise<{
    enseignantId: string
  }>
}

export default function EnseignantProfilePage({ params }: EnseignantProfilePageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [enseignantId, setEnseignantId] = useState<string>("")
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      setEnseignantId(resolvedParams.enseignantId)
      chargerEnseignant(resolvedParams.enseignantId)
    }

    initializePage()
  }, [params])

  const chargerEnseignant = (id: string) => {
    try {
      const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
      const enseignantTrouve = enseignants.find((e: DonneesEnseignant) => e.id === id)

      if (enseignantTrouve) {
        setEnseignant(enseignantTrouve)
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'enseignant:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (!enseignant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enseignant non trouvé</h1>
          <p className="text-gray-600 mb-6">L'enseignant que vous recherchez n'existe pas ou a été supprimé.</p>
          <Button onClick={() => router.push("/enseignants")}>
            Retour à la liste des enseignants
          </Button>
        </div>
      </div>
    )
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800"
      case "inactif": return "bg-red-100 text-red-800"
      case "conge": return "bg-yellow-100 text-yellow-800"
      case "suspendu": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/enseignants")}
            className="mb-4"
          >
            ← Retour à la liste
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {enseignant.prenom} {enseignant.nom}
                </h1>
                <p className="text-gray-600">ID: {enseignant.identifiant}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatutColor(enseignant.statut)}>
                    {enseignant.statut}
                  </Badge>
                  <Badge variant="outline">
                    {enseignant.matieres.length} matière(s)
                  </Badge>
                  <Badge variant="outline">
                    {enseignant.classes.length} classe(s)
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/enseignants/${enseignant.id}/modifier`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                onClick={() => setShowDocumentsModal(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="emploi">Emploi du temps</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="matieres">Matières</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations personnelles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{enseignant.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Téléphone:</span>
                    <span className="text-sm font-medium">{enseignant.telephone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date de naissance:</span>
                    <span className="text-sm font-medium">
                      {new Date(enseignant.dateNaissance).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {enseignant.adresse && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Adresse:</span>
                      <span className="text-sm font-medium">{enseignant.adresse}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Date d'embauche:</span>
                    <span className="text-sm font-medium">
                      {new Date(enseignant.dateEmbauche).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Informations professionnelles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Informations professionnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-600">Statut:</span>
                    <Badge className={getStatutColor(enseignant.statut)} variant="secondary">
                      {enseignant.statut}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">Matières enseignées:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {enseignant.matieres.map((matiere, index) => (
                        <Badge key={index} variant="outline">
                          {matiere}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-600">Classes assignées:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {enseignant.classes.map((classe, index) => (
                        <Badge key={index} variant="outline">
                          {classe}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {enseignant.salaire && (
                    <div>
                      <span className="text-sm text-gray-600">Salaire:</span>
                      <span className="text-sm font-medium ml-2">
                        {enseignant.salaire.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="emploi">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Emploi du temps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/enseignants/${enseignant.id}/emploi-du-temps`)}
                >
                  Voir l'emploi du temps détaillé
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Classes assignées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enseignant.classes.map((classe, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{classe}</h3>
                          <p className="text-sm text-gray-600">Classe assignée</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matieres">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Matières enseignées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enseignant.matieres.map((matiere, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-green-600" />
                        <div>
                          <h3 className="font-medium">{matiere}</h3>
                          <p className="text-sm text-gray-600">Matière enseignée</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/enseignants/${enseignant.id}/contacter`)}
                >
                  Contacter cet enseignant
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/enseignants/${enseignant.id}/historique`)}
                >
                  Voir l'historique complet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Documents */}
      <DocumentsAdministratifsModal
        isOpen={showDocumentsModal}
        onClose={() => setShowDocumentsModal(false)}
        enseignant={enseignant}
      />
    </div>
  )
}
