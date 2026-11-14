"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabaseBrowser } from "@/lib/supabase/client"

interface OrganizationPaymentModalProps {
  open: boolean
  onClose: () => void
  establishmentId: string
  organizationId: string
  organizationName: string
  academicYearId: string
  remainingAmount: number
  onSuccess: () => void
}

const formatAmount = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR") + " FCFA"

export function OrganizationPaymentModal({
  open,
  onClose,
  establishmentId,
  organizationId,
  organizationName,
  academicYearId,
  remainingAmount,
  onSuccess,
}: OrganizationPaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("bank_transfer")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError("Saisissez un montant valide.")
      return
    }
    if (value > remainingAmount) {
      setError(`Le versement ne peut pas dépasser le reste de ${formatAmount(remainingAmount)}.`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { error: rpcError } = await supabaseBrowser.rpc("record_organization_annual_payment", {
        p_establishment_id: establishmentId,
        p_organization_id: organizationId,
        p_academic_year_id: academicYearId,
        p_amount: value,
        p_method: method,
        p_reference: reference.trim() || null,
        p_notes: notes.trim() || null,
        p_payment_date: new Date().toISOString(),
      })
      if (rpcError) throw rpcError

      setAmount("")
      setReference("")
      setNotes("")
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer ce versement.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !loading) onClose() }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Versement global de l'organisation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Organisation</p>
            <p className="font-semibold text-slate-900">{organizationName}</p>
            <p className="mt-2 text-xs text-slate-500">Reste global à régler</p>
            <p className="text-lg font-semibold tabular-nums">{formatAmount(remainingAmount)}</p>
          </div>

          {error && (
            <div role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="organization-payment-amount" className="text-sm font-medium">Montant versé (FCFA)</label>
            <Input
              id="organization-payment-amount"
              type="number"
              min="1"
              max={remainingAmount}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ex. : 500000"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organization-payment-method" className="text-sm font-medium">Moyen de paiement</label>
            <select
              id="organization-payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="bank_transfer">Virement bancaire</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cheque">Chèque</option>
              <option value="cash">Espèces</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organization-payment-reference" className="text-sm font-medium">
              Référence <span className="font-normal text-slate-400">(facultatif)</span>
            </label>
            <Input
              id="organization-payment-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="N° de virement, chèque..."
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organization-payment-notes" className="text-sm font-medium">
              Observation <span className="font-normal text-slate-400">(facultatif)</span>
            </label>
            <Input
              id="organization-payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex. : premier versement annuel"
            />
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Le montant sera réparti automatiquement entre les frais restant dus pour les élèves pris en charge.
            Aucun solde individuel ne sera présenté aux familles pour ces frais.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading || !amount}>
            {loading ? "Enregistrement..." : "Enregistrer le versement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
