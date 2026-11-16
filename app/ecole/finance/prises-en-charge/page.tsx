"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Building2, Printer, Search, Wallet } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { supabaseBrowser } from "@/lib/supabase/client"
import { hasEffectiveSchoolPermission } from "@/lib/organization/runtime-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OrganizationPaymentModal } from "@/components/finance/OrganizationPaymentModal"
import { useSchoolRealtime } from "@/hooks/use-school-realtime"

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

const paymentMethodName = (method: string | null) => {
  const labels: Record<string, string> = {
    cash: "Espèces",
    bank_transfer: "Virement bancaire",
    transfer: "Virement bancaire",
    mobile_money: "Mobile Money",
    cheque: "Chèque",
    check: "Chèque",
  }
  return method ? labels[method.toLowerCase()] || method : "—"
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR")
}

export default function SuiviPrisesEnChargePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const realtimeRevision = useSchoolRealtime(["organization_payments", "payment_schedules", "enrollments", "sponsoring_organizations"])
  const { data: academicYears, selectedYear, selectYear } = useAcademicYears(establishmentId)

  const [search, setSearch] = useState("")
  const [organizationId, setOrganizationId] = useState("all")
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [organizations, setOrganizations] = useState<SponsoringOrganization[]>([])
  const [payments, setPayments] = useState<OrganizationPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [canManagePayments, setCanManagePayments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [studentsPage, setStudentsPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"students" | "history" | "payments">("students")
  const studentsPerPage = 20
  const paymentsPerPage = 10

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
      const [authContextResult, organizationResult, coverageResult, paymentResult] = await Promise.all([
        supabaseBrowser.rpc("get_my_auth_context"),
        supabaseBrowser
          .from("sponsoring_organizations")
          .select("id,name,is_state,active")
          .eq("establishment_id", establishmentId)
          .eq("is_state", false)
          .order("name"),
        supabaseBrowser
          .from("v_finance_organization_coverage_board")
          .select("*")
          .eq("establishment_id", establishmentId),
        supabaseBrowser
          .from("organization_payments")
          .select("id,organization_id,academic_year_id,amount,payment_date,method,reference,notes")
          .eq("establishment_id", establishmentId)
          .order("payment_date", { ascending: false }),
      ])

      if (authContextResult.error) throw authContextResult.error
      const membership = (authContextResult.data?.establishments ?? []).find(
        (item: any) => item.id === establishmentId
      )
      if (!membership) throw new Error("Vous n'êtes pas membre de cet établissement.")
      const permissionUser = {
        role: membership.role,
        etablissementRole: membership.role,
        permissions: membership.permissions ?? [],
        revoked_permissions: membership.revoked_permissions ?? [],
        account_type: authContextResult.data?.account_type,
      }
      setCanManagePayments(hasEffectiveSchoolPermission(permissionUser as any, "payments.manage"))

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
      setCanManagePayments(false)
    } finally {
      setLoading(false)
    }
  }, [establishmentId, selectedYear?.id])

  useEffect(() => { void load() }, [load, realtimeRevision])

  const organizationSummaries = useMemo<OrganizationSummary[]>(() => {
    return organizations.map((organization) => {
      const organizationRows = rows.filter((row) =>
        row.academic_year_id === selectedYear?.id && row.payer_type === "other" && row.organization_id === organization.id
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
  }, [organizations, rows, selectedYear?.id])

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
      row.academic_year_id === selectedYear?.id &&
      row.payer_type === "other" &&
      row.organization_id === organizationId
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
  }, [rows, organizationId, search, selectedYear?.id])

  const selectedPayments = useMemo(() => payments.filter(
    (payment) => payment.organization_id === organizationId
  ), [payments, organizationId])

  const studentsPageCount = Math.max(1, Math.ceil(coveredStudents.length / studentsPerPage))
  const paginatedStudents = useMemo(
    () => coveredStudents.slice((studentsPage - 1) * studentsPerPage, studentsPage * studentsPerPage),
    [coveredStudents, studentsPage]
  )
  const paymentsPageCount = Math.max(1, Math.ceil(selectedPayments.length / paymentsPerPage))
  const paginatedPayments = useMemo(
    () => selectedPayments.slice((paymentsPage - 1) * paymentsPerPage, paymentsPage * paymentsPerPage),
    [selectedPayments, paymentsPage]
  )

  const organizationYearHistory = useMemo(() => {
    if (!organizationId || organizationId === "all") return []
    return academicYears.map((year) => {
      const yearRows = rows.filter((row) =>
        row.organization_id === organizationId && row.academic_year_id === year.id && row.payer_type === "other"
      )
      const yearPayments = selectedPayments.filter((payment) => payment.academic_year_id === year.id)
      const due = yearRows.reduce((sum, row) => sum + Number(row.amount_due || 0), 0)
      const paid = yearRows.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0)
      return { year, due, paid, remaining: Math.max(due - paid, 0), paymentCount: yearPayments.length }
    }).filter((item) => item.due > 0 || item.paid > 0)
      .sort((a, b) => String(b.year.start_date).localeCompare(String(a.year.start_date)))
  }, [academicYears, rows, selectedPayments, organizationId])

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
            <Button variant="outline" onClick={() => { setOrganizationId("all"); setSearch(""); setStudentsPage(1); setPaymentsPage(1) }} className="gap-2">
              <ArrowLeft className="h-4 w-4" />Retour
            </Button>
          )}
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
                        <Button size="sm" variant="outline" onClick={() => { setOrganizationId(item.organization.id); setSearch(""); setStudentsPage(1); setPaymentsPage(1) }}>
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
              {canManagePayments && <Button onClick={() => setPaymentModalOpen(true)} disabled={selectedSummary.remaining <= 0} className="gap-2">
                <Wallet className="h-4 w-4" />Enregistrer un versement
              </Button>}
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center justify-between gap-3 py-3 sm:px-4">
              <span className="text-sm text-slate-600">Montant annuel dû</span>
              <span className="text-sm font-medium tabular-nums text-slate-900">{formatAmount(selectedSummary.due)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 sm:px-4">
              <span className="text-sm text-slate-600">Total versé</span>
              <span className="text-sm font-medium tabular-nums text-slate-900">{formatAmount(selectedSummary.paid)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 sm:px-4">
              <span className="text-sm text-slate-600">Reste à payer</span>
              <span className="text-sm font-medium tabular-nums text-slate-900">{formatAmount(selectedSummary.remaining)}</span>
            </div>
          </div>

          <nav aria-label="Sections de la fiche organisation" className="flex gap-6 overflow-x-auto border-b border-slate-200">
            <button
              id="organization-tab-students"
              type="button"
              role="tab"
              aria-selected={activeTab === "students"}
              aria-controls="organization-tabpanel-students"
              onClick={() => setActiveTab("students")}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${activeTab === "students" ? "border-blue-700 font-medium text-blue-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
            >
              Élèves couverts <span className="ml-1 text-xs text-slate-500">({coveredStudents.length})</span>
            </button>
            <button
              id="organization-tab-history"
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              aria-controls="organization-tabpanel-history"
              onClick={() => setActiveTab("history")}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${activeTab === "history" ? "border-blue-700 font-medium text-blue-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
            >
              Historique annuel <span className="ml-1 text-xs text-slate-500">({organizationYearHistory.length})</span>
            </button>
            <button
              id="organization-tab-payments"
              type="button"
              role="tab"
              aria-selected={activeTab === "payments"}
              aria-controls="organization-tabpanel-payments"
              onClick={() => setActiveTab("payments")}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${activeTab === "payments" ? "border-blue-700 font-medium text-blue-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
            >
              Versements globaux <span className="ml-1 text-xs text-slate-500">({selectedPayments.length})</span>
            </button>
          </nav>
          <div className="min-w-0">
            {activeTab === "students" && (
            <section id="organization-tabpanel-students" role="tabpanel" aria-labelledby="organization-tab-students" className="overflow-hidden border border-slate-200 bg-white">
              <div className="border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
                <span>Affichage de {coveredStudents.length ? (studentsPage - 1) * studentsPerPage + 1 : 0} à {Math.min(studentsPage * studentsPerPage, coveredStudents.length)} sur {coveredStudents.length} élèves</span>
                <span>20 élèves par page</span>
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
                    {paginatedStudents.map((student) => (
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
              {studentsPageCount > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <Button size="sm" variant="outline" disabled={studentsPage === 1} onClick={() => setStudentsPage((page) => Math.max(1, page - 1))}>Précédent</Button>
                  <span className="text-xs text-slate-500">Page {studentsPage} sur {studentsPageCount}</span>
                  <Button size="sm" variant="outline" disabled={studentsPage === studentsPageCount} onClick={() => setStudentsPage((page) => Math.min(studentsPageCount, page + 1))}>Suivant</Button>
                </div>
              )}
            </div>
            </section>
          )}
          {activeTab === "history" && (
            <section id="organization-tabpanel-history" role="tabpanel" aria-labelledby="organization-tab-history" className="overflow-hidden border border-slate-200 bg-white">
              <div className="border-t border-slate-200">
              <p className="px-4 py-2 text-xs text-slate-500">Chaque année conserve son propre montant dû, ses versements et son solde. Les exercices précédents restent consultables.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Année académique</th>
                      <th className="px-4 py-3 text-right">Montant dû</th>
                      <th className="px-4 py-3 text-right">Total versé</th>
                      <th className="px-4 py-3 text-right">Solde restant</th>
                      <th className="px-4 py-3 text-right">Versements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {organizationYearHistory.map((item) => (
                      <tr key={item.year.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.year.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatAmount(item.due)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatAmount(item.paid)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatAmount(item.remaining)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{item.paymentCount}</td>
                      </tr>
                    ))}
                    {!organizationYearHistory.length && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun historique annuel disponible pour cet organisme.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </section>
          )}
          {activeTab === "payments" && (
            <section id="organization-tabpanel-payments" role="tabpanel" aria-labelledby="organization-tab-payments" className="overflow-hidden border border-slate-200 bg-white">
              <div className="border-t border-slate-200">
              <p className="px-4 py-2 text-xs text-slate-500">Chaque ligne correspond à un versement effectué par l'organisation.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Année</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Moyen de paiement</th>
                      <th className="px-4 py-3">Référence</th>
                      <th className="px-4 py-3 text-right">Montant versé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3">{academicYears.find((year) => year.id === payment.academic_year_id)?.name || "Année inconnue"}</td>
                        <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                        <td className="px-4 py-3">{paymentMethodName(payment.method)}</td>
                        <td className="px-4 py-3">{payment.reference || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{formatAmount(Number(payment.amount))}</td>
                      </tr>
                    ))}
                    {!selectedPayments.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun versement global enregistré pour cet organisme.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {paymentsPageCount > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <Button size="sm" variant="outline" disabled={paymentsPage === 1} onClick={() => setPaymentsPage((page) => Math.max(1, page - 1))}>Précédent</Button>
                  <span className="text-xs text-slate-500">Page {paymentsPage} sur {paymentsPageCount}</span>
                  <Button size="sm" variant="outline" disabled={paymentsPage === paymentsPageCount} onClick={() => setPaymentsPage((page) => Math.min(paymentsPageCount, page + 1))}>Suivant</Button>
                </div>
              )}
            </div>
            </section>
          )}
          </div>

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
