"use client"

import { useState, useEffect, useMemo } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinancePaymentSummary, FinanceMovementSummary } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"

export function FinanceDashboard() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { data: academicYears, activeYear, selectedYear, selectYear, isLoading: isYearLoading } = useAcademicYears(establishmentId ?? null)
  const academicYear = selectedYear ?? activeYear
  const [period, setPeriod] = useState<"year" | "current_month" | "previous_month" | "custom">("year")
  const [direction, setDirection] = useState<"all" | "credit" | "debit">("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const dateRange = useMemo(() => {
    const today = new Date()
    const todayValue = today.toISOString().split("T")[0]
    if (period === "current_month") {
      return { from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0], to: todayValue }
    }
    if (period === "previous_month") {
      return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0], to: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0] }
    }
    if (period === "custom") return { from: customFrom || undefined, to: customTo || undefined }
    return {
      from: academicYear?.start_date,
      to: academicYear?.end_date && academicYear.end_date < todayValue ? academicYear.end_date : todayValue,
    }
  }, [academicYear, customFrom, customTo, period])

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
          financeService.getMovementSummary(establishmentId, dateRange.from, dateRange.to, direction)
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
  }, [establishmentId, academicYear, isYearLoading, dateRange, direction])

  if (loading || isYearLoading) return <div className="p-8 text-center text-gray-500">Chargement du tableau de bord...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 uppercase">Vue d'ensemble</h1>
        <p className="text-sm text-gray-500 mt-1">Tableau de bord financier - {academicYear?.name}</p>
      </div>

      <div className="border border-gray-200 p-4 rounded bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm text-gray-600">
            <span className="block text-xs font-medium mb-1">Année académique</span>
            <select value={academicYear?.id ?? ""} onChange={(e) => selectYear(e.target.value)} className="w-full h-10 rounded border border-gray-300 bg-white px-3">
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            <span className="block text-xs font-medium mb-1">Période des mouvements</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="w-full h-10 rounded border border-gray-300 bg-white px-3">
              <option value="year">Année académique</option>
              <option value="current_month">Ce mois</option>
              <option value="previous_month">Mois précédent</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">
            <span className="block text-xs font-medium mb-1">Type de mouvement</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} className="w-full h-10 rounded border border-gray-300 bg-white px-3">
              <option value="all">Entrées et sorties</option>
              <option value="credit">Entrées uniquement</option>
              <option value="debit">Sorties uniquement</option>
            </select>
          </label>
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 max-w-xl">
            <label className="text-sm text-gray-600"><span className="block text-xs font-medium mb-1">Du</span><input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full h-10 rounded border border-gray-300 px-3" /></label>
            <label className="text-sm text-gray-600"><span className="block text-xs font-medium mb-1">Au</span><input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full h-10 rounded border border-gray-300 px-3" /></label>
          </div>
        )}
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
