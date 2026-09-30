"use client"

import { useEffect, useMemo, useState } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FinanceStudentPaymentBoardRow } from "@/lib/supabase/types"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  studentSchedules: (FinanceStudentPaymentBoardRow & { student?: any, class?: any })[]
  onSuccess: () => void
}

function categoryLabel(category?: string) {
  if (category === "registration") return "Inscription"
  if (category === "option") return "Option"
  return "Scolarité"
}

export function PaymentModal({ open, onClose, studentSchedules, onSuccess }: PaymentModalProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unpaidSchedules = useMemo(
    () =>
      [...studentSchedules]
        .filter((s) => Number(s.remaining_amount || 0) > 0)
        .sort((a, b) => {
          const pa = a.category === "registration" ? 0 : a.category === "tuition" ? 1 : 2
          const pb = b.category === "registration" ? 0 : b.category === "tuition" ? 1 : 2
          return pa - pb || a.installment_number - b.installment_number
        }),
    [studentSchedules],
  )

  useEffect(() => {
    if (!open) return
    const first = unpaidSchedules[0]
    setSelectedScheduleId(first?.schedule_id || "")
    setAmount(first ? String(Math.round(Number(first.remaining_amount))) : "")
    setError(null)
  }, [open, unpaidSchedules])

  if (!studentSchedules || studentSchedules.length === 0) return null

  const enrollmentId = studentSchedules[0].enrollment_id
  const student = studentSchedules[0].student
  const studentName = student ? `${student.first_name} ${student.last_name}` : "Élève inconnu"
  const selected = unpaidSchedules.find((s) => s.schedule_id === selectedScheduleId)

  const handleScheduleChange = (id: string) => {
    const schedule = unpaidSchedules.find((s) => s.schedule_id === id)
    setSelectedScheduleId(id)
    setAmount(schedule ? String(Math.round(Number(schedule.remaining_amount))) : "")
    setError(null)
  }

  const handlePay = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!selected) throw new Error("Sélectionnez une échéance à payer.")

      const numAmount = Number(amount)
      const remaining = Number(selected.remaining_amount || 0)
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new Error("Montant invalide.")
      }
      if (numAmount > remaining) {
        throw new Error(`Le montant ne peut pas dépasser le reste de ${remaining.toLocaleString("fr-FR")} FCFA.`)
      }

      await financeService.createPaymentWithAllocations(
        enrollmentId,
        numAmount,
        method,
        [{ payment_schedule_id: selected.schedule_id, amount: numAmount }],
        reference,
        notes,
      )

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'encaissement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Encaisser — {studentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Échéance à payer</label>
            <select
              value={selectedScheduleId}
              onChange={(e) => handleScheduleChange(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {unpaidSchedules.length === 0 ? (
                <option value="">Aucune échéance restante</option>
              ) : (
                unpaidSchedules.map((s) => (
                  <option key={s.schedule_id} value={s.schedule_id}>
                    {categoryLabel(s.category)} — {s.label} — reste {Number(s.remaining_amount).toLocaleString("fr-FR")} FCFA
                  </option>
                ))
              )}
            </select>
            {selected && (
              <p className="text-xs text-gray-500">
                Échéance : {new Date(selected.due_date).toLocaleDateString("fr-FR")} · À payer : {Number(selected.remaining_amount).toLocaleString("fr-FR")} FCFA
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Montant versé (FCFA)</label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 25000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Moyen de paiement</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Virement bancaire</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Référence <span className="font-normal text-gray-400">(facultatif)</span></label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° transaction, chèque..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note <span className="font-normal text-gray-400">(facultatif)</span></label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaire..." />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={handlePay} disabled={loading || !selectedScheduleId || !amount}>
            {loading ? "Enregistrement..." : "Valider le paiement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
