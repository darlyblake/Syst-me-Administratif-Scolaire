"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, MessageSquare, Users, Clock } from "lucide-react"
import Link from "next/link"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant, Contact } from "@/types/models"
import { ContacterProfesseurModal } from "@/components/ContacterProfesseurModal"

export default function ContacterEnseignantPage() {
  const params = useParams()
  const router = useRouter()
  const enseignantId = params.enseignantId as string

  const [enseignant, setEnseignant] = useState<DonneesEnseignant | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [historiqueContacts, setHistoriqueContacts] = useState<Contact[]>([])

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
      // TODO: Charger l'historique des contacts quand la méthode sera implémentée
      // setHistoriqueContacts(serviceEnseignants.obtenirHistoriqueContacts(enseignantId))
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

  const getStatutColor = (statut: Contact["statut"]) => {
    switch (statut) {
      case "envoye": return "bg-blue-100 text-blue-800"
      case "lu": return "bg-green-100 text-green-800"
      case "repondu": return "bg-purple-100 text-purple-800"
      case "archive": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeIcon = (type: Contact["type"]) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />
      case "telephone": return <Phone className="h-4 w-4" />
      case "sms": return <MessageSquare className="h-4 w-4" />
      case "reunion": return <Users className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
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
                Contacter - {enseignant.prenom} {enseignant.nom}
              </h1>
              <p className="text-gray-600">
                Envoyez des messages et consultez l'historique de communication
              </p>
            </div>
          </div>
        </div>

        {/* Informations de contact */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations de contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Coordonnées</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-gray-600">{enseignant.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Téléphone</p>
                      <p className="text-sm text-gray-600">{enseignant.telephone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Statut</h4>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(enseignant.statut)}>
                    {enseignant.statut}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {enseignant.statut === "actif" ? "Disponible pour la communication" : "Communication restreinte"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions principales */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Nouveau message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Envoyez un message à l'enseignant via différents canaux de communication.
              </p>
              <Button onClick={() => setShowModal(true)} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Rédiger un message
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Consultez l'historique des communications avec cet enseignant.
              </p>
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">
                  {historiqueContacts.length} communication(s) trouvée(s)
                </p>
                <Button variant="outline" className="w-full">
                  Voir l'historique complet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historique des contacts récents */}
        {historiqueContacts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Communications récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historiqueContacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(contact.type)}
                      <div>
                        <p className="font-medium text-sm">
                          {contact.sujet || "Message"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(contact.dateEnvoi).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatutColor(contact.statut)}>
                      {contact.statut}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de contact */}
        <ContacterProfesseurModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          enseignant={enseignant}
          onSuccess={() => {
            setShowModal(false)
            // TODO: Recharger l'historique des contacts
          }}
        />
      </div>
    </div>
  )
}
