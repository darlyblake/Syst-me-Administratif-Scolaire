"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Building2, Wallet, Search, RefreshCw } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentModal } from "@/components/finance/PaymentModal"

type CoverageRow = {
  enrollment_id: string
  establishment_id: string
  student_id: string
  class_id: string
  academic_year_id: string
  schedule_id: string
  installment_number: number
  label: string
  due_date: string
  amount_due: number
  amount_paid: number
  remaining_amount: number
  status: string
  payment_state: string
  days_overdue: number
  category: string
  payer_type: string
  organization_id?: string | null
  organization_name?: string | null
  first_name?: string
  last_name?: string
  student_number?: string | null
  class_name?: string | null
}

type SponsoringOrganization = { id: string; name: string; is_state: boolean; active: boolean }

type CoveredStudent = {
  key: string
  student_id: string
  enrollment_id: string
  organization_id: string | null
  organization_name: string
  first_name: string
  last_name: string
  student_number: string | null
  class_name: string | null
  schedules: CoverageRow[]
  due: number
  paid: number
  remaining: number
}

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"

export default function SuiviPrisesEnChargePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear } = useAcademicYears(establishmentId)
  const [search, setSearch] = useState("")
  const [organizationId, setOrganizationId] = useState("all")
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [organizations, setOrganizations] = useState<SponsoringOrganization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentRows, setPaymentRows] = useState<any[] | null>(null)

  const load = useCallback(async () => {
    if (!establishmentId || !activeYear?.id) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Cette vue ne retourne que les échéances prises en charge par un organisme
      // ou par l'État. Les échéances restant à la charge des familles sont exclues.
      const [organizationResult, coverageResult] = await Promise.all([
        supabaseBrowser
          .from("sponsoring_organizations")
          .select("id,name,is_state,active")
          .eq("establishment_id", establishmentId)
          .eq("active", true)
          .order("name"),
        supabaseBrowser
          .from("v_finance_organization_coverage_board")
          .select("*")
          .eq("establishment_id", establishmentId)
          .eq("academic_year_id", activeYear.id),
      ])
      if (organizationResult.error) throw organizationResult.error
      if (coverageResult.error) throw coverageResult.error
      setOrganizations((organizationResult.data ?? []) as SponsoringOrganization[])
      setRows((coverageResult.data ?? []) as CoverageRow[])
    } catch (err: any) {
      console.error("Chargement des prises en charge impossible", err)
      setError(err?.message || "Impossible de charger les prises en charge.")
      setRows([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [establishmentId, activeYear?.id])

  useEffect(() => { void load() }, [load])

  const organizationOptions = useMemo(() => {
    const options = organizations.map((organization) => [organization.id, organization.name] as [string, string])
    if (rows.some((row) => row.payer_type === "state" || row.organization_name === "État") &&
      !options.some(([id]) => id === "state")) options.push(["state", "État"])
    return options.sort((a, b) => a[1].localeCompare(b[1], "fr"))
  }, [organizations, rows])

  const students = useMemo(() => {
    const map = new Map<string, CoveredStudent>()
    const selectedRows = rows.filter((row) => organizationId === "all" ||
      (row.organization_id ?? "state") === organizationId)
    for (const row of selectedRows) {
      // Une seule ligne par élève, même si plusieurs échéances ou organismes le financent.
      const key = row.student_id
      const current = map.get(key)
      if (current) {
        current.schedules.push(row)
        const names = new Set(current.organization_name.split(" · "))
        names.add(row.organization_name || "État")
        current.organization_name = Array.from(names).join(" · ")
        current.due += Number(row.amount_due || 0)
        current.paid += Number(row.amount_paid || 0)
        current.remaining += Number(row.remaining_amount || 0)
      } else {
        map.set(key, {
          key,
          student_id: row.student_id,
          enrollment_id: row.enrollment_id,
          organization_id: row.organization_id ?? null,
          organization_name: row.organization_name || "État",
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          student_number: row.student_number ?? null,
          class_name: row.class_name ?? null,
          schedules: [row],
          due: Number(row.amount_due || 0),
          paid: Number(row.amount_paid || 0),
          remaining: Number(row.remaining_amount || 0),
        })
      }
    }

    const q = search.trim().toLocaleLowerCase("fr")
    return Array.from(map.values())
      .filter((student) => !q || [
        student.first_name, student.last_name, student.student_number || "",
        student.class_name || "", student.organization_name,
      ].join(" ").toLocaleLowerCase("fr").includes(q))
      .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr") || a.first_name.localeCompare(b.first_name, "fr"))
  }, [rows, organizationId, search])

  const totals = useMemo(() => students.reduce((acc, student) => {
    acc.due += student.due
    acc.paid += student.paid
    acc.remaining += student.remaining
    return acc
  }, { due: 0, paid: 0, remaining: 0 }), [students])

  const openPayment = (student: CoveredStudent) => {
    setPaymentRows(student.schedules
      .filter((item) => Number(item.remaining_amount) > 0)
      .map((item) => ({
        ...item,
        payer_type: item.payer_type,
        student: { first_name: item.first_name, last_name: item.last_name, student_number: item.student_number },
        class: { name: item.class_name },
      })))
  }

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border bg-white"><Building2 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Suivi des prises en charge</h1>
            <p className="mt-1 text-sm text-slate-500">Élèves financés par un organisme ou par l’État. Les échéances à la charge des parents ne sont pas affichées.</p>
          </div>
        </div>
        <Button variant="outline" asChild><Link href="/ecole/settings/prises-en-charge">Configurer les organismes</Link></Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Montant pris en charge</p><p className="mt-1 text-lg font-semibold">{fmt(totals.due)}</p></div>
        <div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Montant encaissé</p><p className="mt-1 text-lg font-semibold text-emerald-700">{fmt(totals.paid)}</p></div>
        <div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Reste attendu</p><p className="mt-1 text-lg font-semibold text-amber-700">{fmt(totals.remaining)}</p></div>
      </section>

      <section className="flex flex-col gap-3 border border-slate-200 bg-white p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="coverage-search">Rechercher un élève</label>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input id="coverage-search" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, matricule ou classe" /></div>
        </div>
        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="coverage-organization">Filtrer par organisme</label>
          <select id="coverage-organization" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="all">Tous les organismes</option>
            {organizationOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Actualiser</Button>
      </section>

      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Élèves pris en charge</h2>
          <p className="mt-1 text-xs text-slate-500">{activeYear?.name ?? "Année scolaire active"} · {students.length} élève(s) · {organizationOptions.length} organisme(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>
              <th className="px-4 py-3">Élève</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Organisme payeur</th>
              <th className="px-4 py-3 text-right">Montant prévu</th><th className="px-4 py-3 text-right">Payé</th><th className="px-4 py-3 text-right">Reste</th><th className="px-4 py-3">Échéances</th><th className="px-4 py-3">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => <tr key={student.key} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{student.first_name} {student.last_name}<span className="block text-xs font-normal text-slate-500">{student.student_number || "Sans matricule"}</span></td>
                <td className="px-4 py-3">{student.class_name || "—"}</td>
                <td className="px-4 py-3">{student.organization_name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(student.due)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{fmt(student.paid)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(student.remaining)}</td>
                <td className="px-4 py-3">{student.schedules.length}</td>
                <td className="px-4 py-3">{student.remaining > 0 ? <Button size="sm" onClick={() => openPayment(student)}>Enregistrer un paiement</Button> : <span className="text-xs text-emerald-700">Soldé</span>}</td>
              </tr>)}
              {!students.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">{loading ? "Chargement…" : error || "Aucun élève pris en charge pour ces filtres."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {paymentRows && paymentRows.length > 0 && <PaymentModal open={true} onClose={() => setPaymentRows(null)} studentSchedules={paymentRows} onSuccess={() => { setPaymentRows(null); void load() }} />}
    </main>
  )
}
