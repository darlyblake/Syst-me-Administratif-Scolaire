"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, ExternalLink, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useSchoolRealtime } from "@/hooks/use-school-realtime"

type RequestRow = {
  id:string
  attendance_id:string
  student_id:string
  reason:string
  status:"pending"|"approved"|"rejected"|"cancelled"
  reviewer_note:string|null
  created_at:string
  attachment_path:string|null
  attachment_name:string|null
  attachment_mime_type:string|null
  attachment_size_bytes:number|null
  student_name:string
  attendance_date:string
  subject_name:string
}

const statusLabel:Record<RequestRow["status"],string> = {
  pending:"À examiner", approved:"Acceptée", rejected:"Refusée", cancelled:"Annulée"
}

export default function AttendanceJustificationsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const role = primaryEstablishment?.role ?? ""
  const permissions = primaryEstablishment?.permissions ?? []
  const canManage = ["owner","admin","director","supervisor"].includes(role) || permissions.includes("attendance.manage")
  const [rows,setRows] = useState<RequestRow[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)
  const [filter,setFilter] = useState<"pending"|"all">("pending")
  const [notes,setNotes] = useState<Record<string,string>>({})
  const [busyId,setBusyId] = useState<string|null>(null)
  const [signedUrls,setSignedUrls] = useState<Record<string,string>>({})
  const realtimeRevision = useSchoolRealtime(["attendance_justification_requests", "attendance_records"])

  const load = useCallback(async () => {
    if (!establishmentId || !canManage) { setRows([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const {data:requests,error:requestError} = await supabaseBrowser
        .from("attendance_justification_requests")
        .select("id,attendance_id,student_id,reason,status,reviewer_note,created_at,attachment_path,attachment_name,attachment_mime_type,attachment_size_bytes")
        .eq("establishment_id",establishmentId)
        .order("created_at",{ascending:false})
        .limit(300)
      if(requestError) throw requestError
      const requestRows=requests??[]
      const studentIds=[...new Set(requestRows.map(r=>r.student_id))]
      const attendanceIds=[...new Set(requestRows.map(r=>r.attendance_id))]
      const [studentsResult,attendanceResult] = await Promise.all([
        studentIds.length ? supabaseBrowser.from("students").select("id,first_name,last_name").in("id",studentIds) : Promise.resolve({data:[],error:null}),
        attendanceIds.length ? supabaseBrowser.from("attendance_records").select("id,attendance_date,subject_id").in("id",attendanceIds) : Promise.resolve({data:[],error:null})
      ])
      if(studentsResult.error) throw studentsResult.error
      if(attendanceResult.error) throw attendanceResult.error
      const subjectIds=[...new Set((attendanceResult.data??[]).map(a=>a.subject_id).filter((id): id is string => Boolean(id)))]
      const subjectsResult=subjectIds.length ? await supabaseBrowser.from("subjects").select("id,name").in("id",subjectIds) : {data:[],error:null}
      if(subjectsResult.error) throw subjectsResult.error
      const studentMap=new Map((studentsResult.data??[]).map(s=>[s.id,[s.first_name,s.last_name].filter(Boolean).join(" ")]))
      const attendanceMap=new Map((attendanceResult.data??[]).map(a=>[a.id,a]))
      const subjectMap=new Map((subjectsResult.data??[]).map(s=>[s.id,s.name]))
      setRows(requestRows.map(r=>{
        const attendance=attendanceMap.get(r.attendance_id)
        return {...r,status:r.status as RequestRow["status"],student_name:studentMap.get(r.student_id)??"Élève",attendance_date:attendance?.attendance_date??"",subject_name:attendance?.subject_id?subjectMap.get(attendance.subject_id)??"Matière non renseignée":"Matière non renseignée"}
      }))
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Impossible de charger les demandes de justification.")
    } finally { setLoading(false) }
  },[establishmentId,canManage])

  useEffect(()=>{void load()},[load,realtimeRevision])

  const review = async (row:RequestRow,status:"approved"|"rejected") => {
    const note=(notes[row.id]??"").trim()
    if(status==="rejected" && note.length<3){setError("Indiquez le motif du refus (3 caractères minimum).");return}
    setBusyId(row.id);setError(null)
    try {
      const {data:{user},error:userError}=await supabaseBrowser.auth.getUser()
      if(userError||!user) throw new Error("Session administrative introuvable.")
      const {error:updateError}=await supabaseBrowser.from("attendance_justification_requests").update({
        status,reviewer_note:note||null,reviewed_by:user.id,reviewed_at:new Date().toISOString()
      }).eq("id",row.id).eq("establishment_id",establishmentId).eq("status","pending")
        .select("id")
        .single()
      if(updateError) throw updateError
      await load()
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Impossible d'enregistrer la décision.")
    } finally {setBusyId(null)}
  }

  const prepareFile = async (row:RequestRow) => {
    if(!row.attachment_path) return
    setBusyId(row.id);setError(null)
    try {
      const {data,error:signError}=await supabaseBrowser.storage.from("attendance-justifications").createSignedUrl(row.attachment_path,300)
      if(signError) throw signError
      setSignedUrls(current=>({...current,[row.id]:data.signedUrl}))
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Impossible d'ouvrir le document.")
    } finally {setBusyId(null)}
  }

  const visibleRows=rows.filter(row=>filter==="all"||row.status==="pending")

  if(!canManage) return <main className="mx-auto max-w-4xl p-5"><h1 className="text-xl font-semibold">Justifications d'absence</h1><p className="mt-2 text-sm text-slate-600">Votre compte ne dispose pas de l'autorisation nécessaire pour examiner ces demandes.</p></main>

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-start gap-3">
        <Button asChild variant="outline" size="sm"><Link href="/ecole/registre-appel"><ArrowLeft className="mr-2 h-4 w-4"/>Registre d'appel</Link></Button>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Vie scolaire</p><h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Justifications d'absence</h1><p className="mt-1 text-sm text-slate-500">Examinez les motifs et les pièces envoyées par les parents.</p></div>
      </div>

    </header>
    {error&&<div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <div className="flex gap-2"><button onClick={()=>setFilter("pending")} className={filter==="pending"?"border-b-2 border-blue-700 px-3 py-2 text-sm font-semibold text-blue-800":"px-3 py-2 text-sm text-slate-500"}>À examiner ({rows.filter(r=>r.status==="pending").length})</button><button onClick={()=>setFilter("all")} className={filter==="all"?"border-b-2 border-blue-700 px-3 py-2 text-sm font-semibold text-blue-800":"px-3 py-2 text-sm text-slate-500"}>Tout l'historique</button></div>
      <span className="text-xs text-slate-500">{visibleRows.length} demande(s)</span>
    </div>
    {loading?<p className="py-10 text-center text-sm text-slate-500">Chargement des demandes…</p>:visibleRows.length===0?<p className="border border-slate-200 px-4 py-10 text-center text-sm text-slate-500">Aucune demande à afficher.</p>:<div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
      {visibleRows.map(row=><article key={row.id} className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2 px-1">
          <div><h2 className="font-semibold text-slate-900">{row.student_name}</h2><p className="mt-0.5 text-xs text-slate-500">{row.attendance_date?new Date(row.attendance_date+"T12:00:00").toLocaleDateString("fr-FR"):"Date inconnue"} · {row.subject_name} · demande du {new Date(row.created_at).toLocaleDateString("fr-FR")}</p></div>
          <span className={"border px-2 py-1 text-xs font-semibold "+(row.status==="pending"?"border-amber-200 bg-amber-50 text-amber-800":row.status==="approved"?"border-emerald-200 bg-emerald-50 text-emerald-800":row.status==="rejected"?"border-red-200 bg-red-50 text-red-800":"border-slate-200 bg-slate-50 text-slate-600")}>{statusLabel[row.status]}</span>
        </div>
        <div className="border-l-2 border-blue-600 bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.reason}</div>
        {row.attachment_path&&<div className="flex flex-wrap items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-blue-700"/><span className="max-w-[220px] truncate text-slate-700">{row.attachment_name??"Document justificatif"}</span>
          {signedUrls[row.id]?<a href={signedUrls[row.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 underline">Ouvrir le document<ExternalLink className="h-3.5 w-3.5"/></a>:<Button size="sm" variant="outline" onClick={()=>void prepareFile(row)} disabled={busyId===row.id}>{busyId===row.id?"Préparation…":"Voir le document"}</Button>}
        </div>}
        {row.status==="pending"?<div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-600">Commentaire / motif du refus (obligatoire en cas de refus)<Input value={notes[row.id]??""} onChange={e=>setNotes(current=>({...current,[row.id]:e.target.value}))} placeholder="Ajouter une précision au parent…" className="mt-1"/></label>
          <Button onClick={()=>void review(row,"approved")} disabled={busyId===row.id}><Check className="mr-2 h-4 w-4"/>Accepter</Button>
          <Button variant="outline" onClick={()=>void review(row,"rejected")} disabled={busyId===row.id} className="border-red-200 text-red-700 hover:bg-red-50"><X className="mr-2 h-4 w-4"/>Refuser</Button>
        </div>:row.reviewer_note?<p className="text-xs text-slate-500">Retour transmis au parent : {row.reviewer_note}</p>:null}
      </article>)}
    </div>}
  </main>
}
