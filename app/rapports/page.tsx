"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileDown, BarChart2, PieChart, DollarSign } from "lucide-react"
import Link from "next/link"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { EleveAvecSuivi } from "@/types/models"
import type { Paiement } from "@/types/models"

interface MonthlyRevenue {
  name: string
  Recettes: number
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportsPage() {
  const [students, setStudents] = useState<EleveAvecSuivi[]>([])
  const [payments, setPayments] = useState<Paiement[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [classes, setClasses] = useState<string[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  useEffect(() => {
    const allStudents = serviceEleves.obtenirElevesAvecSuiviFinancier()
    const allPayments = servicePaiements.obtenirTousLesPaiements()
    setStudents(allStudents)
    setPayments(allPayments)
    setClasses(serviceEleves.obtenirClassesActives())

    const months = [...new Set(allPayments.map(p => {
      const date = new Date(p.datePaiement)
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    }))].sort().reverse() // Sort months in reverse chronological order

    setAvailableMonths(months)
  }, [])

  // 1. Filtrer par classe
  const studentsFilteredByClass = selectedClass === "all"
    ? students
    : students.filter(s => s.classe === selectedClass)

  // 2. Filtrer par mois
  const paymentsFilteredByMonth = selectedMonth === "all"
    ? payments
    : payments.filter(p => {
        const date = new Date(p.datePaiement)
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        return monthYear === selectedMonth
      })

  // Appliquer les deux filtres
  const studentIdsInClass = new Set(studentsFilteredByClass.map(s => s.id))
  const finalFilteredPayments = paymentsFilteredByMonth.filter(p => studentIdsInClass.has(p.eleveId))
  const finalFilteredStudents = selectedMonth === "all" ? studentsFilteredByClass : students.filter(s => finalFilteredPayments.some(p => p.eleveId === s.id))

  // Calcul des statistiques financières
  const totalDette = finalFilteredStudents.reduce((sum, s) => sum + s.detteTotaleGlobale, 0)
  const totalRecettes = finalFilteredPayments.reduce((sum, p) => sum + p.montant, 0)
  const soldeRestant = totalDette - totalRecettes

  const paidStudents = finalFilteredStudents.filter(s => s.pourcentagePaye === 100).length
  const partialStudents = finalFilteredStudents.filter(s => s.pourcentagePaye > 0 && s.pourcentagePaye < 100).length
  const unpaidStudents = finalFilteredStudents.filter(s => s.pourcentagePaye === 0).length

  const paymentStatusData = [
    { name: "À jour", value: paidStudents, color: "#22c55e" },
    { name: "Partiel", value: partialStudents, color: "#f97316" },
    { name: "Impayé", value: unpaidStudents, color: "#ef4444" },
  ]

  // Calcul des recettes par mois
  const monthlyRevenue: MonthlyRevenue[] = finalFilteredPayments.reduce((acc, payment) => {
    const month = new Date(payment.datePaiement).toLocaleString('fr-FR', { month: 'short' })
    const year = new Date(payment.datePaiement).getFullYear().toString().slice(-2)
    const monthYear = `${month}. ${year}`

    let monthData = acc.find(m => m.name === monthYear)
    if (monthData) monthData.Recettes += payment.montant
    else acc.push({ name: monthYear, Recettes: payment.montant })
    return acc
  }, [] as MonthlyRevenue[])

  // Fonction d'export CSV
  const exportToCSV = () => {
    const headers = ["ID", "Prénom", "Nom", "Classe", "Total Dû (FCFA)", "Total Payé (FCFA)", "Solde Restant (FCFA)", "Statut Paiement (%)"]
    const rows = finalFilteredStudents.map(s => [
      s.identifiant,
      s.prenom,
      s.nom,
      s.classe,
      s.detteTotaleGlobale,
      s.totalPayeGlobal,
      s.resteAPayerGlobal,
      s.pourcentagePaye.toFixed(0)
    ].join(","))

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `rapport_financier_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    try {
      link.click()
    } finally {
      // Ne retirer le lien que s'il est toujours présent dans le DOM
      if (link.parentNode) link.parentNode.removeChild(link)
    }
  }

  // Données formatées pour Chart.js
  const barChartData = {
    labels: monthlyRevenue.map(d => d.name),
    datasets: [
      {
        label: 'Recettes (FCFA)',
        data: monthlyRevenue.map(d => d.Recettes),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: paymentStatusData.map(d => d.name),
    datasets: [
      {
        label: 'Nombre d\'élèves',
        data: paymentStatusData.map(d => d.value),
        backgroundColor: paymentStatusData.map(d => d.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/tableau-bord">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapports Financiers</h1>
              <p className="text-gray-600">Analyse détaillée des finances de l'établissement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map(classe => (
                  <SelectItem key={classe} value={classe}>
                    {classe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par mois" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {availableMonths.map(month => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-02').toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Exporter en CSV
            </Button>
          </div>
        </div>

        {/* Indicateurs Clés */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recettes Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalRecettes.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dette Globale</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalDette.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Restant à Payer</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{soldeRestant.toLocaleString()} FCFA</div>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />Recettes par Mois</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar options={chartOptions} data={barChartData} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Statut des Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex justify-center items-center">
                <Pie data={pieChartData} options={{...chartOptions, plugins: { legend: { position: 'top' }}}} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau détaillé */}
        <Card>
          <CardHeader>
            <CardTitle>Rapport Financier par Élève</CardTitle>
            <CardDescription>Liste détaillée de la situation financière de chaque élève.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead className="text-right">Total Dû</TableHead>
                    <TableHead className="text-right">Total Payé</TableHead>
                    <TableHead className="text-right">Solde Restant</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalFilteredStudents.length > 0 ? (
                    classes
                      .filter(classe => selectedClass === 'all' || selectedClass === classe)
                      .map(classe => (
                        <>
                          <TableRow key={`header-${classe}`} className="bg-gray-100 hover:bg-gray-100">
                            <TableCell colSpan={6} className="font-bold text-gray-800 py-2 px-4">{classe}</TableCell>
                          </TableRow>
                          {finalFilteredStudents
                            .filter(s => s.classe === classe)
                            .sort((a, b) => b.resteAPayerGlobal - a.resteAPayerGlobal)
                            .map(student => (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <div className="font-medium">{student.prenom} {student.nom}</div>
                                  <div className="text-sm text-muted-foreground">{student.identifiant}</div>
                                </TableCell>
                                <TableCell>{student.classe}</TableCell>
                                <TableCell className="text-right font-mono">{student.detteTotaleGlobale.toLocaleString()} FCFA</TableCell>
                                <TableCell className="text-right font-mono text-green-600">{student.totalPayeGlobal.toLocaleString()} FCFA</TableCell>
                                <TableCell className="text-right font-mono font-bold text-red-600">{student.resteAPayerGlobal.toLocaleString()} FCFA</TableCell>
                                <TableCell className="text-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full ${
                                        student.pourcentagePaye === 100 ? 'bg-green-500' :
                                        student.pourcentagePaye > 0 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${student.pourcentagePaye}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs">{student.pourcentagePaye.toFixed(0)}%</span>
                                </TableCell>
                              </TableRow>
                            ))}
                        </>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        Aucune donnée à afficher pour la sélection actuelle.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}