"use client"

import { useEffect, useMemo, useState } from "react"
import { financeService } from "@/lib/supabase/services/finance.service"
import { useUserContext } from "@/hooks/useUserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, X } from "lucide-react"

type Expense = {
  id: string; category: string; description: string; amount: number
  expense_date: string; payment_method: string; reference: string | null; created_at: string
}
const money = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(n || 0)) + " FCFA"
const dateLabel = (v: string) => new Date(v + (v.length === 10 ? "T00:00:00" : "")).toLocaleDateString("fr-FR")

export function FinanceDepenses() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(""), [category, setCategory] = useState("")
  const [dateFrom, setDateFrom] = useState(""), [dateTo, setDateTo] = useState("")
  const [showForm, setShowForm] = useState(false), [selected, setSelected] = useState<Expense | null>(null)
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "Espèces" })

  const load = async () => {
    if (!establishmentId) return
    try { setLoading(true); setError(null); setExpenses(await financeService.getExpenses(establishmentId, dateFrom || undefined, dateTo || undefined) as Expense[]) }
    catch (e: any) { setError(e.message || "Impossible de charger les dépenses.") }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [establishmentId, dateFrom, dateTo])

  const categories = useMemo(() => Array.from(new Set(expenses.map(e => e.category).filter(Boolean))).sort(), [expenses])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter(e => (!category || e.category === category) &&
      (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.reference || "").toLowerCase().includes(q)))
  }, [expenses, search, category])
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0)

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!establishmentId) return
    const amount = Number(form.amount)
    if (!form.category.trim() || !form.description.trim() || !form.expenseDate || !form.paymentMethod) return setError("Veuillez renseigner tous les champs obligatoires.")
    if (!Number.isFinite(amount) || amount <= 0) return setError("Le montant doit être supérieur à 0.")
    try {
      setSaving(true); setError(null)
      await financeService.createExpense({ establishmentId, category: form.category, description: form.description, amount, expenseDate: form.expenseDate, paymentMethod: form.paymentMethod })
      setForm({ category: "", description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "Espèces" })
      setShowForm(false); await load()
    } catch (e: any) { setError(e.message || "Impossible d'enregistrer la dépense.") }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-xl font-semibold uppercase text-gray-900">Dépenses</h1><p className="mt-1 text-sm text-gray-500">Enregistrez et consultez les dépenses de l'établissement.</p></div>
      <Button onClick={() => setShowForm(true)} className="w-full rounded bg-gray-900 text-white hover:bg-gray-800 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nouvelle dépense</Button>
    </div>
    {error && <div className="flex justify-between gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
    <div className="grid gap-3 rounded border border-gray-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une dépense..." className="bg-white pl-9" /></div>
      <select value={category} onChange={e => setCategory(e.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Toutes les catégories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white" /><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white" />
    </div>
    <div className="flex justify-between text-sm text-gray-600"><span>{filtered.length} dépense{filtered.length > 1 ? "s" : ""}</span><strong className="text-gray-900">Total affiché : {money(total)}</strong></div>
    <div className="overflow-x-auto rounded border border-gray-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-gray-50"><tr>
      {["Date","Référence","Libellé","Catégorie","Mode","Montant"].map((h,i) => <th key={h} className={"px-4 py-3 font-medium text-gray-700" + (i === 5 ? " text-right" : "")}>{h}</th>)}
    </tr></thead><tbody className="divide-y divide-gray-100">
      {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Chargement des dépenses...</td></tr> :
       filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucune dépense trouvée.</td></tr> :
       filtered.map(e => <tr key={e.id} onClick={() => setSelected(e)} className="cursor-pointer hover:bg-gray-50">
        <td className="px-4 py-3">{dateLabel(e.expense_date)}</td><td className="px-4 py-3 font-medium">{e.reference || ("DEP-" + e.id.replace(/-/g, "").slice(-6).toUpperCase())}</td>
        <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td><td className="px-4 py-3 text-gray-600">{e.category}</td><td className="px-4 py-3 text-gray-600">{e.payment_method}</td>
        <td className="px-4 py-3 text-right font-semibold text-red-700">-{money(Number(e.amount))}</td>
       </tr>)}
    </tbody></table></div>

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !saving && setShowForm(false)}>
      <form onSubmit={submit} onMouseDown={e => e.stopPropagation()} className="w-full max-w-lg rounded bg-white p-5 shadow-xl">
        <div className="mb-5 flex justify-between"><div><h2 className="text-lg font-semibold">Nouvelle dépense</h2><p className="text-sm text-gray-500">Elle sera enregistrée comme sortie de caisse.</p></div><button type="button" onClick={() => setShowForm(false)}><X /></button></div>
        <div className="grid gap-4">
          <Input required placeholder="Catégorie (ex. Fournitures)" value={form.category} onChange={e => setForm({...form, category:e.target.value})} />
          <Input required placeholder="Libellé (ex. Achat de papier)" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          <div className="grid gap-4 sm:grid-cols-2"><Input required min="1" type="number" placeholder="Montant" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} /><Input required type="date" value={form.expenseDate} onChange={e => setForm({...form, expenseDate:e.target.value})} /></div>
          <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod:e.target.value})} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm"><option>Espèces</option><option>Virement</option><option>Chèque</option><option>Mobile Money</option></select>
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button><Button type="submit" disabled={saving} className="bg-gray-900 text-white">{saving ? "Enregistrement..." : "Enregistrer"}</Button></div>
      </form>
    </div>}

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setSelected(null)}>
      <div onMouseDown={e => e.stopPropagation()} className="w-full max-w-lg rounded bg-white p-5 shadow-xl">
        <div className="mb-5 flex justify-between"><div><h2 className="text-lg font-semibold">Détail de la dépense</h2><p className="text-sm text-gray-500">{selected.reference || "Référence non renseignée"}</p></div><button onClick={() => setSelected(null)}><X /></button></div>
        <dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-gray-500">Date</dt><dd className="font-medium">{dateLabel(selected.expense_date)}</dd></div><div><dt className="text-gray-500">Montant</dt><dd className="font-semibold text-red-700">-{money(Number(selected.amount))}</dd></div>
        <div><dt className="text-gray-500">Catégorie</dt><dd className="font-medium">{selected.category}</dd></div><div><dt className="text-gray-500">Mode</dt><dd className="font-medium">{selected.payment_method}</dd></div>
        <div className="col-span-2"><dt className="text-gray-500">Libellé</dt><dd className="font-medium">{selected.description}</dd></div>
        <div><dt className="text-gray-500">Statut</dt><dd className="font-medium text-green-700">Payée</dd></div><div><dt className="text-gray-500">Caisse</dt><dd className="font-medium">571 — Caisse générale</dd></div></dl>
      </div>
    </div>}
  </div>
}
