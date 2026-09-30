"use client"

import { useState, useEffect } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinanceMovementRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { Input } from "@/components/ui/input"

export function FinanceMovements() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id

  const [movements, setMovements] = useState<FinanceMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [directionFilter, setDirectionFilter] = useState<'credit' | 'debit' | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
                <tr key={mov.id} className="hover:bg-gray-50">
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
    </div>
  )
}
