"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Search, Printer, RefreshCw } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { financeService } from "@/lib/supabase/services/finance.service"

type DebtRow = any

function fmt(value: number) {
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA"
}

function getName(row: DebtRow) {
  return row.student ? `${row.student.first_name || ""} ${row.student.last_name || ""}`.trim() : "Élève inconnu"
}

export default function ImpayesPage() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const { data: academicYears, activeYear, selectedYear, selectYear, isLoading: yearsLoading } =
    useAcademicYears(establishmentId ?? null)
  const academicYear = selectedYear ?? activeYear

  const [rows, setRows] = useState<DebtRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")

  const load = async () => {
    if (!establishmentId || !academicYear) return
    setLoading(true)
    setError(null)
    try {
      const data = await financeService.getStudentPaymentBoard(establishmentId, academicYear.id)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      setRows(data.filter((row: DebtRow) =>
        Number(row.remaining_amount || 0) > 0 &&
        row.due_date &&
        new Date(row.due_date).getTime() <= today.getTime()
      ))
    } catch (err: any) {
      setError(err?.message || "Impossible de charger les impayés.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!yearsLoading) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, academicYear?.id, yearsLoading])

  const classOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => {
      if (row.class_id && row.class?.name) map.set(row.class_id, row.class.name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const name = getName(row).toLowerCase()
      const number = String(row.student?.student_number || "").toLowerCase()
      return (!q || name.includes(q) || number.includes(q)) &&
        (classFilter === "all" || row.class_id === classFilter)
    })
  }, [rows, search, classFilter])

  const students = useMemo(() => {
    const map = new Map<string, { student: any; className: string; rows: DebtRow[]; total: number }>()
    filtered.forEach((row) => {
      const key = row.student_id
      const current = map.get(key)
      if (current) {
        current.rows.push(row)
        current.total += Number(row.remaining_amount || 0)
      } else {
        map.set(key, {
          student: row.student,
          className: row.class?.name || "Classe non renseignée",
          rows: [row],
          total: Number(row.remaining_amount || 0),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtered])

  const totalDue = students.reduce((sum, student) => sum + student.total, 0)

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-[#d9dce5] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#515f74]">Finance</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#131b2e]">Impayés</h1>
          <p className="mt-1 text-sm text-[#515f74]">
            Suivi des échéances arrivées à terme et restant à payer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center justify-center gap-2 border border-[#c5c5d3] bg-white px-3 text-sm font-medium text-[#303746] hover:bg-[#f5f6fa]"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 border-y border-[#d9dce5] bg-white sm:grid-cols-3">
        <div className="border-b border-[#d9dce5] px-4 py-4 sm:border-b-0 sm:border-r">
          <p className="text-xs text-[#515f74]">Élèves concernés</p>
          <p className="mt-1 text-xl font-semibold text-[#131b2e]">{students.length}</p>
        </div>
        <div className="border-b border-[#d9dce5] px-4 py-4 sm:border-b-0 sm:border-r">
          <p className="text-xs text-[#515f74]">Échéances impayées</p>
          <p className="mt-1 text-xl font-semibold text-[#131b2e]">{filtered.length}</p>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs text-[#515f74]">Montant restant</p>
          <p className="mt-1 text-xl font-semibold text-red-700">{fmt(totalDue)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-y border-[#d9dce5] bg-white px-3 py-3 sm:flex-row sm:items-end">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-[#515f74]">Année académique</label>
          <select
            value={academicYear?.id ?? ""}
            onChange={(e) => selectYear(e.target.value)}
            className="h-9 w-full border border-[#c5c5d3] bg-white px-3 text-sm text-[#303746]"
          >
            {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-[#515f74]">Classe</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-9 w-full border border-[#c5c5d3] bg-white px-3 text-sm text-[#303746]"
          >
            <option value="all">Toutes les classes</option>
            {classOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[#515f74]">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8496]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou numéro d'élève..."
              className="h-9 w-full border border-[#c5c5d3] bg-white pl-9 pr-3 text-sm text-[#303746] outline-none focus:border-[#1e3a8a]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 border border-[#c5c5d3] bg-white px-3 text-sm font-medium text-[#303746] hover:bg-[#f5f6fa]"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>

      {loading || yearsLoading ? (
        <div className="border-y border-[#d9dce5] bg-white px-4 py-12 text-center text-sm text-[#515f74]">
          Chargement des impayés...
        </div>
      ) : error ? (
        <div className="border border-red-200 bg-white px-4 py-10 text-center text-sm text-red-700">{error}</div>
      ) : students.length === 0 ? (
        <div className="border-y border-[#d9dce5] bg-white px-4 py-12 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-[#7a8496]" />
          <p className="mt-2 text-sm font-medium text-[#303746]">Aucun impayé à terme</p>
          <p className="mt-1 text-xs text-[#7a8496]">Aucune échéance arrivée à terme ne présente de solde restant.</p>
        </div>
      ) : (
        <section className="border-y border-[#d9dce5] bg-white">
          <div className="border-b border-[#d9dce5] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#131b2e]">Liste des impayés</h2>
            <p className="mt-0.5 text-xs text-[#515f74]">Les montants sont calculés à partir des échéances et versements enregistrés.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-[#d9dce5] bg-[#f7f8fb]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#515f74]">Élève</th>
                  <th className="px-4 py-3 text-left font-medium text-[#515f74]">Classe</th>
                  <th className="px-4 py-3 text-left font-medium text-[#515f74]">Échéances</th>
                  <th className="px-4 py-3 text-left font-medium text-[#515f74]">Dernière échéance</th>
                  <th className="px-4 py-3 text-right font-medium text-[#515f74]">Reste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {students.map((student) => {
                  const latest = [...student.rows].sort((a, b) => String(b.due_date).localeCompare(String(a.due_date)))[0]
                  return (
                    <tr key={student.student?.id || student.rows[0].student_id} className="hover:bg-[#fafbfc]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#131b2e]">{getName(student.rows[0])}</p>
                        {student.student?.student_number && <p className="text-xs text-[#7a8496]">{student.student.student_number}</p>}
                      </td>
                      <td className="px-4 py-3 text-[#515f74]">{student.className}</td>
                      <td className="px-4 py-3 text-[#515f74]">{student.rows.length}</td>
                      <td className="px-4 py-3 text-[#515f74]">{latest?.due_date ? new Date(latest.due_date).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-700">{fmt(student.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style jsx global>{`
        @media print {
          header, nav, aside, button { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
