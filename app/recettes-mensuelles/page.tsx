"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, TrendingUp, Calendar, DollarSign, BarChart3 } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: string
  studentId: string
  amount: number
  type: "inscription" | "scolarite" | "tranche"
  date: string
  method: "especes" | "cheque" | "virement"
}

interface StudentData {
  id: string
  nom: string
  prenom: string
  classe: string
}

interface MonthlyData {
  month: string
  year: string
  totalRecettes: number
  nombrePaiements: number
  recettesInscription: number
  recettesScolarite: number
  recettesTranches: number
  recettesEspeces: number
  recettesCheque: number
  recettesVirement: number
  objectifMensuel: number
  tauxRealisation: number
}

export default function RecettesMensuellesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<StudentData[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  const months = [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ]

  const years = ["2023", "2024", "2025", "2026"]

  useEffect(() => {
    const savedPayments = JSON.parse(localStorage.getItem("payments") || "[]")
    const savedStudents = JSON.parse(localStorage.getItem("students") || "[]")
    setPayments(savedPayments)
    setStudents(savedStudents)
  }, [])

  useEffect(() => {
    calculateMonthlyData()
  }, [payments, selectedYear])

  const calculateMonthlyData = () => {
    const monthlyStats: { [key: string]: MonthlyData } = {}

    // Initialiser tous les mois de l'année
    months.forEach((month) => {
      const key = `${selectedYear}-${month.value}`
      monthlyStats[key] = {
        month: month.label,
        year: selectedYear,
        totalRecettes: 0,
        nombrePaiements: 0,
        recettesInscription: 0,
        recettesScolarite: 0,
        recettesTranches: 0,
        recettesEspeces: 0,
        recettesCheque: 0,
        recettesVirement: 0,
        objectifMensuel: 50000000, // 50M FCFA par mois (à configurer)
        tauxRealisation: 0,
      }
    })

    // Calculer les données réelles
    payments.forEach((payment) => {
      const [day, month, year] = payment.date.split("/")
      if (year === selectedYear) {
        const key = `${year}-${month}`
        if (monthlyStats[key]) {
          monthlyStats[key].totalRecettes += payment.amount
          monthlyStats[key].nombrePaiements += 1

          // Par type
          if (payment.type === "inscription") monthlyStats[key].recettesInscription += payment.amount
          if (payment.type === "scolarite") monthlyStats[key].recettesScolarite += payment.amount
          if (payment.type === "tranche") monthlyStats[key].recettesTranches += payment.amount

          // Par méthode
          if (payment.method === "especes") monthlyStats[key].recettesEspeces += payment.amount
          if (payment.method === "cheque") monthlyStats[key].recettesCheque += payment.amount
          if (payment.method === "virement") monthlyStats[key].recettesVirement += payment.amount
        }
      }
    })

    // Calculer les taux de réalisation
    Object.values(monthlyStats).forEach((data) => {
      data.tauxRealisation = (data.totalRecettes / data.objectifMensuel) * 100
    })

    setMonthlyData(Object.values(monthlyStats))
  }

  const filteredData =
    selectedMonth === "all"
      ? monthlyData
      : monthlyData.filter((data) => {
          const monthIndex = months.findIndex((m) => m.label === data.month)
          return months[monthIndex]?.value === selectedMonth
        })

  const totalAnnuel = monthlyData.reduce((sum, data) => sum + data.totalRecettes, 0)
  const objectifAnnuel = monthlyData.reduce((sum, data) => sum + data.objectifMensuel, 0)
  const tauxRealisationAnnuel = (totalAnnuel / objectifAnnuel) * 100

  const exportMonthlyReport = () => {
    const headers = [
      "Mois",
      "Recettes totales",
      "Nb paiements",
      "Inscriptions",
      "Scolarité",
      "Tranches",
      "Objectif",
      "Taux réalisation",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredData.map((data) =>
        [
          data.month,
          data.totalRecettes,
          data.nombrePaiements,
          data.recettesInscription,
          data.recettesScolarite,
          data.recettesTranches,
          data.objectifMensuel,
          `${data.tauxRealisation.toFixed(1)}%`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `recettes_mensuelles_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Recettes Mensuelles
              </h1>
              <p className="text-gray-600">Suivi détaillé des recettes par mois</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportMonthlyReport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Résumé annuel */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{totalAnnuel.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total {selectedYear} (FCFA)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{objectifAnnuel.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Objectif {selectedYear} (FCFA)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{tauxRealisationAnnuel.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Taux réalisation</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {(
                      totalAnnuel / Math.max(monthlyData.filter((m) => m.totalRecettes > 0).length, 1)
                    ).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Moyenne mensuelle (FCFA)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="details">Détails par mois</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle des recettes - {selectedYear}</CardTitle>
                <CardDescription>Comparaison objectifs vs réalisations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredData.map((data) => (
                    <div key={data.month} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-lg">
                          {data.month} {data.year}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">{data.nombrePaiements} paiements</div>
                          <div
                            className={`text-sm font-medium ${
                              data.tauxRealisation >= 100
                                ? "text-green-600"
                                : data.tauxRealisation >= 75
                                  ? "text-orange-600"
                                  : "text-red-600"
                            }`}
                          >
                            {data.tauxRealisation.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-gray-600">Recettes réalisées</div>
                          <div className="text-xl font-bold text-green-600">
                            {data.totalRecettes.toLocaleString()} FCFA
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Objectif mensuel</div>
                          <div className="text-xl font-bold text-blue-600">
                            {data.objectifMensuel.toLocaleString()} FCFA
                          </div>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              data.tauxRealisation >= 100
                                ? "bg-green-500"
                                : data.tauxRealisation >= 75
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(data.tauxRealisation, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Détails par type */}
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <div className="text-blue-800 font-medium">Inscriptions</div>
                          <div className="text-blue-600">{data.recettesInscription.toLocaleString()} FCFA</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <div className="text-green-800 font-medium">Scolarité</div>
                          <div className="text-green-600">{data.recettesScolarite.toLocaleString()} FCFA</div>
                        </div>
                        <div className="bg-purple-50 p-2 rounded">
                          <div className="text-purple-800 font-medium">Tranches</div>
                          <div className="text-purple-600">{data.recettesTranches.toLocaleString()} FCFA</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Détails par mode de paiement</CardTitle>
                <CardDescription>Répartition des recettes par méthode de paiement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredData.map((data) => (
                    <div key={data.month} className="border rounded-lg p-4">
                      <h3 className="font-medium text-lg mb-4">
                        {data.month} {data.year}
                      </h3>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">Espèces</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            {data.recettesEspeces.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {data.totalRecettes > 0
                              ? ((data.recettesEspeces / data.totalRecettes) * 100).toFixed(1)
                              : 0}
                            % du total
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">Chèque</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">{data.recettesCheque.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">
                            {data.totalRecettes > 0 ? ((data.recettesCheque / data.totalRecettes) * 100).toFixed(1) : 0}
                            % du total
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="font-medium">Virement</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {data.recettesVirement.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {data.totalRecettes > 0
                              ? ((data.recettesVirement / data.totalRecettes) * 100).toFixed(1)
                              : 0}
                            % du total
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analyse de performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-800 mb-2">Meilleur mois</div>
                      {(() => {
                        const bestMonth = filteredData.reduce(
                          (max, current) => (current.totalRecettes > max.totalRecettes ? current : max),
                          filteredData[0] || { month: "Aucun", totalRecettes: 0 },
                        )
                        return (
                          <div>
                            <div className="text-lg font-bold text-green-600">{bestMonth.month}</div>
                            <div className="text-sm text-green-700">
                              {bestMonth.totalRecettes.toLocaleString()} FCFA
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="font-medium text-red-800 mb-2">Mois le plus faible</div>
                      {(() => {
                        const worstMonth = filteredData.reduce(
                          (min, current) => (current.totalRecettes < min.totalRecettes ? current : min),
                          filteredData[0] || { month: "Aucun", totalRecettes: 0 },
                        )
                        return (
                          <div>
                            <div className="text-lg font-bold text-red-600">{worstMonth.month}</div>
                            <div className="text-sm text-red-700">{worstMonth.totalRecettes.toLocaleString()} FCFA</div>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-800 mb-2">Tendance</div>
                      <div className="text-sm text-blue-700">
                        {(() => {
                          const activeMonths = filteredData.filter((m) => m.totalRecettes > 0)
                          if (activeMonths.length < 2) return "Données insuffisantes"

                          const firstHalf = activeMonths.slice(0, Math.floor(activeMonths.length / 2))
                          const secondHalf = activeMonths.slice(Math.floor(activeMonths.length / 2))

                          const avgFirst = firstHalf.reduce((sum, m) => sum + m.totalRecettes, 0) / firstHalf.length
                          const avgSecond = secondHalf.reduce((sum, m) => sum + m.totalRecettes, 0) / secondHalf.length

                          if (avgSecond > avgFirst) return "📈 Tendance à la hausse"
                          if (avgSecond < avgFirst) return "📉 Tendance à la baisse"
                          return "➡️ Tendance stable"
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const avgRealization =
                        filteredData.reduce((sum, m) => sum + m.tauxRealisation, 0) / Math.max(filteredData.length, 1)
                      const recommendations = []

                      if (avgRealization < 75) {
                        recommendations.push({
                          type: "warning",
                          title: "Objectifs non atteints",
                          desc: "Revoir la stratégie de recouvrement des frais",
                        })
                      }

                      const especes = filteredData.reduce((sum, m) => sum + m.recettesEspeces, 0)
                      const total = filteredData.reduce((sum, m) => sum + m.totalRecettes, 0)
                      if (total > 0 && especes / total > 0.7) {
                        recommendations.push({
                          type: "info",
                          title: "Trop d'espèces",
                          desc: "Encourager les paiements par chèque/virement",
                        })
                      }

                      const monthsWithLowPayments = filteredData.filter((m) => m.nombrePaiements < 10)
                      if (monthsWithLowPayments.length > 0) {
                        recommendations.push({
                          type: "warning",
                          title: "Faible activité",
                          desc: `${monthsWithLowPayments.length} mois avec peu de paiements`,
                        })
                      }

                      if (recommendations.length === 0) {
                        recommendations.push({
                          type: "success",
                          title: "Excellente performance",
                          desc: "Continuez sur cette lancée !",
                        })
                      }

                      return recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg ${
                            rec.type === "success"
                              ? "bg-green-50 border border-green-200"
                              : rec.type === "warning"
                                ? "bg-orange-50 border border-orange-200"
                                : "bg-blue-50 border border-blue-200"
                          }`}
                        >
                          <div
                            className={`font-medium mb-1 ${
                              rec.type === "success"
                                ? "text-green-800"
                                : rec.type === "warning"
                                  ? "text-orange-800"
                                  : "text-blue-800"
                            }`}
                          >
                            {rec.title}
                          </div>
                          <div
                            className={`text-sm ${
                              rec.type === "success"
                                ? "text-green-700"
                                : rec.type === "warning"
                                  ? "text-orange-700"
                                  : "text-blue-700"
                            }`}
                          >
                            {rec.desc}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
