"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, Download, CreditCard } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: string
  studentId: string
  amount: number
  type: "inscription" | "scolarite" | "tranche"
  date: string
  method: "especes" | "cheque" | "virement"
  reference?: string
  notes?: string
}

interface StudentData {
  id: string
  nom: string
  prenom: string
  classe: string
  nomParent: string
  totalAPayer: number
}

export default function PaymentHistoryPage() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get("student")

  const [student, setStudent] = useState<StudentData | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [allPayments, setAllPayments] = useState<Payment[]>([])

  useEffect(() => {
    const students = JSON.parse(localStorage.getItem("students") || "[]")
    const savedPayments = JSON.parse(localStorage.getItem("payments") || "[]")

    setAllPayments(savedPayments)

    if (studentId) {
      const foundStudent = students.find((s: StudentData) => s.id === studentId)
      if (foundStudent) {
        setStudent(foundStudent)
        const studentPayments = savedPayments.filter((p: Payment) => p.studentId === studentId)
        setPayments(studentPayments)
      }
    } else {
      setPayments(savedPayments)
    }
  }, [studentId])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "inscription":
        return "Inscription"
      case "scolarite":
        return "Scolarité"
      case "tranche":
        return "Tranche"
      default:
        return type
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "especes":
        return "Espèces"
      case "cheque":
        return "Chèque"
      case "virement":
        return "Virement"
      default:
        return method
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = student ? student.totalAPayer - totalPaid : 0

  const exportToCSV = () => {
    const headers = ["Date", "Élève", "Type", "Montant", "Mode", "Référence"]
    const csvContent = [
      headers.join(","),
      ...payments.map((payment) => {
        const studentInfo = student || { nom: "Inconnu", prenom: "" }
        return [
          payment.date,
          `${studentInfo.prenom} ${studentInfo.nom}`,
          getTypeLabel(payment.type),
          payment.amount,
          getMethodLabel(payment.method),
          payment.reference || "",
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historique_paiements_${student?.id || "tous"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/payments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historique des paiements</h1>
              <p className="text-gray-600">
                {student ? `${student.prenom} ${student.nom} - ${student.classe}` : "Tous les élèves"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            {student && (
              <Button asChild>
                <Link href={`/add-payment?student=${student.id}`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nouveau paiement
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Résumé financier */}
        {student && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{student.totalAPayer.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total à payer (FCFA)</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total payé (FCFA)</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{remaining.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Reste à payer (FCFA)</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{payments.length}</div>
                  <div className="text-sm text-gray-600">Nombre de paiements</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liste des paiements */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des paiements</CardTitle>
            <CardDescription>
              {payments.length} paiement{payments.length > 1 ? "s" : ""} enregistré{payments.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium">Paiement N° {payment.id}</div>
                            <div className="text-sm text-gray-600">{payment.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getTypeLabel(payment.type)}</Badge>
                          <Badge variant="secondary">{getMethodLabel(payment.method)}</Badge>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{payment.amount.toLocaleString()} FCFA</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Type:</span> {getTypeLabel(payment.type)}
                        </div>
                        <div>
                          <span className="font-medium">Mode:</span> {getMethodLabel(payment.method)}
                        </div>
                        {payment.reference && (
                          <div>
                            <span className="font-medium">Référence:</span> {payment.reference}
                          </div>
                        )}
                      </div>

                      {payment.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {payment.notes}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/payment-receipt?id=${payment.id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            Voir le reçu
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
