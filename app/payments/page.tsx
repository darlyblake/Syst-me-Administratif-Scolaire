"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, CreditCard, AlertTriangle, CheckCircle, Plus } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { DonneesEleve } from "@/types/models"
import type { Paiement } from "@/types/models"

export default function PaymentsPage() {
  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [payments, setPayments] = useState<Paiement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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

  // Calculer le statut de paiement pour chaque élève
  const getPaymentStatus = (student: DonneesEleve) => {
    const studentPayments = payments.filter((p) => p.eleveId === student.id)
    const totalPaid = studentPayments.reduce((sum, p) => sum + p.montant, 0)
    const remaining = student.totalAPayer - totalPaid

    return {
      totalPaid,
      remaining,
      percentage: (totalPaid / student.totalAPayer) * 100,
      status: remaining <= 0 ? "paid" : remaining < student.totalAPayer ? "partial" : "unpaid",
    }
  }

  // Filtrer les élèves
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      searchTerm === "" ||
      student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesClass = selectedClass === "all" || student.classe === selectedClass

    return matchesSearch && matchesClass
  })

  // Statistiques
  const stats = {
    totalStudents: students.length,
    totalRevenue: payments.reduce((sum, p) => sum + p.montant, 0),
    paidStudents: students.filter((s) => getPaymentStatus(s).status === "paid").length,
    unpaidStudents: students.filter((s) => getPaymentStatus(s).status === "unpaid").length,
    partialStudents: students.filter((s) => getPaymentStatus(s).status === "partial").length,
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

        {/* Statistiques */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
                <div className="text-sm text-gray-600">Total élèves</div>
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="unpaid">Impayés</TabsTrigger>
            <TabsTrigger value="payments">Historique</TabsTrigger>
          </TabsList>

          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un élève..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
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
              </div>
            </CardContent>
          </Card>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>État des paiements par élève</CardTitle>
                <CardDescription>Suivi détaillé des paiements de chaque élève</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredStudents.map((student) => {
                    const paymentStatus = getPaymentStatus(student)
                    return (
                      <div key={student.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">
                              {student.prenom} {student.nom} - {student.classe}
                            </div>
                            <div className="text-sm text-gray-600">
                              Parent: {student.nomParent} • {student.contactParent}
                            </div>
                          </div>
                          <Badge
                            variant={
                              paymentStatus.status === "paid"
                                ? "default"
                                : paymentStatus.status === "partial"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {paymentStatus.status === "paid" ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" /> À jour
                              </>
                            ) : paymentStatus.status === "partial" ? (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" /> Partiel
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" /> Impayé
                              </>
                            )}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Total à payer:</span>
                            <div className="font-bold">{student.totalAPayer.toLocaleString()} FCFA</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Payé:</span>
                            <div className="font-bold text-green-600">
                              {paymentStatus.totalPaid.toLocaleString()} FCFA
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Restant:</span>
                            <div className="font-bold text-red-600">
                              {paymentStatus.remaining.toLocaleString()} FCFA
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Progression:</span>
                            <div className="font-bold">{paymentStatus.percentage.toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* Barre de progression */}
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                paymentStatus.status === "paid"
                                  ? "bg-green-500"
                                  : paymentStatus.status === "partial"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(paymentStatus.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/add-payment?student=${student.id}`}>
                              <Plus className="h-3 w-3 mr-1" />
                              Ajouter paiement
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/payment-history?student=${student.id}`}>Historique</Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unpaid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Élèves avec impayés
                </CardTitle>
                <CardDescription>Liste des élèves ayant des arriérés de paiement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredStudents
                    .filter((student) => getPaymentStatus(student).status !== "paid")
                    .map((student) => {
                      const paymentStatus = getPaymentStatus(student)
                      return (
                        <div key={student.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-red-800">
                                {student.prenom} {student.nom} - {student.classe}
                              </div>
                              <div className="text-sm text-red-600">
                                Montant impayé: {paymentStatus.remaining.toLocaleString()} FCFA
                              </div>
                            </div>
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {paymentStatus.status === "partial" ? "Paiement partiel" : "Aucun paiement"}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 mb-3">Contact parent: {student.contactParent}</div>

                          <div className="flex gap-2">
                            <Button size="sm" asChild>
                              <Link href={`/add-payment?student=${student.id}`}>
                                <CreditCard className="h-3 w-3 mr-1" />
                                Enregistrer paiement
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline">
                              Relancer parent
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Historique des paiements</CardTitle>
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
      </div>
    </div>
  )
}
