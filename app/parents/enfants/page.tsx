"use client"

import Link from "next/link"
import { useState } from "react"
import { GraduationCap, Mail, Phone, Plus, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { LinkChildModal } from "@/components/parent/LinkChildModal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentChildren() {
  const {loading,error,refresh,children,claimChild,unclaimChild}=useParentPortal()
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState<string|null>(null)
  const [actionError,setActionError]=useState<string|null>(null)
  const remove=async(id:string,name:string)=>{if(!window.confirm(`Retirer ${name} de votre compte ? Cette action ne supprime pas l'élève de l'établissement.`))return;setBusy(id);setActionError(null);try{await unclaimChild(id)}catch(e){setActionError(e instanceof Error?e.message:"Impossible de retirer l’association.")}finally{setBusy(null)}}
  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Famille" title="Mes enfants" description="Gérez les enfants associés à votre compte et leurs accès." onRefresh={()=>void refresh()} refreshing={loading} action={<Button size="sm" onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Ajouter un enfant</Button>}/>
    {(error||actionError)&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError||error}</div>}
    {!loading&&children.length===0?<ParentEmptyState title="Aucun enfant associé" description="Ajoutez un enfant avec son identifiant scolaire et sa date de naissance, ou utilisez le scanner prévu par le portail." action={<Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Ajouter mon enfant</Button>}/>:<div className="border-y border-terre/10 divide-y divide-terre/10">
      {children.map(child=><div key={child.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terre text-xs font-bold text-white">{child.first_name[0]}{child.last_name[0]}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-terre">{child.first_name} {child.last_name}</p><Badge variant="outline">{child.active?"Actif":"Inactif"}</Badge></div><p className="mt-0.5 text-sm text-pierre">{child.class_name??"Classe non attribuée"} · {child.student_number??"Matricule non renseigné"}</p><div className="mt-2 flex flex-wrap gap-4 text-xs text-pierre">{child.phone&&<span className="flex items-center gap-1"><Phone className="h-3 w-3"/>{child.phone}</span>}{child.email&&<span className="flex items-center gap-1"><Mail className="h-3 w-3"/>{child.email}</span>}</div></div></div><div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4"><Access label="Résultats" ok={child.can_view_academic}/><Access label="Présences" ok={child.can_view_academic}/><Access label="Scolarité" ok={child.can_view_finance}/><Access label="Relation" ok={!!child.relationship}/></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link href={`/parents/notes?eleve=${child.id}`}><GraduationCap className="mr-1.5 h-4 w-4"/>Résultats</Link></Button>{child.can_view_finance&&<Button size="sm" variant="outline" asChild><Link href={`/parents/paiements?eleve=${child.id}`}>Paiements</Link></Button>}<Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50 hover:text-red-800" disabled={busy===child.id} onClick={()=>void remove(child.id,child.first_name+" "+child.last_name)}><UserX className="mr-1.5 h-4 w-4"/>{busy===child.id?"Retrait…":"Retirer"}</Button></div></div>)}
    </div>}
    <LinkChildModal open={open} onOpenChange={setOpen} onSubmit={async(input)=>{await claimChild(input)}}/>
  </div>
}
function Access({label,ok}:{label:string;ok:boolean}){return <div><p className="text-xs text-pierre">{label}</p><p className={ok?"mt-0.5 font-medium text-emerald-700":"mt-0.5 text-pierre"}>{ok?"Autorisé":"Limité"}</p></div>}
