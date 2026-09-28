"use client"

import { useState, useEffect } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinancePaymentSummary, FinanceMovementSummary } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"

export function FinanceDashboard() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { activeYear: academicYear, isLoading: isYearLoading } = useAcademicYears(establishmentId)

  const [paymentSummary, setPaymentSummary] = useState<FinancePaymentSummary | null>(null)
  const [movementSummary, setMovementSummary] = useState<FinanceMovementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!establishmentId || !academicYear) return
      
      try {
        setLoading(true)
        setError(null)
        
        const start = academicYear.start_date ? new Date(academicYear.start_date).toISOString().split('T')[0] : new Date().getFullYear() + "-09-01"
        const end = new Date().toISOString().split('T')[0]
        
        const [paySum, movSum] = await Promise.all([
          financeService.getPaymentSummary(establishmentId, academicYear.id),
          financeService.getMovementSummary(establishmentId, start, end)
        ])
        
        setPaymentSummary(paySum)
        setMovementSummary(movSum)
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }
    
    if (!isYearLoading) {
      loadData()
    }
  }, [establishmentId, academicYear, isYearLoading])

  if (loading || isYearLoading) return <div className="p-8 text-center text-gray-500">Chargement du tableau de bord...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 uppercase">Vue d'ensemble</h1>
        <p className="text-sm text-gray-500 mt-1">Tableau de bord financier - {academicYear?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 p-4 rounded bg-white">
          <p className="text-sm text-gray-500">Caisse (Solde actuel)</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">
            {movementSummary?.balance?.toLocaleString() || 0} <span className="text-sm font-normal">FCFA</span>
          </p>
        </div>
        <div className="border border-gray-200 p-4 rounded bg-white">
          <p className="text-sm text-gray-500">Total Encaissé (Scolarité)</p>
          <p className="text-2xl font-bold mt-1 text-green-700">
            {paymentSummary?.paid?.toLocaleString() || 0} <span className="text-sm font-normal">FCFA</span>
          </p>
        </div>
        <div className="border border-gray-200 p-4 rounded bg-white">
          <p className="text-sm text-gray-500">Reste à recouvrer</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">
            {paymentSummary?.remaining?.toLocaleString() || 0} <span className="text-sm font-normal">FCFA</span>
          </p>
        </div>
        <div className="border border-gray-200 p-4 rounded bg-white">
          <p className="text-sm text-gray-500">Total Sorties</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            {movementSummary?.total_out?.toLocaleString() || 0} <span className="text-sm font-normal">FCFA</span>
          </p>
        </div>
      </div>
      
      <div className="border border-gray-200 p-4 rounded bg-white max-w-md">
        <h3 className="font-semibold text-gray-900 mb-2">État des paiements (Retards)</h3>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600">Montant total en retard :</span>
          <span className="font-semibold text-red-600">{paymentSummary?.overdue?.toLocaleString() || 0} FCFA</span>
        </div>
      </div>
    </div>
  )
}
