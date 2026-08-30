"use client"

import type { FormEvent } from "react"
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CreditCard } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useEnrollments } from "@/hooks/useEnrollments"
import { usePayments } from "@/hooks/usePayments"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AddPaymentPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { selectedYear } = useAcademicYears(establishmentId)
  const { enrollments } = useEnrollments({ establishmentId, academicYearId: selectedYear?.id ?? null, pageSize: 100 })
  const [enrollmentId, setEnrollmentId] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [method, setMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const { schedule, summary, isLoading, error, create, isCreating } = usePayments(enrollmentId)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!enrollmentId || !amount) return
    const result = await create({
      enrollmentId,
      amount: Number(amount),
      reference,
      method,
      notes,
      allocations: Object.entries(allocations).filter(([, value]) => value !== "").map(([scheduleId, value]) => ({ schedule_id: scheduleId, amount: Number(value) })),
    })
    if (result) {
      setAmount("")
      setReference("")
      setNotes("")
      setAllocations({})
      alert("Paiement enregistré avec succès.")
    }
  }

  return <div className="min-h-screen bg-creme p-4"><div className="mx-auto max-w-3xl space-y-6">
    <header className="flex items-center gap-4"><Button variant="outline" size="sm" asChild><Link href="/ecole/payments"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CreditCard className="h-5 w-5" />Enregistrer un paiement</h1><p className="text-sm text-slate-600">Le paiement est rattaché à une inscription.</p></div></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Card><CardHeader><CardTitle>Informations du paiement</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
      <select value={enrollmentId} onChange={(event) => setEnrollmentId(event.target.value)} required className="w-full rounded-md border px-3 py-2"><option value="">Sélectionner une inscription</option>{enrollments.map((enrollment) => <option key={enrollment.id} value={enrollment.id}>{enrollment.student?.first_name} {enrollment.student?.last_name} · {enrollment.class?.name || "Classe inconnue"}</option>)}</select>
      {isLoading ? <p className="text-sm text-slate-600">Chargement du résumé financier...</p> : summary && <p className="rounded-md bg-slate-50 p-3 text-sm">Dû : {summary.total_due.toLocaleString()} FCFA · Payé : {summary.paid.toLocaleString()} FCFA · Reste : {summary.pending.toLocaleString()} FCFA</p>}
      {schedule.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span>{item.label} · {item.amount.toLocaleString()} FCFA</span><Input type="number" min="0" placeholder="Allocation" value={allocations[item.id] || ""} onChange={(event) => setAllocations((current) => ({ ...current, [item.id]: event.target.value }))} className="w-32" /></label>)}
      <Input type="number" min="1" placeholder="Montant du paiement" value={amount} onChange={(event) => setAmount(event.target.value)} required /><select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded-md border px-3 py-2"><option value="cash">Espèces</option><option value="transfer">Virement</option><option value="mobile_money">Mobile Money</option><option value="check">Chèque</option></select><Input placeholder="Référence" value={reference} onChange={(event) => setReference(event.target.value)} /><Input placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button type="submit" disabled={isCreating}>{isCreating ? "Enregistrement..." : "Enregistrer le paiement"}</Button>
    </form></CardContent></Card>
  </div></div>
}