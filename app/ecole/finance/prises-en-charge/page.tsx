"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Building2, Users, Wallet, Search } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaymentModal } from "@/components/finance/PaymentModal"

type PayerTab = "family" | "organizations" | "all"
type CoverageRow = {
  enrollment_id: string; establishment_id: string; student_id: string; class_id: string; academic_year_id: string
  schedule_id: string; installment_number: number; label: string; due_date: string; amount_due: number; amount_paid: number
  remaining_amount: number; status: string; payment_state: string; days_overdue: number; category: string
  payer_type: string; organization_id?: string | null; organization_name?: string | null
  first_name?: string; last_name?: string; student_number?: string | null; class_name?: string | null
}
const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"

export default function SuiviPrisesEnChargePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear } = useAcademicYears(establishmentId)
  const [tab, setTab] = useState<PayerTab>("family")
  const [search, setSearch] = useState("")
  const [familyRows, setFamilyRows] = useState<CoverageRow[]>([])
  const [organizationRows, setOrganizationRows] = useState<CoverageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentRows, setPaymentRows] = useState<any[] | null>(null)

  const load = useCallback(async () => {
    if (!establishmentId || !activeYear?.id) return
    setLoading(true)
    try {
      const results = await Promise.all([
        supabaseBrowser.from("v_finance_student_payment_board").select("*").eq("establishment_id", establishmentId).eq("academic_year_id", activeYear.id),
        supabaseBrowser.from("v_finance_organization_coverage_board").select("*").eq("establishment_id", establishmentId).eq("academic_year_id", activeYear.id),
      ])
      if (results[0].error) throw results[0].error
      if (results[1].error) throw results[1].error
      const family = (results[0].data ?? []).map((row: any) => ({ ...row, payer_type: "family" }))
      setFamilyRows(family as CoverageRow[])
      setOrganizationRows((results[1].data ?? []) as CoverageRow[])
    } catch (error) {
      console.error("Chargement du suivi des prises en charge impossible", error)
    } finally { setLoading(false) }
  }, [establishmentId, activeYear?.id])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => {
    const selected = tab === "family" ? familyRows : tab === "organizations" ? organizationRows : familyRows.concat(organizationRows)
    const q = search.trim().toLocaleLowerCase("fr")
    return selected.filter((row) => !q || (row.first_name + " " + row.last_name + " " + (row.student_number || "") + " " + (row.organization_name || "") + " " + (row.class_name || "")).toLocaleLowerCase("fr").includes(q))
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "") || a.installment_number - b.installment_number)
  }, [tab, familyRows, organizationRows, search])

  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.due += Number(row.amount_due || 0); acc.paid += Number(row.amount_paid || 0); acc.remaining += Number(row.remaining_amount || 0)
    return acc
  }, { due: 0, paid: 0, remaining: 0 }), [rows])

  const openPayment = (row: CoverageRow) => {
    const source = row.payer_type === "family" ? familyRows : organizationRows
    const selected = source.filter((item) => item.enrollment_id === row.enrollment_id && item.payer_type === row.payer_type && (item.organization_id ?? null) === (row.organization_id ?? null))
    setPaymentRows(selected.map((item) => ({ ...item, student: { first_name: item.first_name, last_name: item.last_name, student_number: item.student_number }, class: { name: item.class_name } })))
  }

  const tabs: Array<{ id: PayerTab; label: string; icon: typeof Users }> = [
    { id: "family", label: "Part des familles", icon: Users },
    { id: "organizations", label: "Part des organismes", icon: Building2 },
    { id: "all", label: "Vue globale", icon: Wallet },
  ]

  return <main className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border bg-white"><Wallet className="h-5 w-5" /></div><div><h1 className="text-xl font-semibold text-slate-900">Suivi des prises en charge</h1><p className="mt-1 text-sm text-slate-500">Suivez séparément les montants dus par les familles et ceux attendus des organismes.</p></div></div>
      <Button variant="outline" asChild><Link href="/ecole/settings/prises-en-charge">Configurer les règles</Link></Button>
    </header>
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={"inline-flex items-center gap-2 border px-3 py-2 text-sm " + (tab === item.id ? "border-[#00236f] bg-[#00236f] text-white" : "border-slate-200 bg-white text-slate-700")}><Icon className="h-4 w-4" />{item.label}</button> })}</nav>
    <div className="grid gap-4 md:grid-cols-3"><div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Montant prévu</p><p className="mt-1 text-lg font-semibold">{fmt(totals.due)}</p></div><div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Montant payé</p><p className="mt-1 text-lg font-semibold text-emerald-700">{fmt(totals.paid)}</p></div><div className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Solde restant</p><p className="mt-1 text-lg font-semibold text-amber-700">{fmt(totals.remaining)}</p></div></div>
    <div className="flex items-center gap-2"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève, une classe ou un organisme" /></div><Button variant="outline" onClick={() => void load()} disabled={loading}>Actualiser</Button></div>
    <section className="overflow-hidden border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">{tab === "family" ? "Échéances à la charge des familles" : tab === "organizations" ? "Échéances prises en charge par les organismes" : "Toutes les parts de paiement"}</h2><p className="mt-1 text-xs text-slate-500">{activeYear?.name ?? "Année scolaire active"} · {rows.length} échéance(s)</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Élève</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Payeur</th><th className="px-4 py-3">Échéance</th><th className="px-4 py-3">Prévu</th><th className="px-4 py-3">Payé</th><th className="px-4 py-3">Reste</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{rows.map((row) => { const date = row.due_date ? new Date(row.due_date + "T00:00:00").toLocaleDateString("fr-FR") : "—"; return <tr key={row.schedule_id}><td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}<span className="block text-xs font-normal text-slate-500">{row.student_number || "Sans matricule"}</span></td><td className="px-4 py-3">{row.class_name || "—"}</td><td className="px-4 py-3">{row.payer_type === "family" ? "Famille" : row.organization_name || "Organisme"}</td><td className="px-4 py-3">{row.label}<span className="block text-xs text-slate-500">{date}</span></td><td className="px-4 py-3">{fmt(Number(row.amount_due))}</td><td className="px-4 py-3">{fmt(Number(row.amount_paid))}</td><td className="px-4 py-3 font-semibold">{fmt(Number(row.remaining_amount))}</td><td className="px-4 py-3">{Number(row.remaining_amount) <= 0 ? "Soldé" : Number(row.amount_paid) > 0 ? "Partiel" : row.payment_state === "late" ? "En retard" : "À payer"}</td><td className="px-4 py-3">{Number(row.remaining_amount) > 0 ? <Button size="sm" onClick={() => openPayment(row)}>Enregistrer un paiement</Button> : "—"}</td></tr> })}{!rows.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">{loading ? "Chargement…" : "Aucune échéance à afficher."}</td></tr>}</tbody></table></div>
    </section>
    {paymentRows && <PaymentModal open={true} onClose={() => setPaymentRows(null)} studentSchedules={paymentRows} onSuccess={() => { setPaymentRows(null); void load() }} />}
  </main>
}
