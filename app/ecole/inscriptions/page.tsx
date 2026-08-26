"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  UserPlus,
  RotateCcw,
  ArrowRightLeft,
  BarChart3,
  Search,
  Printer,
  Eye,
  MoreHorizontal,
  CreditCard,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"
import { ActionCard } from "@/components/inscriptions/ActionCard"
import { KPICard } from "@/components/inscriptions/KPICard"

export default function InscriptionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"inscription" | "reinscription">("inscription")
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterClasse, setFilterClasse] = useState("")
  const [filterType, setFilterType] = useState<"all" | "inscription" | "reinscription">("all")

  // Données
  const allStudents = serviceEleves.obtenirTousLesEleves()
  const allPayments = servicePaiements.obtenirTousLesPaiements()

  // Classes uniques
  const classes = useMemo(
    () => Array.from(new Set(allStudents.map((s) => s.classe))).sort(),
    [allStudents]
  )

  // Filtrage
  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      const matchSearch =
        !searchTerm ||
        student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.identifiant?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchClasse = !filterClasse || student.classe === filterClasse
      const matchType =
        filterType === "all" || student.typeInscription === filterType

      return matchSearch && matchClasse && matchType
    })
  }, [allStudents, searchTerm, filterClasse, filterType])

  // KPIs
  const totalInscriptions = filteredStudents.length
  const totalNouvelles = filteredStudents.filter((s) => s.typeInscription === "inscription").length
  const totalReinscriptions = filteredStudents.filter((s) => s.typeInscription === "reinscription").length
  const totalFCFA = filteredStudents.reduce((sum, s) => sum + (s.totalAPayer || 0), 0)

  const handleNouvelleInscription = () => {
    setModalType("inscription")
    setSelectedStudentId(undefined)
    setShowModal(true)
  }

  const handleSuccess = () => {
    setShowModal(false)
    toast.success(
      modalType === "inscription" ? "Nouvelle inscription enregistrée !" : "Réinscription validée !",
      {
        description: "L'élève apparaît maintenant dans la liste.",
      }
    )
  }

  return (
    <div className="min-h-screen bg-creme p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header École Vivante */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild className="rounded-2xl">
              <Link href="/ecole/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-encre flex items-center gap-2">
                <UserPlus className="h-7 w-7 text-terre" />
                Inscriptions & Transferts
              </h1>
              <p className="text-pierre mt-1">
                Gérez les arrivées, réinscriptions et transferts de vos élèves en toute simplicité
              </p>
            </div>
          </div>
          <Button 
            onClick={handleNouvelleInscription}
            className="btn-eco bg-terre hover:bg-terre-dark text-white rounded-2xl px-5 py-2.5 shadow-soft"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Nouvelle inscription
          </Button>
        </div>

        {/* Actions rapides École Vivante */}
        <section>
          <h2 className="text-lg font-semibold text-encre mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-card">
            <ActionCard
              href="/ecole/inscriptions/nouvelle"
              title="Nouvelle inscription"
              description="Inscrire un nouvel élève"
              icon={UserPlus}
              color="terre"
            />
            <ActionCard
              href="/ecole/inscriptions/reinscription"
              title="Réinscription"
              description="Renouveler une inscription"
              icon={RotateCcw}
              color="soleil"
            />
            <ActionCard
              href="/ecole/inscriptions/transfert"
              title="Transfert"
              description="Envoyer ou recevoir un élève"
              icon={ArrowRightLeft}
              color="ambre"
            />
            <ActionCard
              href="/ecole/inscriptions/statistiques"
              title="Rapports"
              description="Statistiques & exports"
              icon={BarChart3}
              color="terre"
            />
          </div>
        </section>

        {/* KPIs École Vivante */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total inscrits"
              value={totalInscriptions}
              icon={Users}
              color="terre"
              trend={{ value: "8%", positive: true }}
            />
            <KPICard
              title="Nouvelles (mois)"
              value={totalNouvelles}
              icon={UserPlus}
              color="jardin"
              trend={{ value: "12", positive: true }}
            />
            <KPICard
              title="Réinscriptions"
              value={totalReinscriptions}
              icon={RotateCcw}
              color="terre"
            />
            <KPICard
              title="Total à payer"
              value={totalFCFA}
              icon={CreditCard}
              color="ambre"
              suffix="FCFA"
            />
          </div>
        </section>

        {/* Filtres École Vivante */}
        <Card className="bg-papier rounded-3xl shadow-soft">
          <CardContent className="pt-5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-pierre" />
                <Input
                  placeholder="Rechercher un élève (nom, matricule…)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 py-2.5 rounded-2xl border-terre/15 bg-creme/50 focus:outline-none focus:ring-2 focus:ring-terre/30 focus:border-terre/40 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterType === "all" 
                      ? "bg-terre text-white" 
                      : "bg-creme text-pierre hover:bg-terre-soft"
                  }`}
                >
                  Tous
                </button>
                {classes.slice(0, 3).map((classe) => (
                  <button
                    key={classe}
                    onClick={() => setFilterClasse(filterClasse === classe ? "" : classe)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filterClasse === classe 
                        ? "bg-terre text-white" 
                        : "bg-creme text-pierre hover:bg-terre-soft"
                    }`}
                  >
                    {classe}
                  </button>
                ))}
                <button
                  onClick={() => setFilterType("inscription")}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterType === "inscription" 
                      ? "bg-terre text-white" 
                      : "bg-creme text-pierre hover:bg-terre-soft"
                  }`}
                >
                  Nouvelles
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau École Vivante */}
        <Card className="bg-papier rounded-3xl shadow-soft overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-encre">Historique des inscriptions</CardTitle>
                <CardDescription className="text-pierre">
                  {filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} trouvé
                  {filteredStudents.length > 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-pierre border-b border-terre/8">
                    <th className="p-3.5 font-medium">Élève</th>
                    <th className="p-3.5 font-medium">Classe</th>
                    <th className="p-3.5 font-medium">Type</th>
                    <th className="p-3.5 font-medium">Statut</th>
                    <th className="p-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terre/6">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-pierre">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="font-medium text-encre">Aucune inscription trouvée</p>
                        <p className="text-sm mt-1">Modifiez vos filtres ou créez une nouvelle inscription</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="table-row-eco"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-terre-soft flex items-center justify-center text-terre font-semibold text-sm">
                              {student.prenom[0]}{student.nom[0]}
                            </div>
                            <div>
                              <p className="font-medium text-encre">
                                {student.prenom} {student.nom}
                              </p>
                              <p className="text-xs text-pierre font-mono">
                                {student.identifiant}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-pierre">{student.classe}</td>
                        <td className="p-4">
                          <Badge
                            variant="secondary"
                            className={
                              student.typeInscription === "inscription"
                                ? "bg-terre-soft text-terre"
                                : "bg-amber-50 text-ambre"
                            }
                          >
                            {student.typeInscription === "inscription" ? "Nouvelle" : "Réinscription"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={student.statut === "actif" ? "default" : "destructive"}
                            className={
                              student.statut === "actif"
                                ? "bg-green-50 text-jardin"
                                : "bg-red-50 text-rouge-terre"
                            }
                          >
                            {student.statut === "actif" ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-pierre hover:text-terre hover:bg-terre-soft">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/receipt?id=${student.id}`, "_blank")
                                }
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer reçu
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/ecole/students?id=${student.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir le dossier
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Nouvelle Inscription */}
      <NouvelleInscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        typeInscription={modalType}
        studentId={selectedStudentId}
      />
    </div>
  )
}
