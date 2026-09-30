"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Search, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserContext } from "@/hooks/useUserContext"
import { payrollService } from "@/lib/supabase/services/payroll.service"
import { getAcademicYears, getActiveAcademicYear } from "@/lib/supabase/services/academic-year.service"

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
const money = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"
const dateOnly = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number)
  return `${MOIS_FR[month - 1]} ${year}`
}
const periodDates = (key: string) => {
  const [year, month] = key.split("-").map(Number)
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: dateOnly(new Date(year, month, 0)),
  }
}

export function FinanceAvances() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const [staff, setStaff] = useState<any[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [payableMonths, setPayableMonths] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    staffKey: "",
    targetMonth: "",
    amount: "",
    advanceDate: dateOnly(new Date()),
    paymentMethod: "cash",
    reference: "",
    notes: "",
  })

  const selectedYear = academicYears.find((y) => y.id === selectedYearId)

  const availableMonths = useMemo(() => {
    if (!selectedYear?.start_date || !selectedYear?.end_date) return []
    const configured = payableMonths.length ? payableMonths : Array.from({ length: 12 }, (_, i) => i + 1)
    const result: string[] = []
    const cursor = new Date(selectedYear.start_date + "T12:00:00")
    const end = new Date(selectedYear.end_date + "T12:00:00")
    while (cursor <= end) {
      if (configured.includes(cursor.getMonth() + 1)) result.push(monthKey(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return result
  }, [selectedYear, payableMonths])

  const staffMap = useMemo(() => new Map(staff.map((s) => [`${s.staff_type}:${s.staff_id}`, s])), [staff])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return advances
      .map((a) => {
        const person = staffMap.get(`${a.staff_type}:${a.staff_id}`)
        const period = periods.find((p) => p.id === a.target_period_id)
        const generated = Boolean(period || a.target_period_id)
        return { ...a, person, period, generated, status: generated ? "deduite" : "attente" }
      })
      .filter((a) => {
        const name = `${a.person?.first_name || ""} ${a.person?.last_name || ""}`.toLowerCase()
        const matchesSearch = !q || name.includes(q) || String(a.reference || "").toLowerCase().includes(q)
        const matchesStatus = !statusFilter || a.status === statusFilter
        return matchesSearch && matchesStatus
      })
  }, [advances, staffMap, periods, search, statusFilter])

  const load = async () => {
    if (!establishmentId) return
    try {
      setLoading(true)
      const [people, advanceRows, periodRows, years, active] = await Promise.all([
        payrollService.getStaff(establishmentId),
        payrollService.getAdvances(establishmentId),
        payrollService.getPeriods(establishmentId),
        getAcademicYears(establishmentId),
        getActiveAcademicYear(establishmentId),
      ])
      setStaff(people)
      setAdvances(advanceRows)
      setPeriods(periodRows)
      setAcademicYears(years)
      const year = active ?? years[0]
      if (year) {
        setSelectedYearId(year.id)
        const config = await payrollService.getAcademicYearPayrollSettings(establishmentId, year.id)
        setPayableMonths(Array.isArray(config?.payable_months) ? config.payable_months.map(Number) : [])
      }
    } catch (e: any) {
      toast.error(e.message || "Impossible de charger les avances.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [establishmentId])

  const changeYear = async (yearId: string) => {
    if (!establishmentId) return
    setSelectedYearId(yearId)
    const config = await payrollService.getAcademicYearPayrollSettings(establishmentId, yearId)
    setPayableMonths(Array.isArray(config?.payable_months) ? config.payable_months.map(Number) : [])
    setForm((f) => ({ ...f, targetMonth: "" }))
  }

  const openForm = () => {
    setForm({
      staffKey: "",
      targetMonth: availableMonths[0] || "",
      amount: "",
      advanceDate: dateOnly(new Date()),
      paymentMethod: "cash",
      reference: "",
      notes: "",
    })
    setShowForm(true)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!establishmentId) return
    const person = staff.find((s) => `${s.staff_type}:${s.staff_id}` === form.staffKey)
    const amount = Number(form.amount)
    if (!person || !form.targetMonth || !form.advanceDate || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Sélectionnez le personnel, le mois concerné et un montant valide.")
      return
    }

    try {
      setSaving(true)
      const { start, end } = periodDates(form.targetMonth)
      const period = periods.find((p) => p.starts_on === start && p.ends_on === end)
      await payrollService.createAdvance({
        establishmentId,
        staffType: person.staff_type,
        staffId: person.staff_id,
        targetPeriodId: period?.id || null,
        targetPeriodStart: start,
        amount,
        advanceDate: form.advanceDate,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
      })
      toast.success(`Avance enregistrée pour ${monthLabel(form.targetMonth)}.`)
      setShowForm(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || "Impossible d'enregistrer l'avance.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">Avances sur salaire</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">Enregistrez une avance avant ou après la génération de l'état de salaire.</p>
        </div>
        <Button onClick={openForm} disabled={!availableMonths.length || !staff.length} className="w-full bg-gray-900 text-white hover:bg-gray-800 sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />Nouvelle avance
        </Button>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un membre du personnel..." className="pl-9" />
          </div>
          <select value={selectedYearId} onChange={(e) => void changeYear(e.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm">
            {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Tous les statuts</option>
            <option value="attente">En attente de l'état</option>
            <option value="deduite">Déduite sur l'état</option>
          </select>
        </div>
      </div>

      <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Une avance peut être enregistrée avant la fin du mois. Le mois choisi est conservé même si l'état de salaire n'existe pas encore. Lors de sa génération, l'avance est automatiquement rattachée à cette période et déduite du salaire.
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>{["Date","Personnel","Période concernée","Montant","Mode","Statut","Référence"].map((h) => <th key={h} className="px-4 py-3 font-medium text-gray-700">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Chargement des avances...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Aucune avance enregistrée.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(row.advance_date + "T00:00:00").toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 font-medium">{row.person ? `${row.person.first_name} ${row.person.last_name}` : "Personnel introuvable"}</td>
                <td className="px-4 py-3">{row.target_period_start ? monthLabel(String(row.target_period_start).slice(0, 7)) : "—"}</td>
                <td className="px-4 py-3 font-semibold">{money(row.amount)}</td>
                <td className="px-4 py-3">{row.payment_method === "cash" ? "Espèces" : row.payment_method === "transfer" ? "Virement" : row.payment_method === "check" ? "Chèque" : "Mobile Money"}</td>
                <td className="px-4 py-3">{row.status === "deduite" ? <span className="text-green-700">Déduite</span> : <span className="text-amber-700">En attente</span>}</td>
                <td className="px-4 py-3">{row.reference || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !saving && setShowForm(false)}>
          <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg rounded bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="text-lg font-semibold">Nouvelle avance sur salaire</h2><p className="mt-1 text-sm text-gray-500">L'avance sera récupérée sur le mois sélectionné.</p></div>
              <button type="button" onClick={() => setShowForm(false)} disabled={saving}><X className="h-5 w-5" /></button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Personnel</label>
                <select required value={form.staffKey} onChange={(e) => setForm({ ...form, staffKey: e.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">Sélectionner un personnel</option>
                  {staff.map((person) => <option key={`${person.staff_type}:${person.staff_id}`} value={`${person.staff_type}:${person.staff_id}`}>{person.first_name} {person.last_name} — {person.position || "Personnel"}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Mois de récupération</label>
                <select required value={form.targetMonth} onChange={(e) => setForm({ ...form, targetMonth: e.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="">Sélectionner un mois</option>
                  {availableMonths.map((key) => {
                    const period = periods.find((p) => String(p.starts_on).slice(0, 7) === key)
                    return <option key={key} value={key}>{monthLabel(key)}{period ? " — état déjà généré" : " — état à venir"}</option>
                  })}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Montant</label><Input required min="1" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Ex. 50000" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Date de l'avance</label><Input required type="date" value={form.advanceDate} onChange={(e) => setForm({ ...form, advanceDate: e.target.value })} /></div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Mode de paiement</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="cash">Espèces</option><option value="transfer">Virement</option><option value="check">Chèque</option><option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Référence (facultatif)</label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ex. AVS-2026-001" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Note (facultatif)</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex. Avance demandée par l'enseignant" /></div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Annuler</Button>
              <Button type="submit" disabled={saving} className="bg-gray-900 text-white">{saving ? "Enregistrement..." : "Enregistrer l'avance"}</Button>
            </div>
          </form>
        </div>
      )}

      {!availableMonths.length && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucun mois de paie n'est configuré pour l'année académique sélectionnée. Configurez-les dans Paramètres → Paie du personnel.
        </div>
      )}

      <div className="text-sm">
        <Link href="/ecole/finance/paie" className="text-gray-700 underline underline-offset-2">Retour à la paie</Link>
      </div>
    </div>
  )
}
