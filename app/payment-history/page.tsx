"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, CreditCard, Wallet, TrendingUp, ReceiptText, UserRound, Search, CalendarRange, Filter } from "lucide-react"
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
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
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
                      className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                      <span className="text-white text-sm font-semibold">
                        {student.prenom.charAt(0)}{student.nom.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-300">
                      <UserRound className="h-4 w-4" />
                      Profil élève
                    </div>
                    <h1 className="text-2xl font-bold mt-1">{student.prenom} {student.nom}</h1>
                    <p className="text-sm text-slate-300">Classe: {student.classe} • ID: {student.identifiant}</p>
                  </div>
                </div>
              )}
              {!student && (
                <div>
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-300">
                    <ReceiptText className="h-4 w-4" />
                    Historique
                  </div>
                  <h1 className="text-2xl font-bold mt-1">Historique des paiements</h1>
                  <p className="text-sm text-slate-300">Tous les élèves</p>
                </div>
              )}
            </div>
            {student && (
              <Button asChild className="bg-white text-slate-900 hover:bg-slate-100">
                <Link href={`/add-payment?student=${student.id}`}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nouveau paiement
                </Link>
              </Button>
            )}
          </div>
        </div>

        {student && (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total à payer</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{student.detteTotaleGlobale.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-sky-100 p-2 text-sky-700"><Wallet className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total payé</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{student.totalPayeGlobal.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Reste à payer</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">{student.resteAPayerGlobal.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-rose-100 p-2 text-rose-700"><ReceiptText className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Nombre de paiements</p>
                    <p className="text-2xl font-bold text-violet-700 mt-1">{payments.length}</p>
                  </div>
                  <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><CreditCard className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Historique des paiements</CardTitle>
                <CardDescription>
                  {payments.length} paiement{payments.length > 1 ? "s" : ""} enregistré{payments.length > 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" className="rounded-xl">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-5">
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input placeholder="Rechercher (type, réf...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-xl border-slate-200 bg-white" />
              </div>
              <div className="relative">
                <CalendarRange className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input type="date" value={startDate ?? ''} onChange={(e) => setStartDate(e.target.value || null)} className="pl-10 rounded-xl border-slate-200 bg-white" />
              </div>
              <div className="relative">
                <CalendarRange className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input type="date" value={endDate ?? ''} onChange={(e) => setEndDate(e.target.value || null)} className="pl-10 rounded-xl border-slate-200 bg-white" />
              </div>
              <Select value={typeFilter ?? 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                  <Filter className="h-4 w-4 mr-2 text-slate-500" />
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
                <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                  <Filter className="h-4 w-4 mr-2 text-slate-500" />
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
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Aucun paiement enregistré pour cet élève</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments
                  .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())
                  .map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {getTypeLabel(payment.typePaiement)}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {new Date(payment.datePaiement).toLocaleDateString('fr-FR')} • {getMethodLabel(payment.methodePaiement)}
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="font-bold text-emerald-700">{payment.montant.toLocaleString()} FCFA</div>
                      {payment.description && <div className="text-xs text-slate-500 mt-1">Réf: {payment.description}</div>}
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
