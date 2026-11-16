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
  studentSchedules: (FinanceStudentPaymentBoardRow & { student?: any, class?: any; category?: string })[]
  onSuccess: () => void
}

type AllocationSchedule = Awaited<ReturnType<typeof financeService.getPaymentAllocationSchedules>>[number]

function categoryLabel(category?: string) {
  if (category === "registration") return "Inscription"
  if (category === "option") return "Option"
  return "Scolarité"
}

function scheduleLabel(schedule: Pick<FinanceStudentPaymentBoardRow, "label" | "due_date"> & { category?: string }) {
  if (schedule.category === "registration") return "Inscription"
  if (schedule.category === "option") return schedule.label

  if (schedule.due_date) {
    const date = new Date(schedule.due_date + "T00:00:00")
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    }
  }

  return schedule.label
}

function money(value: number) {
  return Math.round(value).toLocaleString("fr-FR") + " FCFA"
}

export function PaymentModal({ open, onClose, studentSchedules, onSuccess }: PaymentModalProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allocationSchedules, setAllocationSchedules] = useState<AllocationSchedule[]>([])
  const [allocationSchedulesLoading, setAllocationSchedulesLoading] = useState(false)
  const [allocationLoadError, setAllocationLoadError] = useState<string | null>(null)
  const [carrySurplus, setCarrySurplus] = useState(false)

  const unpaidSchedules = useMemo(() => {
    const unpaid = [...studentSchedules]
      .filter((s) => Number(s.remaining_amount || 0) > 0)
      .sort((a, b) => {
        const pa = a.category === "registration" ? 0 : a.category === "tuition" ? 1 : 2
        const pb = b.category === "registration" ? 0 : b.category === "tuition" ? 1 : 2
        return pa - pb || a.installment_number - b.installment_number
      })

    // La première échéance de scolarité reste prioritaire. Le surplus pourra
    // ensuite être réparti sur les échéances suivantes du même payeur.
    const nextCore = unpaid.find((s) => s.category === "registration" || s.category === "tuition" || s.category === "scolarite")
    const options = unpaid.filter((s) => s.category === "option")
    return nextCore ? [nextCore, ...options] : options
  }, [studentSchedules])

  const enrollmentId = studentSchedules[0]?.enrollment_id
  const student = studentSchedules[0]?.student
  const studentName = student ? `${student.first_name} ${student.last_name}` : "Élève inconnu"
  const selected = unpaidSchedules.find((s) => s.schedule_id === selectedScheduleId)
  const numericAmount = Number(amount)
  const isOverpayment = !!selected && Number.isFinite(numericAmount) && numericAmount > Number(selected.remaining_amount || 0)

  useEffect(() => {
    if (!open) return
    const first = unpaidSchedules[0]
    setSelectedScheduleId(first?.schedule_id || "")
    setAmount(first ? String(Math.round(Number(first.remaining_amount))) : "")
    setError(null)
    setCarrySurplus(false)
  }, [open, unpaidSchedules])

  useEffect(() => {
    if (!open || !enrollmentId) return
    let cancelled = false
    setAllocationSchedulesLoading(true)
    setAllocationLoadError(null)
    void financeService.getPaymentAllocationSchedules(enrollmentId)
      .then((rows) => { if (!cancelled) setAllocationSchedules(rows) })
      .catch((err: any) => { if (!cancelled) setAllocationLoadError(err.message || "Impossible de vérifier les échéances suivantes.") })
      .finally(() => { if (!cancelled) setAllocationSchedulesLoading(false) })
    return () => { cancelled = true }
  }, [open, enrollmentId])

  const allocationPreview = useMemo(() => {
    if (!selected || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { allocations: [] as { schedule: typeof selected; amount: number }[], unallocated: 0, totalAvailable: 0 }
    }
    const firstRemaining = Math.max(0, Number(selected.remaining_amount || 0))
    if (numericAmount <= firstRemaining) {
      return { allocations: [{ schedule: selected, amount: numericAmount }], unallocated: 0, totalAvailable: firstRemaining }
    }

    const coreCategories = ["registration", "tuition", "scolarite"]
    if (!coreCategories.includes(String(selected.category || "").toLowerCase())) {
      return { allocations: [] as { schedule: typeof selected; amount: number }[], unallocated: numericAmount, totalAvailable: firstRemaining }
    }
    if (allocationSchedulesLoading || allocationLoadError) {
      return { allocations: [] as { schedule: typeof selected; amount: number }[], unallocated: numericAmount, totalAvailable: 0 }
    }

    const selectedMeta = allocationSchedules.find((row) => row.id === selected.schedule_id)
    if (!selectedMeta) {
      return { allocations: [] as { schedule: typeof selected; amount: number }[], unallocated: numericAmount, totalAvailable: 0 }
    }

    const samePayerSchedules = allocationSchedules
      .filter((row) =>
        coreCategories.includes(String(row.category || "").toLowerCase()) &&
        row.payer_type === selectedMeta.payer_type &&
        (row.organization_id || null) === (selectedMeta.organization_id || null),
      )
    const selectedIndex = samePayerSchedules.findIndex((row) => row.id === selected.schedule_id)
    if (selectedIndex < 0) {
      return { allocations: [] as { schedule: typeof selected; amount: number }[], unallocated: numericAmount, totalAvailable: 0 }
    }

    let left = numericAmount
    const allocations: { schedule: typeof selected; amount: number }[] = []
    let totalAvailable = 0
    for (const meta of samePayerSchedules.slice(selectedIndex)) {
      const boardSchedule = studentSchedules.find((row) => row.schedule_id === meta.id)
      if (!boardSchedule) continue
      const remaining = Math.max(0, Number(boardSchedule.remaining_amount || 0))
      if (remaining <= 0) continue
      totalAvailable += remaining
      if (left <= 0) continue
      const allocated = Math.min(left, remaining)
      if (allocated > 0) allocations.push({ schedule: boardSchedule, amount: allocated })
      left -= allocated
    }
    return { allocations, unallocated: Math.max(0, left), totalAvailable }
  }, [selected, numericAmount, allocationSchedules, allocationSchedulesLoading, allocationLoadError, studentSchedules])

  if (!studentSchedules || studentSchedules.length === 0) return null

  const handleScheduleChange = (id: string) => {
    const schedule = unpaidSchedules.find((s) => s.schedule_id === id)
    setSelectedScheduleId(id)
    setAmount(schedule ? String(Math.round(Number(schedule.remaining_amount))) : "")
    setCarrySurplus(false)
    setError(null)
  }

  const handlePay = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!selected) throw new Error("Sélectionnez une échéance à payer.")

      const numAmount = Math.round(Number(amount))
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new Error("Montant invalide.")
      }
      const remaining = Number(selected.remaining_amount || 0)
      let allocations: { payment_schedule_id: string; amount: number }[] = [
        { payment_schedule_id: selected.schedule_id, amount: numAmount },
      ]

      if (numAmount > remaining) {
        if (!carrySurplus) throw new Error("Confirmez d’abord la répartition du surplus sur les prochaines échéances.")
        if (allocationSchedulesLoading) throw new Error("Vérification des prochaines échéances en cours.")
        if (allocationLoadError) throw new Error(allocationLoadError)
        if (allocationPreview.unallocated > 0) {
          throw new Error(`Le montant dépasse le total restant des échéances de ce payeur. Solde disponible : ${money(allocationPreview.totalAvailable)}.`)
        }
        if (allocationPreview.allocations.length < 2) {
          throw new Error("Aucune échéance suivante disponible pour recevoir le surplus.")
        }
        allocations = allocationPreview.allocations.map((item) => ({
          payment_schedule_id: item.schedule!.schedule_id,
          amount: Math.round(item.amount),
        }))
      }

      await financeService.createPaymentWithAllocations(
        enrollmentId!,
        numAmount,
        method,
        allocations,
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
                    {categoryLabel(s.category)} — {scheduleLabel(s)} — reste {money(Number(s.remaining_amount))}
                  </option>
                ))
              )}
            </select>
            {selected && (
              <p className="text-xs text-gray-500">
                Échéance : {scheduleLabel(selected)} ({selected.due_date ? new Date(selected.due_date + "T00:00:00").toLocaleDateString("fr-FR") : "Date non définie"}) · Reste à payer : {money(Number(selected.remaining_amount))}
                {Number(selected.remaining_amount) < Number(selected.amount_due) && " · Cette échéance est partiellement payée."}
              </p>
            )}
            <p className="text-xs text-gray-400">
              Les échéances de scolarité sont encaissées dans l’ordre. Si le versement dépasse le reste de l’échéance, le surplus peut être réparti sur les suivantes.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Montant versé (FCFA)</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setCarrySurplus(false); setError(null) }}
              placeholder="Ex : 25000"
            />
          </div>

          {isOverpayment && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Le montant dépasse cette échéance</p>
                <p className="mt-1 text-sm text-amber-800">
                  Le surplus de {money(numericAmount - Number(selected!.remaining_amount))} peut être affecté automatiquement aux prochaines échéances de scolarité.
                </p>
              </div>
              {allocationSchedulesLoading ? (
                <p className="text-xs text-amber-800">Vérification des prochaines échéances…</p>
              ) : allocationLoadError ? (
                <p className="text-xs text-red-700">{allocationLoadError}</p>
              ) : allocationPreview.unallocated > 0 ? (
                <p className="text-xs text-red-700">
                  Le solde restant sur les échéances de ce payeur est de {money(allocationPreview.totalAvailable)}. Réduisez le montant pour continuer.
                </p>
              ) : allocationPreview.allocations.length > 1 ? (
                <div className="space-y-1 rounded-md bg-white/80 p-2">
                  {allocationPreview.allocations.map((item) => (
                    <div key={item.schedule!.schedule_id} className="flex justify-between gap-3 text-xs text-slate-700">
                      <span>{scheduleLabel(item.schedule!)} </span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-800">Aucune échéance suivante disponible pour recevoir le surplus.</p>
              )}
              <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-amber-700"
                  checked={carrySurplus}
                  onChange={(e) => setCarrySurplus(e.target.checked)}
                  disabled={allocationSchedulesLoading || allocationPreview.unallocated > 0 || allocationPreview.allocations.length < 2}
                />
                <span>Oui, répartir le surplus sur les prochaines échéances affichées ci-dessus.</span>
              </label>
            </div>
          )}

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
          <Button
            onClick={handlePay}
            disabled={loading || !selectedScheduleId || !amount || (isOverpayment && (!carrySurplus || allocationSchedulesLoading || allocationPreview.unallocated > 0 || allocationPreview.allocations.length < 2))}
          >
            {loading ? "Enregistrement..." : isOverpayment && carrySurplus ? "Valider et répartir le surplus" : "Valider le paiement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
