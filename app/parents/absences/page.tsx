"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentAbsences() {
  const params=useSearchParams()
  const {loading,error,refresh,children,attendance,justificationRequests,requestAttendanceJustification,cancelAttendanceJustification}=useParentPortal()
  const allowed=useMemo(()=>children.filter(c=>c.can_view_academic),[children])
  const [childId,setChildId]=useState(params.get("eleve")||"tous")
  const [selected,setSelected]=useState<string|null>(null)
  const [reason,setReason]=useState("")
  const [busy,setBusy]=useState(false)
  const list=useMemo(()=>attendance.filter(a=>a.status!=="present"&&(childId==="tous"?allowed.some(c=>c.id===a.student_id):a.student_id===childId)),[attendance,childId,allowed])
  const req=new Map(justificationRequests.map(r=>[r.attendance_id,r]))
  const stats={total:list.length,abs:list.filter(a=>a.status.includes("absent")).length,retards:list.filter(a=>a.status==="late"||a.status==="retard").length}

  const submit=async()=>{const a=attendance.find(x=>x.id===selected);if(!a)return;setBusy(true);try{await requestAttendanceJustification(a,reason);setSelected(null);setReason("")}finally{setBusy(false)}}

  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Vie scolaire" title="Présences" description="Suivez les absences, retards et demandes de justification de vos enfants." onRefresh={()=>void refresh()} refreshing={loading} />
    {error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading&&allowed.length===0?<ParentEmptyState title="Présences non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter la vie scolaire." />:<>
      <div className="flex flex-col gap-3 border-b border-terre/10 pb-4 sm:flex-row sm:items-center sm:justify-between"><ParentChildSelect children={allowed} value={childId} onChange={setChildId}/><div className="flex gap-5 text-sm"><span><strong className="text-terre">{stats.total}</strong> incidents</span><span><strong className="text-terre">{stats.abs}</strong> absences</span><span><strong className="text-terre">{stats.retards}</strong> retards</span></div></div>
      <div className="border border-terre/10 bg-papier"><div className="grid grid-cols-[1fr_auto] border-b border-terre/10 bg-creme px-4 py-3 text-xs font-semibold uppercase tracking-wide text-pierre sm:grid-cols-[1.4fr_1fr_1fr_auto]"><span>Date / élève</span><span className="hidden sm:block">Statut</span><span className="hidden sm:block">Justification</span><span></span></div>
        {list.map(a=>{const c=children.find(x=>x.id===a.student_id);const r=req.get(a.id);const label=a.status==="late"||a.status==="retard"?"Retard":a.status==="absent"?"Absence":"Non justifiée";return <div key={a.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-terre/10 px-4 py-4 last:border-b-0 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center"><div><p className="font-medium text-terre">{new Date(a.attendance_date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><p className="text-sm text-pierre">{c?.first_name} {c?.last_name}</p>{a.reason&&<p className="mt-1 text-xs text-pierre">Motif : {a.reason}</p>}</div><span className="text-sm font-medium text-terre sm:block">{label}</span><span className="text-xs text-pierre sm:block">{r? r.status==="approved"?"Acceptée":r.status==="rejected"?"Refusée":r.status==="cancelled"?"Annulée":"En attente":"Aucune"}</span><div>{!r&&(a.status==="absent"||a.status==="non_justifie")?<Button size="sm" variant="outline" onClick={()=>{setSelected(a.id);setReason(a.reason??"")}}><FileText className="mr-1.5 h-4 w-4"/>Justifier</Button>:r?.status==="pending"?<Button size="sm" variant="ghost" onClick={()=>void cancelAttendanceJustification(r.id)}>Annuler</Button>:null}</div></div>})}
        {list.length===0&&<ParentEmptyState title="Aucune absence ou retard" description="Aucun incident ne correspond à votre sélection." />}
      </div>
    </>}
    {selected&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg border border-terre/10 bg-papier p-5 shadow-soft"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-terre">Justifier une absence</h2><p className="mt-1 text-sm text-pierre">La demande sera transmise à l’établissement.</p></div><Button variant="ghost" size="icon" onClick={()=>setSelected(null)}><X className="h-4 w-4"/></Button></div><Textarea className="mt-4" rows={5} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Expliquez brièvement le motif…" maxLength={2000}/><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Annuler</Button><Button disabled={busy||reason.trim().length<3} onClick={()=>void submit()}>{busy?"Envoi…":"Envoyer"}</Button></div></div></div>}
  </div>
}
