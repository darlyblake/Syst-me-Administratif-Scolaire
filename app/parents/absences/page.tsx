"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { UserX, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParentPortal } from "@/hooks/use-parent-portal"

const CONFIG: Record<string,{label:string;className:string;icon:typeof UserX}> = {
  absent:{label:"Absent",className:"bg-rose-50 text-rose-700",icon:UserX},
  justifie:{label:"Justifié",className:"bg-emerald-50 text-emerald-700",icon:CheckCircle2},
  non_justifie:{label:"Non justifié",className:"bg-amber-50 text-amber-700",icon:AlertCircle},
  retard:{label:"Retard",className:"bg-orange-50 text-orange-700",icon:Clock},
}

export default function ParentsAbsencesPage(){
 const params=useSearchParams(); const {loading,error,children,attendance}=useParentPortal(); const [id,setId]=useState(params.get("eleve")||"tous")
 const list=useMemo(()=>attendance.filter(a=>id==="tous"||a.student_id===id),[attendance,id]); const name=(sid:string)=>{const c=children.find(x=>x.id===sid);return c?`${c.first_name} ${c.last_name}`:sid}
 const stats={total:list.length,justifiees:list.filter(a=>a.status==="justifie").length,retards:list.filter(a=>a.status==="retard").length,non:list.filter(a=>a.status==="non_justifie"||a.status==="absent").length}
 if(loading)return <div className="flex min-h-[50vh] items-center justify-center text-pierre">Chargement des absences...</div>
 return <div className="space-y-6"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-terre"><UserX className="h-6 w-6"/>Absences & retards</h1><p className="text-pierre">Historique réel de présence de vos enfants</p></div>{error&&<Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-red-700">{error}</CardContent></Card>}<Select value={id} onValueChange={setId}><SelectTrigger className="w-[240px]"><SelectValue placeholder="Filtrer par enfant"/></SelectTrigger><SelectContent><SelectItem value="tous">Tous les enfants</SelectItem>{children.map(c=><SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent></Select><div className="grid gap-3 sm:grid-cols-4">{[["Total",stats.total],["Justifiées",stats.justifiees],["Retards",stats.retards],["Non justifiées",stats.non]].map(([label,value])=><Card key={String(label)}><CardContent className="p-4 text-center"><p className="text-xs uppercase text-pierre">{label}</p><p className="text-2xl font-bold text-terre">{value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader><CardContent className="space-y-3">{list.length===0?<p className="py-8 text-center text-pierre">Aucune absence enregistrée.</p>:list.map(a=>{const cfg=CONFIG[a.status]??CONFIG.absent;const Icon=cfg.icon;return <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terre/10 p-4"><div className="flex gap-3"><div className={`rounded-lg p-2 ${cfg.className}`}><Icon className="h-4 w-4"/></div><div><p className="font-medium text-terre">{new Date(a.attendance_date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><p className="text-sm text-pierre">{name(a.student_id)}</p>{a.reason&&<p className="text-sm text-pierre">Motif : {a.reason}</p>}</div></div><Badge className={cfg.className}>{cfg.label}</Badge></div>})}</CardContent></Card></div>
}