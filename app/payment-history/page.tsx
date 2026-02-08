"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Eye, Download, CreditCard } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { Paiement, EleveAvecSuivi } from "@/types/models"

export default function PaymentHistoryPage() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get("student")

  const [student, setStudent] = useState<EleveAvecSuivi | null>(null)
  const [payments, setPayments] = useState<Paiement[]>([])
  const [allPayments, setAllPayments] = useState<Paiement[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [methodFilter, setMethodFilter] = useState<string | null>(null)

  useEffect(() => {
    const savedPayments = servicePaiements.obtenirTousLesPaiements()
    setAllPayments(savedPayments)

    // Utiliser la fonction centralisée du service
    const studentsWithFinancials = serviceEleves.obtenirElevesAvecSuiviFinancier()

    if (studentId) {
      const foundStudent = studentsWithFinancials.find((s: EleveAvecSuivi) => s.id === studentId);

      if (foundStudent) {
        setStudent(foundStudent);
        // Filtrer les paiements pour cet élève uniquement
        const studentPayments = savedPayments.filter((p: Paiement) => p.eleveId === studentId);
        setPayments(studentPayments);
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
      case "autre":
        return "Autre"
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

  const exportToCSV = () => {
    // Exporter les paiements actuellement filtrés
    const filtered = getFilteredPayments()
    const headers = ["Date", "Élève", "Type", "Montant", "Mode", "Référence", "Mois/Tranches"]
    const csvContent = [
      headers.join(","),
      ...filtered.map((payment) => {
        const studentInfo = student || { nom: "Inconnu", prenom: "" }
        return [
          payment.datePaiement,
          `${studentInfo.prenom} ${studentInfo.nom}`,
          getTypeLabel(payment.typePaiement),
          payment.montant,
          getMethodLabel(payment.methodePaiement),
          (payment.description || "").replace(/,/g, ' '),
          (payment.moisPaiement || []).join("|")
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `historique_paiements_${student?.id || "tous"}.csv`
    try {
      a.click()
    } finally {
      try { URL.revokeObjectURL(url) } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a)
    }
  }

  const getFilteredPayments = (): Paiement[] => {
    return allPayments.filter((p) => {
      if (student && p.eleveId !== student.id) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        if (!((p.description || '').toLowerCase().includes(q) || getTypeLabel(p.typePaiement).toLowerCase().includes(q))) return false
      }
      if (typeFilter && p.typePaiement !== typeFilter) return false
      if (methodFilter && p.methodePaiement !== methodFilter) return false
      if (startDate) {
        const d = new Date(p.datePaiement)
        if (d < new Date(startDate)) return false
      }
      if (endDate) {
        const d = new Date(p.datePaiement)
        // include the end date day
        const end = new Date(endDate)
        end.setHours(23,59,59,999)
        if (d > end) return false
      }
      return true
    })
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
            {student && (
              <div className="flex items-center gap-4">
                {student.photo ? (
                  <img
                    src={student.photo}
                    alt={`${student.prenom} ${student.nom}`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-sm font-medium">
                      {student.prenom.charAt(0)}{student.nom.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.prenom} {student.nom}</h1>
                  <p className="text-gray-600">Classe: {student.classe} • ID: {student.identifiant}</p>
                </div>
              </div>
            )}
            {!student && (
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Historique des paiements</h1>
                <p className="text-gray-600">Tous les élèves</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Input placeholder="Rechercher (type, réf...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value || null)} className="w-[160px]" />
              <Input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value || null)} className="w-[160px]" />
              <Select value={typeFilter ?? 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="scolarite">Scolarité</SelectItem>
                  <SelectItem value="inscription">Inscription</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter ?? 'all'} onValueChange={(v) => setMethodFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
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
                  <div className="text-2xl font-bold text-blue-600">{student.detteTotaleGlobale.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total à payer (FCFA)</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{student.totalPayeGlobal.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total payé (FCFA)</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{student.resteAPayerGlobal.toLocaleString()}</div>
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
            <CardTitle>Historique des paiements</CardTitle>
            <CardDescription>
              {payments.length} paiement{payments.length > 1 ? "s" : ""} enregistré{payments.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Aucun paiement enregistré pour cet élève</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments
                  .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())
                  .map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        {getTypeLabel(payment.typePaiement)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(payment.datePaiement).toLocaleDateString('fr-FR')} • {getMethodLabel(payment.methodePaiement)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{payment.montant.toLocaleString()} FCFA</div>
                      {payment.description && <div className="text-xs text-gray-500">Réf: {payment.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
