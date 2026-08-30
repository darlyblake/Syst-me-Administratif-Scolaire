"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CreditCard, Plus, Search } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useEnrollments } from "@/hooks/useEnrollments"
import { useEstablishmentPaymentSummary, usePaymentList, usePayments } from "@/hooks/usePayments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { EnrollmentWithRelations } from "@/lib/supabase/types"

export default function PaymentsPage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { selectedYear } = useAcademicYears(establishmentId)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [method, setMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(false)

  const { enrollments, isLoading: loadingEnrollments } = useEnrollments({ establishmentId, academicYearId: selectedYear?.id ?? null, pageSize: 100 })
  const selectedStudentId = enrollments.find((item) => item.id === selectedEnrollmentId)?.student_id || null
  const { payments, total, totalPages, isLoading, error } = usePaymentList({ establishmentId, page, pageSize: 25, studentId: selectedStudentId, from: from || null, to: to || null, refreshKey })
  const { summary, isLoading: loadingSummary, error: summaryError } = useEstablishmentPaymentSummary(establishmentId, selectedYear?.id ?? null, refreshKey)
  const { schedule, isLoading: loadingSchedule, error: enrollmentError, create, isCreating } = usePayments(selectedEnrollmentId)

  const openForm = (enrollment?: EnrollmentWithRelations) => {
    setSelectedEnrollmentId(enrollment?.id || "")
    setAllocations({})
    setAmount("")
    setReference("")
    setNotes("")
    setShowForm(true)
  }

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedEnrollmentId || !amount) return
    const paymentId = await create({
      enrollmentId: selectedEnrollmentId,
      amount: Number(amount),
      reference,
      method,
      notes,
      allocations: Object.entries(allocations).filter(([, value]) => value !== "").map(([scheduleId, value]) => ({ schedule_id: scheduleId, amount: Number(value) })),
    })
    if (paymentId) {
      setShowForm(false)
      setRefreshKey((value) => value + 1)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white"><div className="flex items-center gap-4"><Button variant="outline" size="sm" asChild className="border-white/30 bg-white/10 text-white"><Link href="/ecole/tableau-bord"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button><div><p className="flex items-center gap-2 text-sm text-slate-300"><CreditCard className="h-4 w-4" />Finance scolaire</p><h1 className="text-2xl font-bold">Suivi des paiements</h1></div></div><Button onClick={() => openForm()} className="bg-white text-slate-900"><Plus className="mr-2 h-4 w-4" />Nouveau paiement</Button></header>
      {(estEnCoursDeChargement || isLoading || loadingSummary) && <p className="text-sm text-slate-600">Chargement des données financières...</p>}
      {(error || summaryError) && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || summaryError}</p>}
      <div className="grid gap-4 md:grid-cols-4">{[["Attendu", summary?.expected], ["Payé", summary?.paid], ["Reste", summary?.remaining], ["Retards", summary?.overdue]].map(([label, value]) => <Card key={label as string}><CardContent className="p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold">{typeof value === "number" ? `${value.toLocaleString()} FCFA` : "-"}</p></CardContent></Card>)}</div>
      <Card><CardContent className="flex flex-wrap gap-3 p-4"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} disabled placeholder="Recherche en attente du contrat backend" className="pl-9" /></div><select value={selectedEnrollmentId} onChange={(event) => setSelectedEnrollmentId(event.target.value)} className="rounded-md border px-3 py-2 text-sm"><option value="">Toutes les inscriptions</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{item.student?.first_name} {item.student?.last_name}</option>)}</select><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-auto" /><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-auto" /></CardContent></Card>
      <Card><CardHeader><CardTitle>Paiements ({total})</CardTitle></CardHeader><CardContent>{payments.length === 0 ? <p className="py-8 text-center text-slate-500">Aucun paiement trouvé.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Date</th><th className="p-3">Inscription</th><th className="p-3">Montant</th><th className="p-3">Méthode</th><th className="p-3">Référence</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b"><td className="p-3">{new Date(payment.payment_date).toLocaleDateString("fr-FR")}</td><td className="p-3 font-mono text-xs">{payment.enrollment_id}</td><td className="p-3 font-semibold">{payment.amount.toLocaleString()} FCFA</td><td className="p-3">{payment.payment_method || "-"}</td><td className="p-3">{payment.reference || "-"}</td></tr>)}</tbody></table></div>}{totalPages > 1 && <div className="mt-4 flex justify-between border-t pt-4 text-sm"><span>Page {page} sur {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Précédent</Button><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>Suivant</Button></div></div>}</CardContent></Card>
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"><CardHeader><CardTitle>Nouveau paiement</CardTitle></CardHeader><CardContent><form onSubmit={submitPayment} className="space-y-4"><select value={selectedEnrollmentId} onChange={(event) => setSelectedEnrollmentId(event.target.value)} required className="w-full rounded-md border px-3 py-2"><option value="">Sélectionner une inscription</option>{enrollments.map((item) => <option key={item.id} value={item.id}>{item.student?.first_name} {item.student?.last_name}</option>)}</select>{loadingSchedule ? <p>Chargement de l’échéancier...</p> : schedule.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span>{item.label} · {item.amount.toLocaleString()} FCFA</span><Input type="number" min="0" placeholder="Allocation" value={allocations[item.id] || ""} onChange={(event) => setAllocations((current) => ({ ...current, [item.id]: event.target.value }))} className="w-32" /></label>)}{enrollmentError && <p className="text-sm text-red-600">{enrollmentError}</p>}<Input type="number" min="1" placeholder="Montant du paiement" value={amount} onChange={(event) => setAmount(event.target.value)} required /><select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded-md border px-3 py-2"><option value="cash">Espèces</option><option value="transfer">Virement</option><option value="mobile_money">Mobile Money</option><option value="check">Chèque</option></select><Input placeholder="Référence" value={reference} onChange={(event) => setReference(event.target.value)} /><Input placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button><Button type="submit" disabled={isCreating || loadingEnrollments}>{isCreating ? "Enregistrement..." : "Enregistrer le paiement"}</Button></div></form></CardContent></Card></div>}
    </div></div>
  )
}