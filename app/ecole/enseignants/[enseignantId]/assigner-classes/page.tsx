"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BookOpen, Users, CheckCircle } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"
import { AssignerClassesModal } from "@/components/AssignerClassesModal"

export default function AssignerClassesPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (enseignantId) {
      chargerEnseignant()
    }
  }, [enseignantId])

  const chargerEnseignant = () => {
    setLoading(true)
    try {
      const data = serviceEnseignants.obtenirEnseignantParIdentifiant(enseignantId)
      setEnseignant(data)
    } catch (error) {
      console.error("Erreur lors du chargement de l'enseignant:", error)
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
                Assigner des classes - {enseignant.prenom} {enseignant.nom}
              </h1>
              <p className="text-gray-600">
                Gérez les classes assignées à l'enseignant
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
                  <p><span className="text-gray-500">Téléphone:</span> {enseignant.telephone}</p>
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
                <h4 className="font-medium text-gray-900 mb-2">Classes assignées</h4>
                <div className="flex flex-wrap gap-1">
                  {enseignant.classes.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucune classe assignée</p>
                  ) : (
                    enseignant.classes.map((classe, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {classe}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions principales */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Assigner des classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Utilisez cette fonctionnalité pour assigner ou modifier les classes de l'enseignant.
              </p>
              <Button onClick={() => setShowModal(true)} className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Gérer les classes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/enseignants/${enseignant.id}/emploi-du-temps`}>
                    Voir l'emploi du temps
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/enseignants/${enseignant.id}/contacter`}>
                    Contacter l'enseignant
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal d'assignation des classes */}
        <AssignerClassesModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          enseignant={enseignant}
          onSuccess={() => {
            chargerEnseignant() // Recharger les données de l'enseignant
            setShowModal(false)
          }}
        />
      </div>
    </div>
  )
}
