"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, UserPlus, Calendar, CreditCard, Search, Filter, Printer, Clock, BarChart3, ArrowRightLeft } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"

export default function InscriptionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"inscription" | "reinscription">("inscription")
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClasse, setFilterClasse] = useState("")

  const allStudents = serviceEleves.obtenirTousLesEleves()
  const allPayments = servicePaiements.obtenirTousLesPaiements()

  // Filtrer les inscriptions
  const filteredStudents = allStudents.filter(student => {
    const matchSearch = !searchTerm || 
      student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.prenom.toLowerCase().includes(searchTerm.toLowerCase())
    const matchClasse = !filterClasse || student.classe === filterClasse
    return matchSearch && matchClasse
  })

  // Obtenir les classes uniques
  const classes = Array.from(new Set(allStudents.map(s => s.classe)))

  // Simuler l'utilisateur connecté pour l'historique
  const utilisateurConnecte = "Admin"

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/ecole/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                Inscriptions
              </h1>
              <p className="text-gray-600">Gestion des inscriptions des élèves</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setModalType("inscription"); setSelectedStudentId(undefined); setShowModal(true) }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nouvelle Inscription
            </Button>
            <Button variant="outline" onClick={() => { setModalType("reinscription"); setSelectedStudentId(undefined); setShowModal(true) }}>
              <Clock className="mr-2 h-4 w-4" />
              Réinscription
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ecole/inscriptions/transfert">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfert d'élève
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ecole/inscriptions/statistiques">
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistiques
              </Link>
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom ou prénom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={filterClasse}
                  onChange={(e) => setFilterClasse(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map(classe => (
                    <option key={classe} value={classe}>{classe}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredStudents.length}</p>
                  <p className="text-sm text-gray-600">Total Inscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allPayments.filter(p => p.typePaiement === 'inscription').length}
                  </p>
                  <p className="text-sm text-gray-600">Paiements Inscription</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredStudents.filter(s => s.typeInscription === 'reinscription').length}
                  </p>
                  <p className="text-sm text-gray-600">Réinscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredStudents.reduce((sum, s) => sum + s.totalAPayer, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total FCFA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des inscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des Inscriptions</CardTitle>
            <CardDescription>Liste de toutes les inscriptions enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Élève</th>
                    <th className="text-left p-3">Classe</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Inscrit par</th>
                    <th className="text-right p-3">Montant</th>
                    <th className="text-center p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        <p className="font-medium">{student.prenom} {student.nom}</p>
                        <p className="text-sm text-gray-600">{student.identifiant}</p>
                      </td>
                      <td className="p-3">{student.classe}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          student.typeInscription === 'inscription' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {student.typeInscription === 'inscription' ? 'Nouvelle' : 'Réinscription'}
                        </span>
                      </td>
                      <td className="p-3">
                        {new Date(student.dateInscription).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3">{utilisateurConnecte}</td>
                      <td className="p-3 text-right font-semibold">
                        {student.totalAPayer.toLocaleString()} FCFA
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          student.statut === 'actif' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.statut === 'actif' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/receipt?id=${student.id}`, '_blank')}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune inscription trouvée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal pour nouvelle inscription */}
        <NouvelleInscriptionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            window.location.reload()
          }}
          typeInscription={modalType}
          studentId={selectedStudentId}
        />
      </div>
    </div>
  )
}
