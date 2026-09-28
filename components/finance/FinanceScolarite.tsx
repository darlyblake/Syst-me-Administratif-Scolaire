"use client"

import { useState, useEffect, useMemo } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinanceStudentPaymentBoardRow, FinancePaymentHistoryRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentModal } from "./PaymentModal"

// ─── Helpers ────────────────────────────────────────────────────────────────

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const MOIS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA"
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/** Retourne le libellé court d'une échéance : mois si monthly sinon label du plan */
function colLabel(label: string, dueDate: string, short = true): string {
  // Si le label ressemble à un mois ("Mensualité Septembre", "Octobre", etc.)
  const monthMatch = (label + " " + dueDate).match(
    /(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)/i
  )
  if (monthMatch) {
    const idx = MOIS_LONG.findIndex(m => m.toLowerCase().startsWith(monthMatch[1].toLowerCase().slice(0, 3)))
    if (idx >= 0) return short ? MOIS_FR[idx] : MOIS_LONG[idx]
  }
  // Sinon essayer la date elle-même
  if (dueDate) {
    const d = new Date(dueDate)
    if (!isNaN(d.getTime())) return short ? MOIS_FR[d.getMonth()] : MOIS_LONG[d.getMonth()]
  }
  return label
}

// ─── Composant cellule avec tooltip de détail ────────────────────────────────

interface CellDetailProps {
  sched: FinanceStudentPaymentBoardRow
  payments: FinancePaymentHistoryRow[]   // versements pour cette échéance
}

function ScheduleCell({ sched, payments }: CellDetailProps) {
  const [open, setOpen] = useState(false)

  // Versements sur cette échéance spécifique
  const schedPayments = payments.filter(p => p.schedule_id === sched.schedule_id)

  const state = sched.payment_state

  let cellContent: React.ReactNode

  if (state === "paid") {
    cellContent = (
      <span className="text-green-600 font-bold cursor-pointer" onClick={() => setOpen(o => !o)}>✓</span>
    )
  } else if (state === "partial" || state === "partial_late") {
    const paid = sched.amount_due - sched.remaining_amount
    cellContent = (
      <span
        className={`font-medium cursor-pointer text-xs ${state === "partial_late" ? "text-red-500" : "text-orange-500"}`}
        onClick={() => setOpen(o => !o)}
      >
        {(paid / 1000).toFixed(0)}k
      </span>
    )
  } else if (state === "late") {
    cellContent = <span className="text-red-600 font-bold">✕</span>
  } else {
    cellContent = <span className="text-gray-300">–</span>
  }

  return (
    <div className="relative flex flex-col items-center">
      {cellContent}

      {/* Tooltip versements */}
      {open && schedPayments.length > 0 && (
        <div
          className="absolute z-30 top-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded shadow-lg text-xs w-52 p-2 space-y-1"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="font-medium text-gray-700 border-b pb-1 mb-1">
            {colLabel(sched.label, sched.due_date, false)} — dû : {fmt(sched.amount_due)}
          </p>
          {schedPayments.map((p, i) => (
            <div key={p.payment_id + i} className="flex justify-between text-gray-600">
              <span>{fmtDate(p.payment_date)}</span>
              <span className="font-medium text-green-700">{fmt(p.allocated_amount)}</span>
            </div>
          ))}
          {sched.remaining_amount > 0 && (
            <div className="flex justify-between text-red-600 font-medium border-t pt-1 mt-1">
              <span>Reste</span>
              <span>{fmt(sched.remaining_amount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function FinanceScolarite() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { activeYear: academicYear, isLoading: isYearLoading } = useAcademicYears(establishmentId ?? null)

  const [boardRows, setBoardRows] = useState<(FinanceStudentPaymentBoardRow & { student?: any; class?: any })[]>([])
  const [paymentHistory, setPaymentHistory] = useState<FinancePaymentHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<(FinanceStudentPaymentBoardRow & { student?: any; class?: any })[] | null>(null)

  const reload = async () => {
    if (!establishmentId || !academicYear) return
    setLoading(true)
    setError(null)
    try {
      const [board, history] = await Promise.all([
        financeService.getStudentPaymentBoard(establishmentId, academicYear.id),
        financeService.getPaymentHistory(establishmentId),
      ])
      setBoardRows(board)
      setPaymentHistory(history)
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isYearLoading) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, academicYear, isYearLoading])

  // Agrégation par élève
  const studentsMap = useMemo(() => {
    const map = new Map<string, {
      student: any
      class: any
      enrollment_id: string
      schedules: (FinanceStudentPaymentBoardRow & { student?: any; class?: any })[]
    }>()
    for (const row of boardRows) {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, { student: row.student, class: row.class, enrollment_id: row.enrollment_id, schedules: [] })
      }
      map.get(row.student_id)!.schedules.push(row)
    }
    return Array.from(map.values())
  }, [boardRows])

  const filteredStudents = useMemo(() => {
    if (!search) return studentsMap
    const q = search.toLowerCase()
    return studentsMap.filter(s => {
      const name = `${s.student?.first_name || ""} ${s.student?.last_name || ""}`.toLowerCase()
      return name.includes(q)
    })
  }, [studentsMap, search])

  // Colonnes : toutes les échéances uniques, triées
  const installments = useMemo(() => {
    const all = new Map<number, { label: string; due_date: string }>()
    for (const row of boardRows) {
      all.set(row.installment_number, { label: row.label, due_date: row.due_date })
    }
    return Array.from(all.entries()).sort((a, b) => a[0] - b[0])
  }, [boardRows])

  const getGlobalState = (schedules: FinanceStudentPaymentBoardRow[]) => {
    if (schedules.some(s => s.payment_state === "late" || s.payment_state === "partial_late"))
      return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">En retard</span>
    if (schedules.some(s => s.payment_state === "partial"))
      return <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">Partiel</span>
    if (schedules.every(s => s.payment_state === "paid"))
      return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Soldé</span>
    return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">À jour</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 uppercase">Scolarité</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des échéances par élève. Cliquez sur une cellule payée pour voir le détail des versements.</p>
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
              {installments.map(([num, { label, due_date }]) => (
                <th
                  key={num}
                  className="px-3 py-3 font-medium text-gray-700 text-center"
                  title={`${label}${due_date ? " — " + fmtDate(due_date) : ""}`}
                >
                  {colLabel(label, due_date)}
                </th>
              ))}
              <th className="px-4 py-3 font-medium text-gray-700">État</th>
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
                <tr key={s.student?.id || s.enrollment_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.student ? `${s.student.first_name} ${s.student.last_name}` : "Élève inconnu"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.class?.name || "–"}</td>

                  {installments.map(([num]) => {
                    const sched = s.schedules.find(x => x.installment_number === num)
                    return (
                      <td key={num} className="px-3 py-3 text-center">
                        {sched
                          ? <ScheduleCell sched={sched} payments={paymentHistory} />
                          : <span className="text-gray-300">–</span>
                        }
                      </td>
                    )
                  })}

                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {getGlobalState(s.schedules)}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setSelectedStudentForPay(s.schedules)}
                      >
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
          onSuccess={reload}
        />
      )}
    </div>
  )
}
