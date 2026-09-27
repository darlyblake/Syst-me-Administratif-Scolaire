"use client"

import { useState } from "react"
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

export function PaymentModal({ open, onClose, studentSchedules, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState<string>("")
  const [method, setMethod] = useState<string>("cash")
  const [reference, setReference] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!studentSchedules || studentSchedules.length === 0) return null
  
  const enrollmentId = studentSchedules[0].enrollment_id
  const student = studentSchedules[0].student
  const studentName = student ? `${student.first_name} ${student.last_name}` : "Élève inconnu"

  const handlePay = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const numAmount = parseInt(amount, 10)
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Montant invalide")
      }
      
      // Auto-allocate amount sequentially to pending/late schedules
      const allocations = []
      let remainingToAllocate = numAmount
      
      const pendingSchedules = studentSchedules
        .filter(s => s.remaining_amount > 0)
        .sort((a, b) => a.installment_number - b.installment_number)
        
      for (const s of pendingSchedules) {
        if (remainingToAllocate <= 0) break
        const allocAmount = Math.min(s.remaining_amount, remainingToAllocate)
        allocations.push({
          payment_schedule_id: s.schedule_id,
          amount: allocAmount
        })
        remainingToAllocate -= allocAmount
      }
      
      if (remainingToAllocate > 0) {
        throw new Error(`Le montant payé (${numAmount}) dépasse le total restant dû pour cet élève.`)
      }
      
      if (allocations.length === 0) {
        throw new Error("Aucune échéance à régler.")
      }

      await financeService.createPaymentWithAllocations(
        enrollmentId,
        numAmount,
        method,
        allocations,
        reference,
        notes
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Encaissement - {studentName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Montant (FCFA)</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              placeholder="Ex: 25000" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Moyen de paiement</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
            >
              <option value="cash">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Virement Bancaire</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Référence (Optionnel)</label>
            <Input 
              value={reference} 
              onChange={e => setReference(e.target.value)}
              placeholder="N° Transaction, Chèque..." 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optionnel)</label>
            <Input 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Commentaire..." 
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handlePay} disabled={loading || !amount} className="bg-gray-900 text-white hover:bg-gray-800">
            {loading ? "Enregistrement..." : "Valider le paiement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
