"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CreditCard, Receipt, Wallet, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"

const METHODS: Record<string, string> = { especes: "Espèces", cheque: "Chèque", virement: "Virement", mobile: "Mobile Money", mobile_money: "Mobile Money" }
const money = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA"

export default function ParentsPaiementsPage() {
  const params = useSearchParams()
  const { loading, error, refresh, children, payments } = useParentPortal()
  const [id, setId] = useState(params.get("eleve") || "tous")
  const allowed = useMemo(() => children.filter((child) => child.can_view_finance), [children])
  const ids = useMemo(() => id === "tous" ? allowed.map((child) => child.id) : [id], [id, allowed])
  const list = useMemo(() => payments.filter((payment) => {
    const child = children.find((item) => item.enrollment_id === payment.enrollment_id)
    return child ? ids.includes(child.id) : false
  }), [payments, children, ids])
  const paid = list.reduce((sum, payment) => sum + payment.amount, 0)

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-pierre"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Chargement des paiements...</div>

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-terre">Scolarité</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-terre"><CreditCard className="h-6 w-6" />Paiements</h1><p className="mt-1 text-sm text-pierre">Historique des paiements accessibles à votre compte.</p></div>
        <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </header>
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex flex-col gap-3 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" onClick={() => void refresh()} className="bg-white">Réessayer</Button></CardContent></Card>}
      {allowed.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-pierre">Aucun enfant associé avec un accès financier.</CardContent></Card> : <>
        <Select value={id} onValueChange={setId}><SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Filtrer par enfant" /></SelectTrigger><SelectContent><SelectItem value="tous">Tous les enfants</SelectItem>{allowed.map((child) => <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>)}</SelectContent></Select>
        <div className="grid gap-4 sm:grid-cols-2"><Card className="border-terre/10 bg-papier"><CardContent className="flex items-center gap-3 p-5"><Wallet className="h-5 w-5 text-terre" /><div><p className="text-xs uppercase tracking-wide text-pierre">Total enregistré</p><p className="text-xl font-bold text-terre">{money(paid)}</p></div></CardContent></Card><Card className="border-terre/10 bg-papier"><CardContent className="flex items-center gap-3 p-5"><Receipt className="h-5 w-5 text-emerald-700" /><div><p className="text-xs uppercase tracking-wide text-pierre">Opérations</p><p className="text-xl font-bold text-terre">{list.length}</p></div></CardContent></Card></div>
        <Card className="border-terre/10 bg-papier"><CardHeader><CardTitle className="text-base text-terre">Historique</CardTitle><CardDescription>{list.length} paiement{list.length > 1 ? "s" : ""}</CardDescription></CardHeader><CardContent className="space-y-3">{list.length === 0 ? <p className="py-8 text-center text-sm text-pierre">Aucun paiement enregistré pour cette sélection.</p> : list.map((payment) => { const child = children.find((item) => item.enrollment_id === payment.enrollment_id); return <div key={payment.id} className="flex flex-col gap-3 rounded-xl border border-terre/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-terre">{child ? `${child.first_name} ${child.last_name}` : "Paiement"}</p><p className="text-sm text-pierre">{new Date(payment.payment_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{payment.method ? ` · ${METHODS[payment.method] ?? payment.method}` : ""}</p>{payment.reference && <Badge variant="outline" className="mt-1">Réf. {payment.reference}</Badge>}</div><p className="text-lg font-bold text-emerald-700">+ {money(payment.amount)}</p></div> })}</CardContent></Card>
      </>}
    </div>
  )
}
