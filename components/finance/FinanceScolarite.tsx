"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, X } from "lucide-react"
import { financeService } from "@/lib/supabase/services/finance.service"
import type { FinancePaymentHistoryRow, FinanceStudentPaymentBoardRow } from "@/lib/supabase/types"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentModal } from "./PaymentModal"

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const MOIS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

type BoardRow = FinanceStudentPaymentBoardRow & { student?: any; class?: any; category?: string }

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

function isRegistrationSchedule(row: Pick<FinanceStudentPaymentBoardRow, "label"> & { category?: string }) {
  return row.category === "registration" || row.label.toLowerCase().includes("frais d'inscription")
}

function colLabel(label: string, dueDate: string, short = true, category?: string) {
  if (category === "registration" || label.toLowerCase().includes("frais d'inscription")) {
    return short ? "Inscription" : "Frais d'inscription"
  }

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

function isMonthlySchedule(row: FinanceStudentPaymentBoardRow & { category?: string }) {
  if (isRegistrationSchedule(row)) return false
  const label = row.label.toLowerCase()
  return label.includes("mensual") || /(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i.test(label)
}

function groupKey(row: FinanceStudentPaymentBoardRow & { category?: string }) {
  if (isRegistrationSchedule(row)) return `registration:${row.schedule_id}`
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
        aria-label={`${colLabel(group.label, group.due_date, false, group.schedules[0]?.category)} : ${paid.toLocaleString("fr-FR")} FCFA versés`}
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
  // Un versement sur une échéance future est une avance : il ne doit pas
  // rendre l'élève "Partiel" tant que cette échéance n'est pas exigible.
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const dueSchedules = schedules.filter((schedule) => {
    if (!schedule.due_date) return true
    const dueDate = new Date(schedule.due_date)
    return dueDate <= today
  })

  const hasLate = dueSchedules.some(
    (s) => s.payment_state === "late" || s.payment_state === "partial_late",
  )
  if (hasLate) {
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">En retard</span>
  }

  const hasDuePartial = dueSchedules.some((s) => s.payment_state === "partial")
  if (hasDuePartial) {
    return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">Partiel</span>
  }

  // Les échéances futures (ex. octobre alors que septembre est la période
  // demandée) sont volontairement ignorées pour le statut courant.
  if (
    dueSchedules.length > 0 &&
    dueSchedules.every((s) => s.payment_state === "paid")
  ) {
    const allSchedulesPaid = schedules.length > 0 && schedules.every((s) => s.payment_state === "paid")
    return allSchedulesPaid ? (
      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">Soldé</span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">À jour</span>
    )
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
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<{
    student: any
    class: any
    schedules: BoardRow[]
  } | null>(null)
  const [showAddOption, setShowAddOption] = useState(false)
  const [availableOptions, setAvailableOptions] = useState<any[]>([])
  const [selectedOptionId, setSelectedOptionId] = useState("")
  const [addingOption, setAddingOption] = useState(false)
  const [optionError, setOptionError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!showAddOption || !establishmentId) return
    let active = true
    void financeService.getActiveStudentOptions(establishmentId).then((options) => {
      if (!active) return
      const existing = new Set(
        selectedStudentForDetails?.schedules
          .filter((s) => s.category === "option")
          .map((s) => s.label.toLowerCase()) ?? [],
      )
      setAvailableOptions(options.filter((option: any) => !existing.has(String(option.name).toLowerCase())))
    }).catch((err: any) => setOptionError(err.message || "Impossible de charger les options."))
    return () => { active = false }
  }, [showAddOption, establishmentId, selectedStudentForDetails])

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
      if (isRegistrationSchedule(row)) continue
      const key = groupKey(row)
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: colLabel(row.label, row.due_date, true, row.category),
          longLabel: colLabel(row.label, row.due_date, false, row.category),
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

  const [expandedMobileStudents, setExpandedMobileStudents] = useState<Set<string>>(new Set())

  const toggleMobileStudent = (studentId: string) => {
    setExpandedMobileStudents((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const renderTable = (className: string, students: typeof filteredStudents) => (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{className}</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {students.length} élève{students.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Mobile : vrai tableau compact. Un clic sur la ligne ouvre les détails. */}
      <div className="md:hidden">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-600">Élève</th>
              <th className="w-[92px] px-2 py-3 text-center font-medium text-gray-600">État</th>
              <th className="w-9 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => {
              const studentId = student.student?.id || student.enrollment_id
              const expanded = expandedMobileStudents.has(studentId)
              const registration = student.groups.find((group) => group.schedules.some((schedule) => isRegistrationSchedule(schedule)))

              return (
                <tr key={studentId}>
                  <td colSpan={3} className="p-0">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-3 text-left active:bg-gray-50"
                      onClick={() => toggleMobileStudent(studentId)}
                      aria-expanded={expanded}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-900">
                          {student.student
                            ? `${student.student.first_name} ${student.student.last_name}`
                            : "Élève inconnu"}
                        </span>
                        {student.student?.student_number && (
                          <span className="mt-0.5 block truncate text-[11px] text-gray-400">
                            {student.student.student_number}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0">
                        <GlobalState schedules={student.schedules} />
                      </span>
                      <span
                        className={`ml-1 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t border-gray-100 bg-gray-50/70 px-3 py-3">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Échéances</p>
                            <p className="text-xs text-gray-500">Touchez un mois pour voir les versements.</p>
                          </div>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedStudentForPay(student.schedules)
                            }}
                          >
                            Encaisser
                          </Button>
                        </div>

                        {registration && (
                          <div className="mb-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium uppercase text-gray-400">Inscription</p>
                                <p className="truncate text-xs text-gray-500">
                                  {fmtDate(registration.due_date)} · {fmt(registration.amount_due)}
                                </p>
                              </div>
                              <ScheduleCell group={registration} payments={paymentHistory} mobile />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1.5">
                          {columns.map((column) => {
                            const group = scheduleForColumn(student, column)

                            return (
                              <div
                                key={column.key}
                                className="min-w-0 rounded-md border border-gray-200 bg-white px-1.5 py-2 text-center"
                              >
                                <div className="text-[10px] font-medium uppercase text-gray-400">
                                  {column.label}
                                </div>
                                {group ? (
                                  <ScheduleCell
                                    group={group}
                                    payments={paymentHistory}
                                    mobile
                                  />
                                ) : (
                                  <div className="py-2 text-xs text-gray-300">—</div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-500">Situation</span>
                            <GlobalState schedules={student.schedules} />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Tablette / PC : on conserve le tableau large existant. */}
      <div className="hidden w-full md:block">
        <table className="w-full min-w-[760px] table-fixed text-sm">
          <colgroup>
            <col className="w-[22%]" />
            {columns.map((column) => <col key={`col-${column.key}`} />)}
            <col className="w-[18%]" />
          </colgroup>
          <thead className="border-b border-gray-200 bg-white">
            <tr>
              <th className="sticky left-0 z-20 border-r border-gray-100 bg-white px-3 py-3 text-left font-medium text-gray-700">
                Élève
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-2 py-3 text-center font-medium text-gray-700"
                  title={`${column.longLabel}${column.due_date ? ` — ${fmtDate(column.due_date)}` : ""}`}
                >
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-3 text-left font-medium text-gray-700">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr key={student.student?.id || student.enrollment_id} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-3 py-3 font-medium text-gray-900">
                  <button type="button" className="w-full text-left hover:text-green-700" onClick={() => setSelectedStudentForDetails({ student: student.student, class: student.class, schedules: student.schedules })}>
                    <div className="max-w-[180px] truncate underline-offset-2 hover:underline">
                      {student.student ? `${student.student.first_name} ${student.student.last_name}` : "Élève inconnu"}
                    </div>
                    {student.student?.student_number && <div className="mt-0.5 text-[11px] font-normal text-gray-400">{student.student.student_number}</div>}
                  </button>
                </td>
                {columns.map((column) => {
                  const group = scheduleForColumn(student, column)
                  return (
                    <td key={column.key} className="px-2 py-2 text-center">
                      {group ? (
                        <ScheduleCell group={group} payments={paymentHistory} />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
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
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Scolarité</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi des échéances et des versements. Sur téléphone, touchez un élève pour afficher ses échéances et ses versements.
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
        <div className="space-y-3 sm:space-y-4">
          {studentsByClass.map((group) => renderTable(group.name, group.students))}
        </div>
      )}


      {selectedStudentForDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  {selectedStudentForDetails.student
                    ? `${selectedStudentForDetails.student.first_name} ${selectedStudentForDetails.student.last_name}`
                    : "Élève"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {selectedStudentForDetails.student?.student_number || "Numéro non renseigné"}
                  {selectedStudentForDetails.class?.name ? ` · ${selectedStudentForDetails.class.name}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100"
                onClick={() => setSelectedStudentForDetails(null)}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto p-5">
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-[11px] text-gray-500">Total prévu</p>
                  <p className="mt-1 text-sm font-semibold">
                    {fmt(selectedStudentForDetails.schedules.reduce((sum, s) => sum + Number(s.amount_due || 0), 0))}
                  </p>
                </div>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <p className="text-[11px] text-gray-500">Total payé</p>
                  <p className="mt-1 text-sm font-semibold text-green-700">
                    {fmt(selectedStudentForDetails.schedules.reduce((sum, s) => sum + Math.max(0, Number(s.amount_due || 0) - Number(s.remaining_amount || 0)), 0))}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border bg-gray-50 p-3 sm:col-span-1">
                  <p className="text-[11px] text-gray-500">Reste</p>
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    {fmt(selectedStudentForDetails.schedules.reduce((sum, s) => sum + Number(s.remaining_amount || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="border-b bg-gray-50 px-3 py-2.5 text-xs font-semibold">Échéances et paiements</div>
                <div className="divide-y">
                  {groupSchedules(selectedStudentForDetails.schedules).map((group) => {
                    const ids = new Set(group.schedules.map((s) => s.schedule_id))
                    const payments = paymentHistory
                      .filter((p) => ids.has(p.schedule_id))
                      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())

                    return (
                      <div key={group.key} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{colLabel(group.label, group.due_date, false)}</p>
                            <p className="text-xs text-gray-500">
                              Échéance : {fmtDate(group.due_date)} · À payer : {fmt(group.amount_due)}
                            </p>
                          </div>
                          {group.payment_state === "paid" ? (
                            <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">Payé</span>
                          ) : group.paid_amount > 0 ? (
                            <span className="shrink-0 rounded-full bg-orange-50 px-2 py-1 text-xs text-orange-700">Partiel</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Non payé</span>
                          )}
                        </div>

                        {payments.length ? (
                          <div className="mt-2 space-y-1.5">
                            {payments.map((payment, index) => (
                              <div
                                key={payment.payment_id + payment.allocation_id + index}
                                className="flex flex-wrap justify-between gap-2 rounded-md bg-gray-50 px-2.5 py-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-medium">{fmtDate(payment.payment_date)}</span>
                                  <span className="ml-2 text-gray-500">{payment.method || "Mode non renseigné"}</span>
                                  {payment.reference && (
                                    <span className="ml-2 text-gray-400">Réf. {payment.reference}</span>
                                  )}
                                </div>
                                <span className="shrink-0 font-semibold text-green-700">{fmt(payment.allocated_amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-gray-400">Aucun versement enregistré.</p>
                        )}

                        <div className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-1 border-t pt-2 text-xs">
                          <span>Payé : <strong>{fmt(group.paid_amount)}</strong></span>
                          <span>Reste : <strong className="text-red-600">{fmt(group.remaining_amount)}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setOptionError(null)
                  setSelectedOptionId("")
                  setShowAddOption(true)
                }}
              >
                + Ajouter une option
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setSelectedStudentForDetails(null)}
              >
                Fermer
              </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedStudentForPay(selectedStudentForDetails.schedules)
                    setSelectedStudentForDetails(null)
                  }}
                >
                  Encaisser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddOption && selectedStudentForDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <h3 className="font-semibold text-gray-900">Ajouter une option</h3>
              <p className="mt-1 text-xs text-gray-500">L'option sera ajoutée à l'inscription et pourra ensuite être encaissée séparément.</p>
            </div>
            <div className="space-y-3 p-5">
              {optionError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{optionError}</p>}
              <select
                value={selectedOptionId}
                onChange={(e) => setSelectedOptionId(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choisir une option...</option>
                {availableOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} — {Number(option.default_amount || 0).toLocaleString("fr-FR")} FCFA
                  </option>
                ))}
              </select>
              {availableOptions.length === 0 && !optionError && (
                <p className="text-sm text-gray-500">Aucune autre option active n'est disponible.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button variant="outline" onClick={() => setShowAddOption(false)} disabled={addingOption}>Annuler</Button>
              <Button
                disabled={!selectedOptionId || addingOption}
                onClick={async () => {
                  try {
                    setAddingOption(true)
                    setOptionError(null)
                    await financeService.addEnrollmentOption(selectedStudentForDetails.enrollment_id, selectedOptionId)
                    setShowAddOption(false)
                    await reload()
                    const refreshed = await financeService.getStudentPaymentBoard(establishmentId!, academicYear!.id)
                    const schedules = refreshed.filter((row: any) => row.enrollment_id === selectedStudentForDetails.enrollment_id) as BoardRow[]
                    setSelectedStudentForDetails({ ...selectedStudentForDetails, schedules })
                  } catch (err: any) {
                    setOptionError(err.message || "Impossible d'ajouter l'option.")
                  } finally {
                    setAddingOption(false)
                  }
                }}
              >
                {addingOption ? "Ajout..." : "Ajouter l'option"}
              </Button>
            </div>
          </div>
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
