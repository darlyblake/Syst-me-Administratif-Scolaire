"use client"

import { useState, useEffect } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinanceMovementRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function FinanceMovements() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id

  const [movements, setMovements] = useState<FinanceMovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [directionFilter, setDirectionFilter] = useState<'in' | 'out' | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
          <option value="in">Entrées (Encaissements)</option>
          <option value="out">Sorties (Dépenses, Paie)</option>
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
                    {mov.direction === 'in' ? (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Entrée</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Sortie</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{mov.reference || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{mov.description}</td>
                  <td className={`px-4 py-3 text-right font-bold ${mov.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.direction === 'in' ? '+' : '-'} {mov.amount.toLocaleString()}
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
