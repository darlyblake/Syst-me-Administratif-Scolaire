"use client"

import { useState, useEffect } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinanceMovementRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

export function FinanceMovements() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id

  const [movements, setMovements] = useState<FinanceMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [directionFilter, setDirectionFilter] = useState<'credit' | 'debit' | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedMovement, setSelectedMovement] = useState<FinanceMovementRow | null>(null)
  const [movementDetails, setMovementDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const isEntry = (movement: FinanceMovementRow) => movement.direction === "credit"

  const getReference = (movement: FinanceMovementRow) => {
    const raw = movement.reference?.trim().toUpperCase() ?? ""
    const shortId = movement.id.replace(/-/g, "").slice(-6).toUpperCase()

    if (raw.startsWith("INSCRIPTION-")) return `INS-${shortId}`
    if (raw.startsWith("SCOLARITE-")) return `SCO-${shortId}`
    if (movement.source_type === "student_payment") return `SCO-${shortId}`
    if (movement.source_type?.toLowerCase().includes("expense") || movement.source_type?.toLowerCase().includes("depense")) return `DEP-${shortId}`
    if (movement.source_type?.toLowerCase().includes("payroll") || movement.source_type?.toLowerCase().includes("paie")) return `SAL-${shortId}`
    if (raw) return raw.length > 16 ? `${raw.slice(0, 13)}...` : raw
    return `MVT-${shortId}`
  }

  const getDescription = (movement: FinanceMovementRow) => {
    const raw = movement.reference?.trim().toUpperCase() ?? ""
    if (raw.startsWith("INSCRIPTION-")) return "Inscription"
    if (raw.startsWith("SCOLARITE-")) return "Scolarité"
    if (movement.source_type === "student_payment") return "Versement scolarité"
    if (movement.source_type?.toLowerCase().includes("expense") || movement.source_type?.toLowerCase().includes("depense")) return "Dépense"
    if (movement.source_type?.toLowerCase().includes("payroll") || movement.source_type?.toLowerCase().includes("paie")) return "Paie"
    return movement.description || "Mouvement de caisse"
  }

  useEffect(() => {
    async function loadDetails() {
      if (!selectedMovement) { setMovementDetails(null); return }
      try {
        setDetailsLoading(true); setDetailsError(null)
        const details = await financeService.getMovementDetails(selectedMovement)
        setMovementDetails(details)
      } catch (err: any) {
        setDetailsError(err.message || "Impossible de charger les détails de la transaction.")
      } finally { setDetailsLoading(false) }
    }
    loadDetails()
  }, [selectedMovement])
  useEffect(() => {
    async function loadData() {
      if (!establishmentId) return
      
      try {
        setLoading(true)
        setError(null)
        
        const data = await financeService.getMovements(
          establishmentId, 
          dateFrom || undefined, 
          dateTo || undefined, 
          directionFilter || undefined
        )
        setMovements(data)
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des mouvements")
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [establishmentId, directionFilter, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 uppercase">Mouvements de Caisse</h1>
          <p className="text-sm text-gray-500 mt-1">Historique complet des encaissements et décaissements</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 w-full">
        <select 
          value={directionFilter} 
          onChange={(e) => setDirectionFilter(e.target.value as any)}
          className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
        >
          <option value="">Tous les types</option>
          <option value="credit">Entrées (encaissements)</option>
          <option value="debit">Sorties (dépenses, paie)</option>
        </select>
        <Input 
          type="date" 
          value={dateFrom} 
          onChange={(e) => setDateFrom(e.target.value)} 
          className="w-full sm:w-auto rounded bg-white" 
          placeholder="Du"
        />
        <Input 
          type="date" 
          value={dateTo} 
          onChange={(e) => setDateTo(e.target.value)} 
          className="w-auto rounded bg-white" 
          placeholder="Au"
        />
      </div>

      <div className="border border-gray-200 rounded bg-white overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 font-medium text-gray-700">Référence</th>
              <th className="px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Chargement des mouvements...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-500">{error}</td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucun mouvement trouvé.</td>
              </tr>
            ) : (
              movements.map((mov) => (
                <tr key={mov.id} onClick={() => setSelectedMovement(mov)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {new Date(mov.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {isEntry(mov) ? (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Entrée</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Sortie</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{getReference(mov)}</td>
                  <td className="px-4 py-3 text-gray-600">{getDescription(mov)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${isEntry(mov) ? 'text-green-600' : 'text-red-600'}`}>
                    {isEntry(mov) ? '+' : '-'} {Math.abs(Number(mov.amount || 0)).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedMovement(null)}>
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div><h2 className="text-lg font-semibold text-gray-900">Détails de la transaction</h2><p className="mt-1 text-sm text-gray-500">{getReference(selectedMovement)} · {new Date(selectedMovement.transaction_date).toLocaleDateString("fr-FR")}</p></div>
              <button type="button" onClick={() => setSelectedMovement(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {detailsLoading ? <div className="px-5 py-10 text-center text-sm text-gray-500">Chargement des détails...</div> : detailsError ? <div className="px-5 py-8 text-sm text-red-600">{detailsError}</div> : (
              <div className="space-y-5 px-5 py-5">
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
                  <div><p className="text-xs text-gray-500">Type</p><p className="mt-1 font-medium">{isEntry(selectedMovement) ? "Entrée" : "Sortie"}</p></div>
                  <div><p className="text-xs text-gray-500">Montant</p><p className={isEntry(selectedMovement) ? "mt-1 font-semibold text-green-600" : "mt-1 font-semibold text-red-600"}>{isEntry(selectedMovement) ? "+" : "-"} {Math.abs(Number(selectedMovement.amount || 0)).toLocaleString("fr-FR")} FCFA</p></div>
                  <div><p className="text-xs text-gray-500">Référence</p><p className="mt-1 font-medium">{getReference(selectedMovement)}</p></div>
                  <div><p className="text-xs text-gray-500">Mode</p><p className="mt-1 font-medium">{movementDetails?.payment?.method || "-"}</p></div>
                </div>
                {movementDetails?.kind === "student_payment" && <>
                  <div><h3 className="mb-3 text-sm font-semibold text-gray-900">Élève concerné</h3><div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-3">
                    <div><p className="text-xs text-gray-500">Élève</p><p className="mt-1 font-medium">{movementDetails.student ? `${movementDetails.student.first_name} ${movementDetails.student.last_name}` : "-"}</p></div>
                    <div><p className="text-xs text-gray-500">Classe</p><p className="mt-1 font-medium">{movementDetails.schoolClass?.name || "-"}</p></div>
                    <div><p className="text-xs text-gray-500">Année scolaire</p><p className="mt-1 font-medium">{movementDetails.academicYear?.name || "-"}</p></div>
                  </div></div>
                  <div><h3 className="mb-3 text-sm font-semibold text-gray-900">Affectation du paiement</h3><div className="space-y-2">
                    {(movementDetails.allocations || []).map((allocation: any, index: number) => <div key={index} className="flex flex-col gap-1 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{allocation.payment_schedules?.label || "Échéance"}</p><p className="text-xs text-gray-500">{allocation.payment_schedules?.category === "registration" ? "Inscription / réinscription" : "Scolarité"} · échéance du {allocation.payment_schedules?.due_date ? new Date(allocation.payment_schedules.due_date).toLocaleDateString("fr-FR") : "-"}</p></div><p className="font-semibold">{Number(allocation.amount || 0).toLocaleString("fr-FR")} FCFA</p></div>)}
                  </div></div>
                </>}
                {movementDetails?.kind === "expense" && movementDetails.expense && <div className="rounded-lg border p-4"><h3 className="mb-3 text-sm font-semibold">Dépense</h3><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-gray-500">Catégorie</p><p className="mt-1 font-medium">{movementDetails.expense.category || "-"}</p></div><div><p className="text-xs text-gray-500">Date</p><p className="mt-1 font-medium">{movementDetails.expense.expense_date ? new Date(movementDetails.expense.expense_date).toLocaleDateString("fr-FR") : "-"}</p></div><div className="sm:col-span-2"><p className="text-xs text-gray-500">Motif</p><p className="mt-1 font-medium">{movementDetails.expense.description || "-"}</p></div></div></div>}
                {movementDetails?.kind === "payroll" && movementDetails.payroll && <div className="rounded-lg border p-4"><h3 className="mb-3 text-sm font-semibold">Paiement du personnel</h3><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-gray-500">Personnel</p><p className="mt-1 font-medium">{movementDetails.staff ? `${movementDetails.staff.first_name} ${movementDetails.staff.last_name}` : "Personnel"}</p></div><div><p className="text-xs text-gray-500">Période</p><p className="mt-1 font-medium">{movementDetails.period?.name || "-"}</p></div><div><p className="text-xs text-gray-500">Salaire net</p><p className="mt-1 font-medium">{Number(movementDetails.payroll.net_amount || selectedMovement.amount).toLocaleString("fr-FR")} FCFA</p></div></div></div>}
                <div className="border-t pt-4"><p className="text-xs text-gray-500">Description enregistrée</p><p className="mt-1 text-sm text-gray-700">{selectedMovement.description || "-"}</p></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
