"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinancePaymentHistoryRow, FinanceStudentPaymentBoardRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentModal } from "./PaymentModal"

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const MOIS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

type BoardRow = FinanceStudentPaymentBoardRow & { student?: any; class?: any }

type ScheduleGroup = {
  key: string
  installment_number: number
  label: string
  due_date: string
  schedules: BoardRow[]
  amount_due: number
  remaining_amount: number
  paid_amount: number
  payment_state: FinanceStudentPaymentBoardRow["payment_state"]
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA"
}

function fmtCompact(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + " M"
  if (n >= 1000) return Math.round(n / 1000) + "k"
  return n.toLocaleString("fr-FR")
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function monthIndex(iso: string) {
  const month = Number(iso?.slice(5, 7))
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : -1
}

function monthKey(iso: string) {
  return /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : ""
}

function colLabel(label: string, dueDate: string, short = true) {
  const idx = monthIndex(dueDate)
  if (idx >= 0) return short ? MOIS_FR[idx] : MOIS_LONG[idx]

  const match = label.match(
    /(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)/i,
  )
  if (match) {
    const normalized = match[1].toLowerCase().slice(0, 3)
    const labelIndex = MOIS_LONG.findIndex((m) => m.toLowerCase().startsWith(normalized))
    if (labelIndex >= 0) return short ? MOIS_FR[labelIndex] : MOIS_LONG[labelIndex]
  }

  return label
}

function isMonthlySchedule(row: FinanceStudentPaymentBoardRow) {
  const label = row.label.toLowerCase()
  return label.includes("mensual") || /(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i.test(label)
}

function groupKey(row: FinanceStudentPaymentBoardRow) {
  const month = monthKey(row.due_date)
  return isMonthlySchedule(row) && month ? `month:${month}` : `installment:${row.installment_number}`
}

function buildGroup(rows: BoardRow[]): ScheduleGroup {
  const first = rows[0]
  const amount_due = rows.reduce((sum, row) => sum + Number(row.amount_due || 0), 0)
  const remaining_amount = rows.reduce((sum, row) => sum + Number(row.remaining_amount || 0), 0)
  const paid_amount = Math.max(0, amount_due - remaining_amount)

  let payment_state: ScheduleGroup["payment_state"] = "pending"
  if (rows.some((row) => row.payment_state === "late")) payment_state = "late"
  else if (rows.some((row) => row.payment_state === "partial_late")) payment_state = "partial_late"
  else if (remaining_amount <= 0 && amount_due > 0) payment_state = "paid"
  else if (paid_amount > 0) payment_state = "partial"

  return {
    key: groupKey(first),
    installment_number: Math.min(...rows.map((row) => row.installment_number)),
    label: first.label,
    due_date: first.due_date,
    schedules: rows,
    amount_due,
    remaining_amount,
    paid_amount,
    payment_state,
  }
}

function groupSchedules(rows: BoardRow[]) {
  const map = new Map<string, BoardRow[]>()
  for (const row of rows) {
    const key = groupKey(row)
    const current = map.get(key) ?? []
    current.push(row)
    map.set(key, current)
  }

  return Array.from(map.values())
    .map(buildGroup)
    .sort((a, b) => {
      const aDate = a.due_date || ""
      const bDate = b.due_date || ""
      if (aDate !== bDate) return aDate.localeCompare(bDate)
      return a.installment_number - b.installment_number
    })
}

interface ScheduleCellProps {
  group: ScheduleGroup
  payments: FinancePaymentHistoryRow[]
  mobile?: boolean
}

function ScheduleCell({ group, payments, mobile = false }: ScheduleCellProps) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const scheduleIds = new Set(group.schedules.map((schedule) => schedule.schedule_id))
  const groupPayments = payments
    .filter((payment) => scheduleIds.has(payment.schedule_id))
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())

  const open = hovered || clicked
  const paid = group.paid_amount

  const content =
    group.payment_state === "paid" ? (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
      </span>
    ) : group.payment_state === "partial" || group.payment_state === "partial_late" ? (
      <span className={`font-semibold ${group.payment_state === "partial_late" ? "text-red-600" : "text-orange-600"}`}>
        {fmtCompact(paid)}
      </span>
    ) : group.payment_state === "late" ? (
      <span className="font-semibold text-red-600">En retard</span>
    ) : (
      <span className="text-gray-300">—</span>
    )

  return (
    <div
      className={`relative ${mobile ? "min-w-0" : "inline-flex"} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-green-200 ${mobile ? "w-full px-2 py-2" : "min-w-12 px-2 py-1"}`}
        onClick={() => setClicked((value) => !value)}
        aria-label={`${colLabel(group.label, group.due_date, false)} : ${paid.toLocaleString("fr-FR")} FCFA versés`}
      >
        {content}
      </button>

      {open && groupPayments.length > 0 && (
        <div
          className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-gray-100 pb-2">
            <p className="font-semibold text-gray-800">
              {colLabel(group.label, group.due_date, false)}
            </p>
            <p className="text-xs text-gray-500">À payer : {fmt(group.amount_due)}</p>
          </div>

          <div className="space-y-2 py-2">
            {groupPayments.map((payment, index) => (
              <div key={payment.payment_id + payment.allocation_id + index} className="rounded-md bg-gray-50 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500">{fmtDate(payment.payment_date)}</span>
                  <span className="font-semibold text-green-700">{fmt(payment.allocated_amount)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {payment.method || "Mode non renseigné"}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
            <span className="font-medium text-gray-600">Total versé</span>
            <span className="font-semibold text-gray-900">{fmt(paid)}</span>
          </div>
          {group.remaining_amount > 0 && (
            <div className="mt-1 flex items-center justify-between text-xs text-red-600">
              <span>Reste</span>
              <span className="font-semibold">{fmt(group.remaining_amount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GlobalState({ schedules }: { schedules: BoardRow[] }) {
  if (schedules.some((s) => s.payment_state === "late" || s.payment_state === "partial_late")) {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">En retard</span>
  }
  if (schedules.some((s) => s.payment_state === "partial")) {
    return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">Partiel</span>
  }
  if (schedules.length > 0 && schedules.every((s) => s.payment_state === "paid")) {
    return <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Soldé</span>
  }
  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">À jour</span>
}

export function FinanceScolarite() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { activeYear: academicYear, isLoading: isYearLoading } = useAcademicYears(establishmentId ?? null)

  const [boardRows, setBoardRows] = useState<BoardRow[]>([])
  const [paymentHistory, setPaymentHistory] = useState<FinancePaymentHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<BoardRow[] | null>(null)

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
    if (!isYearLoading) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, academicYear, isYearLoading])

  const studentsMap = useMemo(() => {
    const map = new Map<string, {
      student: any
      class: any
      enrollment_id: string
      schedules: BoardRow[]
    }>()

    for (const row of boardRows) {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, {
          student: row.student,
          class: row.class,
          enrollment_id: row.enrollment_id,
          schedules: [],
        })
      }
      map.get(row.student_id)!.schedules.push(row)
    }

    return Array.from(map.values()).map((student) => ({
      ...student,
      groups: groupSchedules(student.schedules),
    }))
  }, [boardRows])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return studentsMap

    return studentsMap.filter((student) => {
      const name = `${student.student?.first_name || ""} ${student.student?.last_name || ""}`.toLowerCase()
      const number = String(student.student?.student_number || "").toLowerCase()
      return name.includes(q) || number.includes(q)
    })
  }, [studentsMap, search])

  const columns = useMemo(() => {
    const map = new Map<string, { key: string; label: string; longLabel: string; due_date: string; installment_number: number }>()
    for (const row of boardRows) {
      const key = groupKey(row)
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: colLabel(row.label, row.due_date),
          longLabel: colLabel(row.label, row.due_date, false),
          due_date: row.due_date,
          installment_number: row.installment_number,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
      return a.installment_number - b.installment_number
    })
  }, [boardRows])

  const scheduleForColumn = (student: { groups: ScheduleGroup[] }, column: { key: string }) =>
    student.groups.find((group) => group.key === column.key)

  const renderLoadingOrEmpty = (className: string) => {
    if (loading || isYearLoading) return <div className={className}>Chargement des échéances...</div>
    if (error) return <div className={`${className} text-red-600`}>{error}</div>
    if (filteredStudents.length === 0) return <div className={className}>Aucune échéance trouvée.</div>
    return null
  }

  const studentsByClass = useMemo(() => {
    const groups = new Map<string, typeof filteredStudents>()
    for (const student of filteredStudents) {
      const key = student.class?.id || student.class?.name || "sans-classe"
      const current = groups.get(key) ?? []
      current.push(student)
      groups.set(key, current)
    }
    return Array.from(groups.entries()).map(([key, students]) => ({
      key,
      name: students[0]?.class?.name || "Classe non renseignée",
      students,
    }))
  }, [filteredStudents])

  const renderTable = (className: string, students: typeof filteredStudents) => (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{className}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{students.length} élève{students.length > 1 ? "s" : ""}</p>
      </div>

      <div className="w-full overflow-x-auto overscroll-x-contain">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="border-b border-gray-200 bg-white">
            <tr>
              <th className="sticky left-0 z-20 min-w-[180px] border-r border-gray-100 bg-white px-3 py-3 text-left font-medium text-gray-700">
                Élève
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="min-w-[72px] px-2 py-3 text-center font-medium text-gray-700"
                  title={`${column.longLabel}${column.due_date ? ` — ${fmtDate(column.due_date)}` : ""}`}
                >
                  {column.label}
                </th>
              ))}
              <th className="min-w-[170px] px-3 py-3 text-left font-medium text-gray-700">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr key={student.student?.id || student.enrollment_id} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-3 py-3 font-medium text-gray-900">
                  <div className="max-w-[180px] truncate">
                    {student.student ? `${student.student.first_name} ${student.student.last_name}` : "Élève inconnu"}
                  </div>
                  {student.student?.student_number && (
                    <div className="mt-0.5 text-[11px] font-normal text-gray-400">
                      {student.student.student_number}
                    </div>
                  )}
                </td>
                {columns.map((column) => {
                  const group = scheduleForColumn(student, column)
                  return (
                    <td key={column.key} className="px-2 py-2 text-center">
                      {group ? <ScheduleCell group={group} payments={paymentHistory} /> : <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <GlobalState schedules={student.schedules} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setSelectedStudentForPay(student.schedules)}
                    >
                      Encaisser
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Scolarité</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi des échéances et des versements. Survolez ou touchez une échéance pour voir le détail.
        </p>
      </div>

      <div className="flex w-full">
        <Input
          placeholder="Rechercher un élève..."
          className="w-full max-w-sm rounded-md"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading || isYearLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Chargement des échéances...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-white px-4 py-10 text-center text-sm text-red-600">
          {error}
        </div>
      ) : studentsByClass.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          Aucune échéance trouvée.
        </div>
      ) : (
        <div className="space-y-4">
          {studentsByClass.map((group) => renderTable(group.name, group.students))}
        </div>
      )}

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
