"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, CreditCard, AlertTriangle, CheckCircle, Plus, ChevronDown, ChevronUp, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import { serviceParametres } from "@/services/parametres.service"
import type { EleveAvecSuivi } from "@/types/models"
import type { Paiement } from "@/types/models"
import type { DonneesEleve } from "@/types/models"

export default function PaymentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [payments, setPayments] = useState<Paiement[]>([])
  const [studentsWithTracking, setStudentsWithTracking] = useState<EleveAvecSuivi[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedAnneeAcademique, setSelectedAnneeAcademique] = useState("")
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [classes, setClasses] = useState<string[]>([])
  const [paiementModalOpen, setPaiementModalOpen] = useState(false)
  const [studentForPaiement, setStudentForPaiement] = useState<EleveAvecSuivi | null>(null)
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({}) // Page actuelle par classe
  const studentsPerPage = 8 // Nombre d'élèves par page
  const [dataLoaded, setDataLoaded] = useState(false);
  const [parametresPaiement, setParametresPaiement] = useState<{ datePaiementMensuel: number; tranchesPaiement: any[] }>({ datePaiementMensuel: 5, tranchesPaiement: [] })
  const [modePaiementEcole, setModePaiementEcole] = useState<string | null>(null)

  useEffect(() => {
    // La logique de calcul est maintenant centralisée dans le service.
    const studentsWithFinancials = serviceEleves.obtenirElevesAvecSuiviFinancier()
    const classTariffs = serviceParametres.obtenirTarification()
    const paramsEcole = serviceParametres.obtenirParametres()

    // Mise à jour des états
    setStudents(serviceEleves.obtenirTousLesEleves())
    setPayments(servicePaiements.obtenirTousLesPaiements())
    setStudentsWithTracking(studentsWithFinancials)
    setClasses(classTariffs.map(t => t.classe))
    setSelectedAnneeAcademique(paramsEcole.anneeAcademique || "")
    setModePaiementEcole(paramsEcole.modePaiement || null)
    setParametresPaiement(serviceParametres.obtenirParametresPaiement())
    setDataLoaded(true);
  }, [])

  // Construire un mapping des paiements par élève pour consultation rapide
  const paiementsParEleve = payments.reduce<Record<string, import("@/types/models").Paiement[]>>((acc, p) => {
    acc[p.eleveId] = acc[p.eleveId] || []
    acc[p.eleveId].push(p)
    return acc
  }, {})

  // Imprimer un tableau pour une classe (ouvre une nouvelle fenêtre avec le contenu imprimable)
  const handlePrintClasse = (classe: string, studentsToPrint: EleveAvecSuivi[], months: string[], isTranches = false) => {
    if (typeof window === 'undefined') return
    const rows = studentsToPrint.map((s) => {
      const paiements = paiementsParEleve[s.id] || []
      const paidMonths = new Set<string>(paiements.flatMap(p => (p.moisPaiement || []).map((x: string) => x.toLowerCase())))
      const monthsCols = months.map(m => `<td style="text-align:center">${paidMonths.has(m.toLowerCase()) || paidMonths.has(m) ? '✓' : ''}</td>`).join('')
      return `<tr><td>${s.identifiant}</td><td>${s.nom}</td><td>${s.prenom}</td>${monthsCols}<td style="text-align:right">${s.detteTotaleGlobale?.toLocaleString?.() ?? '—'} FCFA</td><td style="text-align:right">${s.totalPayeGlobal?.toLocaleString?.() ?? '—'} FCFA</td></tr>`
    }).join('')

    const html = `
      <html>
        <head>
          <title>Impression - ${classe}</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f3f4f6; text-align: left; }
            td { font-family: Arial, sans-serif; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>${classe} — ${studentsToPrint.length} élèves</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Prénom</th>
                ${months.map(m => `<th style="text-align:center">${m}</th>`).join('')}
                <th style="text-align:right">Total dû</th><th style="text-align:right">Payé</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  // Statistiques
  const stats = {
    totalDetteGlobale: studentsWithTracking.reduce((sum, s) => sum + s.detteTotaleGlobale, 0),
    totalRevenue: payments.reduce((sum, p) => sum + p.montant, 0),
    paidStudents: studentsWithTracking.filter((s) => s.pourcentagePaye === 100).length,
    unpaidStudents: studentsWithTracking.filter((s) => s.pourcentagePaye === 0).length,
    partialStudents: studentsWithTracking.filter((s) => s.pourcentagePaye > 0 && s.pourcentagePaye < 100).length,
    totalStudents: students.length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Suivi des Paiements
              </h1>
              <p className="text-gray-600">Gestion des frais de scolarité et impayés</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau paiement
            </Link>
          </Button>
        </div>

        {/* Section d'initialisation des données de test */}
        {dataLoaded && students.length === 0 && classes.length === 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-blue-400 mb-4" />
              <h3 className="font-semibold text-blue-800">Prêt à commencer !</h3>
              <p className="text-sm text-blue-700 mt-2">Aucune donnée trouvée. Commencez par configurer les <Link href="/settings" className="font-bold underline">paramètres de l'école</Link> et <Link href="/add-student" className="font-bold underline">inscrire votre premier élève</Link>.</p>
            </CardContent>
          </Card>
        )}


        {/* Statistiques */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{stats.totalDetteGlobale.toLocaleString()} FCFA</div>
                <div className="text-sm text-gray-600">Dette totale</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.paidStudents}</div>
                <div className="text-sm text-gray-600">À jour</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.partialStudents}</div>
                <div className="text-sm text-gray-600">Partiels</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.unpaidStudents}</div>
                <div className="text-sm text-gray-600">Impayés</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{stats.totalRevenue.toLocaleString()} FCFA</div>
                <div className="text-sm text-gray-600">Recettes</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-4">
            {/* Filtre d'Année Académique */}
            <Select onValueChange={setSelectedAnneeAcademique} value={selectedAnneeAcademique}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Année Académique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-2026">2025-2026</SelectItem>
                <SelectItem value="2024-2025">2024-2025</SelectItem>
                <SelectItem value="2023-2024">2023-2024</SelectItem>
              </SelectContent>
            </Select>
            {/* Filtre de Classe existant */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((classe) => (
                  <SelectItem key={classe} value={classe}>
                    {classe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Barre de Recherche */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher élève (Nom/ID)"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={() => setPaiementModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un Paiement
          </Button>
        </div>

        <Tabs defaultValue="financial-tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="financial-tracking">Suivi Financier par Classe</TabsTrigger>
            <TabsTrigger value="history">Historique Global des Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="financial-tracking">
            {/* Vue tableau quand une classe spécifique est sélectionnée */}
            {selectedClass !== "all" && (() => {
              const studentsInClass = studentsWithTracking
                .filter(s => s.classe === selectedClass)
                .filter(s =>
                  s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.identifiant.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => b.resteAPayerScolarite - a.resteAPayerScolarite)

              if (studentsInClass.length === 0) return null

              // mêmes mois utilisés pour le tableau
              let months = [
                { key: 'septembre', label: 'Sep' },
                { key: 'octobre', label: 'Oct' },
                { key: 'novembre', label: 'Nov' },
                { key: 'decembre', label: 'Dec' },
                { key: 'janvier', label: 'Jan' },
                { key: 'fevrier', label: 'Feb' },
                { key: 'mars', label: 'Mar' },
                { key: 'avril', label: 'Apr' },
                { key: 'mai', label: 'May' },
                { key: 'juin', label: 'Jun' },
              ]
              let isTranches = false
              if (modePaiementEcole === 'tranches') {
                const tranches = parametresPaiement.tranchesPaiement || []
                if (Array.isArray(tranches) && tranches.length > 0) {
                  months = tranches.map((t: any) => ({ key: `tranche ${t.numero}`, label: t.nom || `T${t.numero}` }))
                  isTranches = true
                }
              }

              const currentPageNum = currentPage[selectedClass] || 1
              const totalPages = Math.ceil(studentsInClass.length / studentsPerPage)
              const startIndex = (currentPageNum - 1) * studentsPerPage
              const endIndex = startIndex + studentsPerPage
              const studentsToShow = studentsInClass.slice(startIndex, endIndex)

              return (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>{selectedClass} ({studentsInClass.length} élèves)</CardTitle>
                    <div className="flex items-center gap-2">
                      <CardDescription>Tableau</CardDescription>
                      <Button size="sm" variant="outline" onClick={() => handlePrintClasse(selectedClass, studentsInClass, months.map(m => m.key), isTranches)}>
                        Imprimer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto bg-white border">
                        <thead>
                          <tr className="bg-gray-100 text-left">
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Nom</th>
                            <th className="px-3 py-2">Prénom</th>
                            {months.map((m) => (
                              <th key={m.key} className="px-3 py-2 text-center">{m.label}</th>
                            ))}
                            <th className="px-3 py-2 text-right">Total dû</th>
                            <th className="px-3 py-2 text-right">Payé</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsToShow.map((student) => (
                            <tr key={student.id} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2">{student.identifiant}</td>
                              <td className="px-3 py-2 cursor-pointer text-blue-600" onClick={() => router.push(`/payment-history?student=${student.id}`)}>{student.nom}</td>
                              <td className="px-3 py-2 cursor-pointer text-blue-600" onClick={() => router.push(`/payment-history?student=${student.id}`)}>{student.prenom}</td>
                              {months.map((m) => {
                                const paiements = paiementsParEleve[student.id] || []
                                const paidMonths = new Set(paiements.flatMap(p => (p.moisPaiement || []).map(x => x.toLowerCase())))
                                const paid = paidMonths.has(m.key) || paidMonths.has(m.key.toLowerCase())
                                return (
                                  <td key={m.key} className="px-3 py-2 text-center">
                                    {paid ? <Badge variant="secondary">✓</Badge> : <span className="text-gray-300">—</span>}
                                  </td>
                                )
                              })}
                              <td className="px-3 py-2 text-right">{student.detteTotaleGlobale?.toLocaleString?.() ?? '—'} FCFA</td>
                              <td className="px-3 py-2 text-right">{student.totalPayeGlobal?.toLocaleString?.() ?? '—'} FCFA</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Contrôles de pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, [selectedClass]: Math.max(1, (prev[selectedClass] || 1) - 1) }))}
                          disabled={currentPageNum === 1}
                        >
                          Précédent
                        </Button>

                        <div className="flex gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(prev => ({ ...prev, [selectedClass]: page }))}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, [selectedClass]: Math.min(totalPages, (prev[selectedClass] || 1) + 1) }))}
                          disabled={currentPageNum === totalPages}
                        >
                          Suivant
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Vue par classe quand "Toutes les classes" est sélectionnée */}
            {selectedClass === "all" && classes.map((classe) => {
              // Appliquer le filtre de recherche ici
              const studentsInClass = studentsWithTracking
                .filter(s => s.classe === classe)
                .filter(s =>
                  s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.identifiant.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .sort((a, b) => b.resteAPayerScolarite - a.resteAPayerScolarite) // Impayés en premier

              if (studentsInClass.length === 0) return null

              return (
                <Card key={classe} className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-gray-50/50">
                    <CardTitle className="text-xl">{classe} ({studentsInClass.length} élèves)</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedStudent(expandedStudent === classe ? null : classe)}
                    >
                      {expandedStudent === classe ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {expandedStudent === classe ? "Réduire la liste" : "Afficher la liste"}
                    </Button>
                  </CardHeader>
                  {/* Utiliser un état pour contrôler le déploiement de la classe */}
                  {expandedStudent === classe && (
                    <CardContent className="pt-4">
                      {/* Pagination */}
                      {(() => {
                        // Définir les colonnes à afficher : mois classiques ou tranches selon la configuration de l'école
                        let months: { key: string; label: string }[] = [
                          { key: 'septembre', label: 'Sep' },
                          { key: 'octobre', label: 'Oct' },
                          { key: 'novembre', label: 'Nov' },
                          { key: 'decembre', label: 'Dec' },
                          { key: 'janvier', label: 'Jan' },
                          { key: 'fevrier', label: 'Feb' },
                          { key: 'mars', label: 'Mar' },
                          { key: 'avril', label: 'Apr' },
                          { key: 'mai', label: 'May' },
                          { key: 'juin', label: 'Jun' },
                        ]

                        let isTranches = false
                        if (modePaiementEcole === 'tranches') {
                          // utiliser les tranches configurées
                          const tranches = parametresPaiement.tranchesPaiement || []
                          if (Array.isArray(tranches) && tranches.length > 0) {
                            months = tranches.map((t: any) => ({ key: `tranche ${t.numero}`, label: t.nom || `T${t.numero}` }))
                            isTranches = true
                          }
                        }

                        const currentPageNum = currentPage[classe] || 1
                        const totalPages = Math.ceil(studentsInClass.length / studentsPerPage)
                        const startIndex = (currentPageNum - 1) * studentsPerPage
                        const endIndex = startIndex + studentsPerPage
                        const studentsToShow = studentsInClass.slice(startIndex, endIndex)

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">{classe} — {studentsInClass.length} élèves</h4>
                                  <div className="flex items-center gap-2">
                                  <div className="text-sm text-gray-600">Affichage : Tableau</div>
                                  <Button size="sm" variant="outline" onClick={() => handlePrintClasse(classe, studentsInClass, months.map(m => m.key), isTranches)}>
                                    Imprimer
                                  </Button>
                                </div>
                              </div>

                              <table className="min-w-full table-auto bg-white border">
                                <thead>
                                  <tr className="bg-gray-100 text-left">
                                    <th className="px-3 py-2">ID</th>
                                    <th className="px-3 py-2">Nom</th>
                                    <th className="px-3 py-2">Prénom</th>
                                    {months.map((m) => (
                                      <th key={m.key} className="px-3 py-2 text-center">{m.label}</th>
                                    ))}
                                    <th className="px-3 py-2 text-right">Total dû</th>
                                    <th className="px-3 py-2 text-right">Payé</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentsToShow.map((student) => (
                                    <tr key={student.id} className="border-t">
                                      <td className="px-3 py-2">{student.identifiant}</td>
                                      <td className="px-3 py-2">{student.nom}</td>
                                      <td className="px-3 py-2">{student.prenom}</td>
                                      {months.map((m) => {
                                        const paiements = paiementsParEleve[student.id] || []
                                        const paidMonths = new Set(paiements.flatMap(p => (p.moisPaiement || []).map(x => x.toLowerCase())))
                                        const paid = paidMonths.has(m.key) || paidMonths.has(m.key.toLowerCase())
                                        return (
                                          <td key={m.key} className="px-3 py-2 text-center">
                                            {paid ? <Badge variant="secondary">✓</Badge> : <span className="text-gray-300">—</span>}
                                          </td>
                                        )
                                      })}
                                      <td className="px-3 py-2 text-right">{student.detteTotaleGlobale?.toLocaleString?.() ?? '—'} FCFA</td>
                                      <td className="px-3 py-2 text-right">{student.totalPayeGlobal?.toLocaleString?.() ?? '—'} FCFA</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Contrôles de pagination */}
                            {totalPages > 1 && (
                              <div className="flex justify-center items-center gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(prev => ({ ...prev, [classe]: Math.max(1, (prev[classe] || 1) - 1) }))}
                                  disabled={currentPageNum === 1}
                                >
                                  Précédent
                                </Button>

                                <div className="flex gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                      key={page}
                                      variant={page === currentPageNum ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setCurrentPage(prev => ({ ...prev, [classe]: page }))}
                                      className="w-8 h-8 p-0"
                                    >
                                      {page}
                                    </Button>
                                  ))}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(prev => ({ ...prev, [classe]: Math.min(totalPages, (prev[classe] || 1) + 1) }))}
                                  disabled={currentPageNum === totalPages}
                                >
                                  Suivant
                                </Button>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique Global des Transactions</CardTitle>
                <CardDescription>Tous les paiements enregistrés</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments
                    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())
                    .map((payment) => {
                      const student = students.find((s) => s.id === payment.eleveId)
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">
                              {student ? `${student.prenom} ${student.nom}` : "Élève inconnu"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(payment.datePaiement).toLocaleDateString('fr-FR')} • {payment.typePaiement} • {payment.methodePaiement}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{payment.montant.toLocaleString()} FCFA</div>
                            {payment.description && <div className="text-xs text-gray-500">Réf: {payment.description}</div>}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modale pour ajouter un paiement */}
        {paiementModalOpen && studentForPaiement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Enregistrer un Paiement</h3>
                <button
                  onClick={() => setPaiementModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Paiement pour <strong>{studentForPaiement.prenom} {studentForPaiement.nom}</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (FCFA)</label>
                  <Input type="number" placeholder="50000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Méthode de Paiement</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="virement">Virement Bancaire</SelectItem>
                      <SelectItem value="mobile">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type de Paiement</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scolarite">Scolarité</SelectItem>
                      <SelectItem value="inscription">Frais d'Inscription</SelectItem>
                      <SelectItem value="option">Option Supplémentaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setPaiementModalOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
