"use client"

import { useState, useEffect, useMemo } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinanceStudentPaymentBoardRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { PaymentModal } from "./PaymentModal"

export function FinanceScolarite() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { activeYear: academicYear, isLoading: isYearLoading } = useAcademicYears(establishmentId)

  const [boardRows, setBoardRows] = useState<(FinanceStudentPaymentBoardRow & { student?: any, class?: any })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [search, setSearch] = useState("")

  const [selectedStudentForPay, setSelectedStudentForPay] = useState<(FinanceStudentPaymentBoardRow & { student?: any, class?: any })[] | null>(null)


  useEffect(() => {
    async function loadData() {
      if (!establishmentId || !academicYear) return
      
      try {
        setLoading(true)
        setError(null)
        
        const data = await financeService.getStudentPaymentBoard(establishmentId, academicYear.id)
        setBoardRows(data)
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement de la scolarité")
      } finally {
        setLoading(false)
      }
    }
    
    if (!isYearLoading) {
      loadData()
    }
  }, [establishmentId, academicYear, isYearLoading])

  // Aggregate rows by student
  const studentsMap = useMemo(() => {
    const map = new Map<string, { 
      student: any, 
      class: any,
      enrollment_id: string,
      schedules: (FinanceStudentPaymentBoardRow & { student?: any, class?: any })[] 
    }>()
    
    for (const row of boardRows) {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, {
          student: row.student,
          class: row.class,
          enrollment_id: row.enrollment_id,
          schedules: []
        })
      }
      map.get(row.student_id)!.schedules.push(row)
    }
    return Array.from(map.values())
  }, [boardRows])

  const filteredStudents = useMemo(() => {
    if (!search) return studentsMap
    const lowerSearch = search.toLowerCase()
    return studentsMap.filter(s => {
      const name = `${s.student?.first_name || ''} ${s.student?.last_name || ''}`.toLowerCase()
      return name.includes(lowerSearch)
    })
  }, [studentsMap, search])

  // Find all unique installment numbers/labels to render columns
  const installments = useMemo(() => {
    const all = new Map<number, string>()
    for (const row of boardRows) {
      all.set(row.installment_number, row.label)
    }
    return Array.from(all.entries()).sort((a, b) => a[0] - b[0])
  }, [boardRows])

  const renderState = (state: string, remaining: number, due: number) => {
    switch (state) {
      case 'paid': return <span className="text-green-600 font-bold" title="Payé">✓</span>
      case 'partial': return <span className="text-orange-500 font-bold" title={`Reste ${remaining}`}>{due - remaining}k</span>
      case 'partial_late': return <span className="text-red-500 font-bold" title={`En retard. Reste ${remaining}`}>{due - remaining}k</span>
      case 'late': return <span className="text-red-600 font-bold" title="En retard">X</span>
      case 'pending': return <span className="text-gray-300" title="En attente">-</span>
      default: return <span className="text-gray-300">-</span>
    }
  }

  const getGlobalState = (schedules: FinanceStudentPaymentBoardRow[]) => {
    if (schedules.some(s => s.payment_state === 'late' || s.payment_state === 'partial_late')) {
      return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">En retard</span>
    }
    if (schedules.some(s => s.payment_state === 'partial')) {
      return <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">Partiel</span>
    }
    return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">À jour</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 uppercase">Scolarité</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi détaillé des échéances des élèves</p>
        </div>
        
      </div>

      <div className="flex gap-4 mb-4">
        <Input 
          placeholder="Rechercher un élève..." 
          className="max-w-sm rounded" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border border-gray-200 rounded bg-white overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Élève</th>
              <th className="px-4 py-3 font-medium text-gray-700">Classe</th>
              {installments.map(([num, label]) => (
                <th key={num} className="px-4 py-3 font-medium text-gray-700 text-center" title={label}>
                  Éch. {num}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-gray-700">État Global</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading || isYearLoading ? (
              <tr><td colSpan={installments.length + 3} className="px-4 py-8 text-center text-gray-500">Chargement des échéances...</td></tr>
            ) : error ? (
              <tr><td colSpan={installments.length + 3} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan={installments.length + 3} className="px-4 py-8 text-center text-gray-500">Aucune échéance trouvée.</td></tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s.student?.id || Math.random()} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.student ? `${s.student.first_name} ${s.student.last_name}` : "Élève inconnu"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.class?.name || "-"}
                  </td>
                  
                  {installments.map(([num]) => {
                    const sched = s.schedules.find(x => x.installment_number === num)
                    return (
                      <td key={num} className="px-4 py-3 text-center">
                        {sched ? renderState(sched.payment_state, sched.remaining_amount, sched.amount_due) : "-"}
                      </td>
                    )
                  })}

                  
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {getGlobalState(s.schedules)}
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedStudentForPay(s.schedules)}>
                        Encaisser
                      </Button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    
      {selectedStudentForPay && (
        <PaymentModal 
          open={!!selectedStudentForPay} 
          onClose={() => setSelectedStudentForPay(null)} 
          studentSchedules={selectedStudentForPay} 
          onSuccess={() => {
            // refresh data
            financeService.getStudentPaymentBoard(establishmentId!, academicYear!.id).then(setBoardRows)
          }}
        />
      )}
    </div>
  )

}
