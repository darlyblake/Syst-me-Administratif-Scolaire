"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, CreditCard, Plus, ChevronDown, ChevronUp, Calendar, Wallet, Users, CircleDollarSign, TrendingUp, PiggyBank, ReceiptText, BadgeAlert } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import { serviceParametres } from "@/services/parametres.service"
import { serviceClasses } from "@/services/classes.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import type { EleveAvecSuivi } from "@/types/models"
import type { Paiement } from "@/types/models"
import type { DonneesEleve } from "@/types/models"

export default function PaymentsPage() {
  const router = useRouter()
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? "demo-establishment"
  const { data: supabaseStudents, isLoading: isLoadingSupabase } = useStudents(establishmentId)

  const mappedSupabaseStudents = useMemo<DonneesEleve[]>(() => {
    return (supabaseStudents ?? []).map((student) => ({
      id: student.id,
      identifiant: student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || "",
      classe: "",
      nomParent: "",
      contactParent: "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: (student.status === "active" ? "actif" : student.status === "inactive" ? "inactif" : "actif") as DonneesEleve["statut"],
      totalAPayer: 0,
      typeInscription: "inscription",
      informationsContact: {
        telephone: student.phone || "",
        email: student.email || "",
        adresse: "",
      },
      modePaiement: "mensuel",
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
      moisPaiement: [],
      optionsPersonnalisees: [],
    }))
  }, [supabaseStudents])

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
    const studentsWithFinancials = serviceEleves.obtenirElevesAvecSuiviFinancier()
    const paramsEcole = serviceParametres.obtenirParametres()
    const classesEnregistrees = serviceClasses.obtenirToutesLesClasses()
    const classesDepuisEleves = serviceEleves.obtenirClassesActives()
    const classesDisponibles = Array.from(
      new Set([
        ...classesEnregistrees.map((classe) => classe.nom).filter(Boolean),
        ...classesDepuisEleves,
      ])
    ).sort((a, b) => a.localeCompare(b, "fr"))

    const nextStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
    const nextStudentsWithTracking = mappedSupabaseStudents.length > 0
      ? mappedSupabaseStudents.map((student) => ({
          ...student,
          detteScolarite: 0,
          detteTotaleGlobale: 0,
          totalPayeScolarite: 0,
          totalPayeGlobal: 0,
          resteAPayerScolarite: 0,
          resteAPayerGlobal: 0,
          pourcentagePaye: 0,
          moisRestants: [],
          tranchesRestantes: [],
          optionsRestantes: [],
        } as EleveAvecSuivi))
      : studentsWithFinancials

    setStudents(nextStudents)
    setPayments(servicePaiements.obtenirTousLesPaiements())
    setStudentsWithTracking(nextStudentsWithTracking)
    setClasses(classesDisponibles)
    setSelectedAnneeAcademique(paramsEcole.anneeAcademique || "")
    setModePaiementEcole(paramsEcole.modePaiement || null)
    setParametresPaiement(serviceParametres.obtenirParametresPaiement())
    setDataLoaded(true)
  }, [mappedSupabaseStudents])

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
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/ecole/tableau-bord">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-300">
                  <CreditCard className="h-4 w-4" />
                  Finance scolaire
                </div>
                <h1 className="text-2xl font-bold mt-1">Suivi des Paiements</h1>
                <p className="text-sm text-slate-300">Gestion des frais de scolarité, paiements et encours.</p>
              </div>
            </div>
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/ecole/paiements/nouveau">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau paiement
              </Link>
            </Button>
          </div>
        </div>

        {/* Section d'initialisation des données de test */}
        {dataLoaded && students.length === 0 && classes.length === 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-blue-400 mb-4" />
              <h3 className="font-semibold text-blue-800">Prêt à commencer !</h3>
              <p className="text-sm text-blue-700 mt-2">Aucune donnée trouvée. Commencez par configurer les <Link href="/ecole/settings" className="font-bold underline">paramètres de l'école</Link> et <Link href="/ecole/inscriptions/nouvelle" className="font-bold underline">inscrire votre premier élève</Link>.</p>
            </CardContent>
          </Card>
        )}


        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Dette totale</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{stats.totalDetteGlobale.toLocaleString()} FCFA</p>
                </div>
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700"><Wallet className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">À jour</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.paidStudents}</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><Users className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Partiels</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{stats.partialStudents}</p>
                </div>
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><CircleDollarSign className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Impayés</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{stats.unpaidStudents}</p>
                </div>
                <div className="rounded-xl bg-rose-100 p-2 text-rose-700"><BadgeAlert className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Recettes</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">{stats.totalRevenue.toLocaleString()} FCFA</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-4 flex-wrap">
                <Select onValueChange={setSelectedAnneeAcademique} value={selectedAnneeAcademique}>
                  <SelectTrigger className="w-[180px] rounded-xl border-slate-200 bg-white">
                    <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Année Académique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48 rounded-xl border-slate-200 bg-white">
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
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Rechercher élève (Nom/ID)"
                    className="pl-10 rounded-xl border-slate-200 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={() => setPaiementModalOpen(true)} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un Paiement
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="financial-tracking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-200 p-1">
            <TabsTrigger value="financial-tracking" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900">Suivi Financier par Classe</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900">Historique Global des Transactions</TabsTrigger>
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
                <Card className="mb-6 rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-xl">{selectedClass} ({studentsInClass.length} élèves)</CardTitle>
                        <CardDescription>Tableau de suivi financier</CardDescription>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handlePrintClasse(selectedClass, studentsInClass, months.map(m => m.key), isTranches)}>
                        Imprimer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full table-auto bg-white">
                        <thead>
                          <tr className="bg-slate-900 text-left text-white">
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
                <Card key={classe} className="mb-4 rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-slate-50/80 border-b border-slate-100">
                    <div>
                      <CardTitle className="text-xl">{classe} ({studentsInClass.length} élèves)</CardTitle>
                      <CardDescription>Encours et suivi de paiement par élève</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setExpandedStudent(expandedStudent === classe ? null : classe)}
                    >
                      {expandedStudent === classe ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {expandedStudent === classe ? "Réduire" : "Afficher"}
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
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between mb-3 px-4 pt-4">
                                <h4 className="font-semibold text-slate-900">{classe} — {studentsInClass.length} élèves</h4>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-slate-500">Affichage : Tableau</div>
                                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handlePrintClasse(classe, studentsInClass, months.map(m => m.key), isTranches)}>
                                    Imprimer
                                  </Button>
                                </div>
                              </div>

                              <table className="min-w-full table-auto bg-white">
                                <thead>
                                  <tr className="bg-slate-900 text-left text-white">
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
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-slate-900 p-2 text-white"><ReceiptText className="h-4 w-4" /></div>
                  <div>
                    <CardTitle>Historique Global des Transactions</CardTitle>
                    <CardDescription>Tous les paiements enregistrés</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {payments
                    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())
                    .map((payment) => {
                      const student = students.find((s) => s.id === payment.eleveId)
                      return (
                        <div key={payment.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {student ? `${student.prenom} ${student.nom}` : "Élève inconnu"}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              {new Date(payment.datePaiement).toLocaleDateString('fr-FR')} • {payment.typePaiement} • {payment.methodePaiement}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-700">{payment.montant.toLocaleString()} FCFA</div>
                            {payment.description && <div className="text-xs text-slate-500 mt-1">Réf: {payment.description}</div>}
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
