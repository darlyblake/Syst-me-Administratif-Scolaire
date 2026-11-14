"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Building2, Printer, RefreshCw, Search, Users, Wallet } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrganizationPaymentModal } from "@/components/finance/OrganizationPaymentModal"

type CoverageRow = {
  enrollment_id: string
  establishment_id: string
  student_id: string
  academic_year_id: string
  schedule_id: string
  installment_number: number
  label: string
  due_date: string
  amount_due: number
  amount_paid: number
  remaining_amount: number
  category: string
  payer_type: string
  organization_id: string | null
  organization_name: string | null
  first_name: string
  last_name: string
  student_number: string | null
  class_name: string | null
}

type SponsoringOrganization = {
  id: string
  name: string
  is_state: boolean
  active: boolean
}

type OrganizationPayment = {
  id: string
  organization_id: string
  academic_year_id: string
  amount: number
  payment_date: string
  method: string | null
  reference: string | null
  notes: string | null
}

type OrganizationStudent = {
  enrollment_id: string
  student_id: string
  first_name: string
  last_name: string
  student_number: string | null
  class_name: string | null
  categories: string[]
}

type OrganizationSummary = {
  organization: SponsoringOrganization
  students: number
  due: number
  paid: number
  remaining: number
}

const formatAmount = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR") + " FCFA"

const categoryName = (category: string) => {
  if (category === "registration") return "Inscription"
  if (category === "option") return "Options et services"
  return "Scolarité"
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR")
}

export default function SuiviPrisesEnChargePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: academicYears, selectedYear, selectYear } = useAcademicYears(establishmentId)

  const [search, setSearch] = useState("")
  const [organizationId, setOrganizationId] = useState("all")
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [organizations, setOrganizations] = useState<SponsoringOrganization[]>([])
  const [payments, setPayments] = useState<OrganizationPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const load = useCallback(async () => {
    if (!establishmentId || !selectedYear?.id) {
      setRows([])
      setOrganizations([])
      setPayments([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [organizationResult, coverageResult, paymentResult] = await Promise.all([
        supabaseBrowser
          .from("sponsoring_organizations")
          .select("id,name,is_state,active")
          .eq("establishment_id", establishmentId)
          .eq("is_state", false)
          .order("name"),
        supabaseBrowser
          .from("v_finance_organization_coverage_board")
          .select("*")
          .eq("establishment_id", establishmentId)
          .eq("academic_year_id", selectedYear.id),
        supabaseBrowser
          .from("organization_payments")
          .select("id,organization_id,academic_year_id,amount,payment_date,method,reference,notes")
          .eq("establishment_id", establishmentId)
          .eq("academic_year_id", selectedYear.id)
          .order("payment_date", { ascending: false }),
      ])

      if (organizationResult.error) throw organizationResult.error
      if (coverageResult.error) throw coverageResult.error
      if (paymentResult.error) throw paymentResult.error

      setOrganizations((organizationResult.data ?? []) as SponsoringOrganization[])
      setRows((coverageResult.data ?? []) as CoverageRow[])
      setPayments((paymentResult.data ?? []) as OrganizationPayment[])
    } catch (err: any) {
      console.error("Chargement du suivi des organisations impossible", err)
      setError(err?.message || "Impossible de charger le suivi financier des organisations.")
      setRows([])
      setOrganizations([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [establishmentId, selectedYear?.id])

  useEffect(() => { void load() }, [load])

  const organizationSummaries = useMemo<OrganizationSummary[]>(() => {
    return organizations.map((organization) => {
      const organizationRows = rows.filter((row) =>
        row.payer_type === "other" && row.organization_id === organization.id
      )
      const enrollmentIds = new Set(organizationRows.map((row) => row.enrollment_id))
      return {
        organization,
        students: enrollmentIds.size,
        due: organizationRows.reduce((sum, row) => sum + Number(row.amount_due || 0), 0),
        paid: organizationRows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0),
        remaining: organizationRows.reduce((sum, row) => sum + Number(row.remaining_amount || 0), 0),
      }
    })
  }, [organizations, rows])

  const visibleOrganizations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return organizationSummaries.filter((item) =>
      !query || item.organization.name.toLocaleLowerCase("fr").includes(query)
    )
  }, [organizationSummaries, search])

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId) ?? null,
    [organizations, organizationId]
  )

  const selectedSummary = useMemo(
    () => organizationSummaries.find((item) => item.organization.id === organizationId) ?? null,
    [organizationSummaries, organizationId]
  )

  const coveredStudents = useMemo<OrganizationStudent[]>(() => {
    if (!organizationId || organizationId === "all") return []
    const selectedRows = rows.filter((row) =>
      row.payer_type === "other" && row.organization_id === organizationId
    )
    const map = new Map<string, OrganizationStudent>()

    for (const row of selectedRows) {
      const current = map.get(row.enrollment_id)
      if (current) {
        const category = categoryName(row.category)
        if (!current.categories.includes(category)) current.categories.push(category)
      } else {
        map.set(row.enrollment_id, {
          enrollment_id: row.enrollment_id,
          student_id: row.student_id,
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          student_number: row.student_number,
          class_name: row.class_name,
          categories: [categoryName(row.category)],
        })
      }
    }

    const query = search.trim().toLocaleLowerCase("fr")
    return Array.from(map.values())
      .filter((student) => !query || [
        student.first_name, student.last_name, student.student_number || "", student.class_name || "",
      ].join(" ").toLocaleLowerCase("fr").includes(query))
      .sort((a, b) =>
        a.last_name.localeCompare(b.last_name, "fr") ||
        a.first_name.localeCompare(b.first_name, "fr")
      )
  }, [rows, organizationId, search])

  const selectedPayments = useMemo(() => payments.filter(
    (payment) => payment.organization_id === organizationId
  ), [payments, organizationId])

  const totalSummary = useMemo(() => organizationSummaries.reduce((total, item) => ({
    due: total.due + item.due,
    paid: total.paid + item.paid,
    remaining: total.remaining + item.remaining,
  }), { due: 0, paid: 0, remaining: 0 }), [organizationSummaries])

  return (
    <main className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-white">
            <Building2 className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Suivi financier des organisations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Un montant annuel global par organisation, indépendamment du nombre d'élèves pris en charge.
            </p>
          </div>
        </div>
        <div className="no-print flex items-center gap-2">
          <select
            aria-label="Année scolaire"
            value={selectedYear?.id ?? ""}
            onChange={(event) => selectYear(event.target.value)}
            className="h-10 max-w-[190px] rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
          {organizationId !== "all" && (
            <Button variant="outline" onClick={() => { setOrganizationId("all"); setSearch("") }} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
          )}
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {organizationId === "all" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Montant annuel attendu</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(totalSummary.due)}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Total des versements affectés</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{formatAmount(totalSummary.paid)}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Reste global à recevoir</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-700">{formatAmount(totalSummary.remaining)}</p>
            </div>
          </section>

          <section className="flex flex-col gap-3 border border-slate-200 bg-white p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="organization-search" className="mb-1.5 block text-xs font-medium text-slate-600">
                Rechercher une organisation
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="organization-search"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nom de l'organisation"
                />
              </div>
            </div>
            <p className="pb-2 text-xs text-slate-500">{selectedYear?.name ?? "Année scolaire active"} · {organizations.length} organisation(s)</p>
          </section>

          <section className="overflow-hidden border border-slate-200 bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Situation annuelle par organisation</h2>
              <p className="mt-1 text-xs text-slate-500">
                Les montants sont regroupés au niveau de l'organisation. Aucun solde individuel n'est présenté ici.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3 text-center">Élèves</th>
                    <th className="px-4 py-3 text-right">Montant annuel</th>
                    <th className="px-4 py-3 text-right">Versé</th>
                    <th className="px-4 py-3 text-right">Reste global</th>
                    <th className="px-4 py-3 text-right">Fiche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOrganizations.map((item) => (
                    <tr key={item.organization.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.organization.name}{!item.organization.active && <span className="ml-2 text-xs font-normal text-slate-500">(inactive)</span>}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{item.students}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatAmount(item.due)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatAmount(item.paid)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatAmount(item.remaining)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => { setOrganizationId(item.organization.id); setSearch("") }}>
                          Consulter
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!visibleOrganizations.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        {loading ? "Chargement..." : "Aucune organisation trouvée."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : selectedOrganization && selectedSummary ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fiche annuelle de l'organisation</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedOrganization.name}{!selectedOrganization.active && <span className="ml-2 text-xs font-normal text-slate-500">(inactive)</span>}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedYear?.name ?? "Année scolaire active"}</p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />Imprimer la fiche
              </Button>
              <Button onClick={() => setPaymentModalOpen(true)} disabled={selectedSummary.remaining <= 0} className="gap-2">
                <Wallet className="h-4 w-4" />Enregistrer un versement
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Montant annuel dû</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatAmount(selectedSummary.due)}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Total versé</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{formatAmount(selectedSummary.paid)}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Reste à payer par l'organisation</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-700">{formatAmount(selectedSummary.remaining)}</p>
            </div>
          </div>

          <section className="overflow-hidden border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Élèves couverts par l'organisation</h3>
                <p className="mt-1 text-xs text-slate-500">
                  <Users className="mr-1 inline h-3.5 w-3.5" />{coveredStudents.length} élève(s) · détail justificatif du montant annuel
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Élève</th>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Frais pris en charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coveredStudents.map((student) => (
                    <tr key={student.enrollment_id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{student.first_name} {student.last_name}</td>
                      <td className="px-4 py-3 text-slate-600">{student.student_number || "—"}</td>
                      <td className="px-4 py-3">{student.class_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{student.categories.join(", ")}</td>
                    </tr>
                  ))}
                  {!coveredStudents.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        Aucun élève n'est actuellement rattaché à cette organisation pour cette année.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden border border-slate-200 bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Historique des versements globaux</h3>
              <p className="mt-1 text-xs text-slate-500">Chaque ligne correspond à un versement effectué par l'organisation.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Moyen de paiement</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3 text-right">Montant versé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                      <td className="px-4 py-3">{payment.method || "—"}</td>
                      <td className="px-4 py-3">{payment.reference || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{formatAmount(Number(payment.amount))}</td>
                    </tr>
                  ))}
                  {!selectedPayments.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun versement global enregistré pour cette année.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="hidden print:block border-t border-slate-300 pt-4 text-xs text-slate-500">
            Fiche générée le {new Date().toLocaleDateString("fr-FR")} · Document de suivi financier de l'établissement.
          </div>

          <OrganizationPaymentModal
            open={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            establishmentId={establishmentId || ""}
            organizationId={selectedOrganization.id}
            organizationName={selectedOrganization.name}
            academicYearId={selectedYear?.id || ""}
            remainingAmount={selectedSummary.remaining}
            onSuccess={() => { void load() }}
          />
        </section>
      ) : (
        <div className="border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Cette organisation n'est plus disponible.
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden; }
          main, main * { visibility: visible; }
          main { position: absolute; inset: 0; width: 100%; padding: 0 !important; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          section { break-inside: avoid; }
        }
      `}</style>
    </main>
  )
}
