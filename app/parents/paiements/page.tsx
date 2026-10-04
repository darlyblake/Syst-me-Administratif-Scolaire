"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const money=(n:number)=>new Intl.NumberFormat("fr-FR").format(n)+" FCFA"
const methods:Record<string,string>={especes:"Espèces",cheque:"Chèque",virement:"Virement",mobile:"Mobile Money",mobile_money:"Mobile Money"}

export default function ParentPaiements() {
  const params=useSearchParams()
  const {loading,error,refresh,children,payments}=useParentPortal()
  const allowed=useMemo(()=>children.filter(c=>c.can_view_finance),[children])
  const [childId,setChildId]=useState(params.get("eleve")||"tous")
  const list=useMemo(()=>payments.filter(p=>{const c=children.find(x=>x.enrollment_id===p.enrollment_id);return c && (childId==="tous" ? allowed.some(x=>x.id===c.id) : c.id===childId)}),[payments,children,childId,allowed])
  const total=list.reduce((s,p)=>s+p.amount,0)

  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Scolarité" title="Paiements" description="Consultez les paiements enregistrés pour les enfants auxquels vous avez un accès financier." onRefresh={()=>void refresh()} refreshing={loading} />
    {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading && allowed.length===0 ? <ParentEmptyState title="Situation financière non disponible" description="Votre compte n’a pas actuellement l’autorisation de consulter les paiements." /> :
      <>
        <div className="flex flex-col gap-3 border-b border-terre/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><ParentChildSelect children={allowed} value={childId} onChange={setChildId} financeOnly /><div className="text-sm text-pierre">Total enregistré <strong className="ml-1 text-terre">{money(total)}</strong></div></div>
        <div className="overflow-x-auto border border-terre/10 bg-papier"><table className="w-full min-w-[680px] text-sm"><thead className="border-b border-terre/10 bg-creme text-left text-xs uppercase tracking-wide text-pierre"><tr><th className="px-4 py-3">Élève</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Référence</th><th className="px-4 py-3 text-right">Montant</th></tr></thead><tbody className="divide-y divide-terre/10">{list.map(p=>{const c=children.find(x=>x.enrollment_id===p.enrollment_id);return <tr key={p.id} className="hover:bg-creme"><td className="px-4 py-3 font-medium text-terre">{c?c.first_name+" "+c.last_name:"—"}</td><td className="px-4 py-3 text-pierre">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</td><td className="px-4 py-3">{p.method?methods[p.method]??p.method:"—"}</td><td className="px-4 py-3 text-pierre">{p.reference??"—"}</td><td className="px-4 py-3 text-right font-semibold text-emerald-700">+ {money(p.amount)}</td></tr>})}</tbody></table>{list.length===0&&<p className="px-5 py-10 text-center text-sm text-pierre">Aucun paiement enregistré pour cette sélection.</p>}</div>
        <p className="flex items-center gap-2 border-t border-terre/10 pt-4 text-sm text-pierre"><Receipt className="h-4 w-4" />Les reçus et échéanciers seront accessibles ici lorsqu’ils sont publiés par l’établissement.</p>
      </>}
  </div>
}
