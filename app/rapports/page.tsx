"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, BarChart3, PieChart, TrendingUp, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { DonneesEleve } from "@/types/models"
import type { Paiement } from "@/types/models"

export default function ReportsPage() {
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [payments, setPayments] = useState<Paiement[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [selectedClass, setSelectedClass] = useState("all")

  const classes = [
    "Maternelle",
    "CP1",
    "CP2",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
    "6ème",
    "5ème",
    "4ème",
    "3ème",
    "2nde L",
    "2nde S",
    "1ère A1",
    "1ère A2",
    "1ère B",
    "Terminale A1",
    "Terminale B",
    "Terminale D",
    "Terminale S",
  ]

  useEffect(() => {
    const savedStudents = serviceEleves.obtenirTousLesEleves()
    const savedPayments = servicePaiements.obtenirTousLesPaiements()
    setStudents(savedStudents)
    setPayments(savedPayments)
  }, [])

  // Statistiques générales
  const totalStudents = students.length
  const totalRevenue = payments.reduce((sum, p) => sum + p.montant, 0)
  const newInscriptions = students.filter((s) => s.typeInscription === "inscription").length
  const reinscriptions = students.filter((s) => s.typeInscription === "reinscription").length

  // Statistiques par classe
  const statsByClass = classes
    .map((classe) => {
      const classStudents = students.filter((s) => s.classe === classe)
      const classPayments = payments.filter((p) => {
        const student = students.find((s) => s.id === p.eleveId)
        return student?.classe === classe
      })
      const classRevenue = classPayments.reduce((sum, p) => sum + p.montant, 0)

      return {
        classe,
        students: classStudents.length,
        revenue: classRevenue,
        averageRevenue: classStudents.length > 0 ? classRevenue / classStudents.length : 0,
      }
    })
    .filter((stat) => stat.students > 0)

  // Statistiques par mode de paiement
  const paymentMethods = {
    especes: payments.filter((p) => p.methodePaiement === "especes").reduce((sum, p) => sum + p.montant, 0),
    cheque: payments.filter((p) => p.methodePaiement === "cheque").reduce((sum, p) => sum + p.montant, 0),
    virement: payments.filter((p) => p.methodePaiement === "virement").reduce((sum, p) => sum + p.montant, 0),
  }

  // Évolution mensuelle
  const monthlyStats = () => {
    const months: { [key: string]: { revenue: number; students: number } } = {}

    payments.forEach((payment) => {
      const date = new Date(payment.datePaiement)
      const month = `${date.getMonth() + 1}/${date.getFullYear()}`
      if (!months[month]) {
        months[month] = { revenue: 0, students: 0 }
      }
      months[month].revenue += payment.montant
    })

    students.forEach((student) => {
      const date = new Date(student.dateInscription)
      const month = `${date.getMonth() + 1}/${date.getFullYear()}`
      if (!months[month]) {
        months[month] = { revenue: 0, students: 0 }
      }
      months[month].students += 1
    })

    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const exportReport = (type: string) => {
    let csvContent = ""
    let filename = ""

    switch (type) {
      case "students":
        csvContent = [
          "ID,Nom,Prénom,Classe,Type,Date inscription,Total à payer",
          ...students.map(
            (s) =>
              `${s.id},${s.nom},${s.prenom},${s.classe},${s.typeInscription},${s.dateInscription},${s.totalAPayer}`,
          ),
        ].join("\n")
        filename = "rapport_eleves.csv"
        break

      case "payments":
        csvContent = [
          "ID Paiement,ID Élève,Montant,Type,Date,Mode",
          ...payments.map((p) => `${p.id},${p.eleveId},${p.montant},${p.typePaiement},${new Date(p.datePaiement).toLocaleDateString('fr-FR')},${p.methodePaiement}`),
        ].join("\n")
        filename = "rapport_paiements.csv"
        break

      case "classes":
        csvContent = [
          "Classe,Nombre élèves,Recettes,Moyenne par élève",
          ...statsByClass.map((s) => `${s.classe},${s.students},${s.revenue},${s.averageRevenue.toFixed(0)}`),
        ].join("\n")
        filename = "rapport_classes.csv"
        break
    }

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
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
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Rapports et Statistiques
              </h1>
              <p className="text-gray-600">Analyse des données scolaires et financières</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/recettes-mensuelles">
              <Calendar className="h-4 w-4 mr-2" />
              Recettes mensuelles
            </Link>
          </Button>
        </div>

        {/* Statistiques générales */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <div className="text-sm text-gray-600">Total élèves</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Recettes (FCFA)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{newInscriptions}</div>
                  <div className="text-sm text-gray-600">Nouvelles inscriptions</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{reinscriptions}</div>
                  <div className="text-sm text-gray-600">Réinscriptions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="classes">Par classe</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="evolution">Évolution</TabsTrigger>
            <TabsTrigger value="monthly">Mensuel</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Statistiques par classe
                </CardTitle>
                <CardDescription>Répartition des élèves et recettes par niveau</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statsByClass.map((stat) => (
                    <div key={stat.classe} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-lg">{stat.classe}</div>
                        <div className="text-sm text-gray-600">
                          {stat.students} élève{stat.students > 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Recettes totales:</span>
                          <div className="font-bold text-green-600">{stat.revenue.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Moyenne par élève:</span>
                          <div className="font-bold text-blue-600">{stat.averageRevenue.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Part du total:</span>
                          <div className="font-bold text-purple-600">
                            {((stat.revenue / totalRevenue) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(stat.revenue / totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par mode de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Espèces</span>
                      <span className="font-bold">{paymentMethods.especes.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Chèque</span>
                      <span className="font-bold">{paymentMethods.cheque.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Virement</span>
                      <span className="font-bold">{paymentMethods.virement.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analyse des paiements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <span>Total des paiements</span>
                      <span className="font-bold text-blue-600">{payments.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                      <span>Montant moyen</span>
                      <span className="font-bold text-green-600">
                        {payments.length > 0 ? (totalRevenue / payments.length).toLocaleString() : 0} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                      <span>Recettes totales</span>
                      <span className="font-bold text-purple-600">{totalRevenue.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evolution">
            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle</CardTitle>
                <CardDescription>Inscriptions et recettes par mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats().map((month) => (
                    <div key={month.month} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{month.month}</div>
                        <div className="text-sm text-gray-600">
                          {month.students} inscription{month.students > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Recettes:</span>
                          <div className="font-bold text-green-600">{month.revenue.toLocaleString()} FCFA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Nouvelles inscriptions:</span>
                          <div className="font-bold text-blue-600">{month.students}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Gestion mensuelle avancée</CardTitle>
                <CardDescription>Accédez à l'analyse détaillée des recettes par mois</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Calendar className="mx-auto h-16 w-16 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Recettes Mensuelles</h3>
                <p className="text-gray-600 mb-6">
                  Analysez vos recettes mois par mois avec des graphiques détaillés, des objectifs et des
                  recommandations personnalisées.
                </p>
                <Button asChild size="lg">
                  <Link href="/recettes-mensuelles">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Accéder aux recettes mensuelles
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Export des élèves</CardTitle>
                  <CardDescription>Liste complète des élèves inscrits</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => exportReport("students")} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter les élèves
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export des paiements</CardTitle>
                  <CardDescription>Historique complet des paiements</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => exportReport("payments")} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter les paiements
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export par classe</CardTitle>
                  <CardDescription>Statistiques détaillées par niveau</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => exportReport("classes")} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter par classe
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
