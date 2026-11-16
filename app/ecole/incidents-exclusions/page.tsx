"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Check, Clock, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"

type Row = {
  id: string; establishment_id: string; student_id: string; subject_id: string; lesson_date: string;
  excluded_at: string; reason: string; teacher_note: string | null; scope: string; end_date: string | null;
  status: "pending" | "approved" | "rejected"; review_note: string | null;
  students: { first_name: string; last_name: string } | null
}

export default function CourseExclusionsAdminPage() {
  const { etablissementActif, contexte } = useAuthentification()
  const establishmentId = etablissementActif?.id ?? contexte?.establishments?.[0]?.id ?? null
  const [rows,setRows] = useState<Row[]>([])
  const [subjects,setSubjects] = useState<Record<string,string>>({})
  const [endDates,setEndDates] = useState<Record<string,string>>({})
  const [scopes,setScopes] = useState<Record<string,"same_subject_until"|"all_courses_until">>({})
  const [notes,setNotes] = useState<Record<string,string>>({})
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState<string|null>(null)
  const [error,setError] = useState<string|null>(null)
  const [message,setMessage] = useState<string|null>(null)

  const load = useCallback(async () => {
    if (!establishmentId) { setLoading(false); return }
    setLoading(true); setError(null)
    const {data,error:queryError}=await supabaseBrowser.from("course_exclusions")
      .select("id,establishment_id,student_id,subject_id,lesson_date,excluded_at,reason,teacher_note,scope,end_date,status,review_note,students(first_name,last_name)")
      .eq("establishment_id",establishmentId).order("created_at",{ascending:false})
    if(queryError){setError("Impossible de charger les signalements.");setRows([]);setLoading(false);return}
    const items=(data??[]) as unknown as Row[]
    setRows(items)
    setEndDates(Object.fromEntries(items.map(row=>[row.id,row.end_date??row.lesson_date])))
    setScopes(Object.fromEntries(items.map(row=>[row.id,row.scope==="all_courses_until"?"all_courses_until":"same_subject_until"])))
    const ids=[...new Set(items.map(row=>row.subject_id))]
    if(ids.length){
      const {data:subjectRows}=await supabaseBrowser.from("subjects").select("id,name").in("id",ids)
      setSubjects(Object.fromEntries((subjectRows??[]).map(item=>[item.id,item.name])))
    }
    setLoading(false)
  },[establishmentId])

  useEffect(()=>{void load()},[load])

  const review=async(row:Row,decision:"approved"|"rejected")=>{
    setBusy(row.id);setError(null);setMessage(null)
    const {error:rpcError}=await supabaseBrowser.rpc("admin_review_course_exclusion",{
      p_exclusion_id:row.id,p_decision:decision,
      p_end_date:decision==="approved"?(endDates[row.id]??row.end_date):null,
      p_scope:decision==="approved"?(scopes[row.id]??"same_subject_until"):null,
      p_review_note:notes[row.id]??null
    })
    if(rpcError){setError(rpcError.message);setBusy(null);return}
    setMessage(decision==="approved"?"Exclusion validée. Le parent a été informé.":"Signalement refusé.")
    await load()
    setBusy(null)
  }

  const pending=rows.filter(row=>row.status==="pending")
  const history=rows.filter(row=>row.status!=="pending")

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Vie scolaire</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Incidents et exclusions</h1>
        <p className="mt-1 text-sm text-slate-500">Examinez les demandes des enseignants et décidez des exclusions prolongées.</p>
      </header>
      {error&&<p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message&&<p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">À traiter</h2><span className="text-sm text-slate-500">{pending.length} en attente</span></div>
        {loading?<div className="flex justify-center border bg-white p-8"><Loader2 className="h-5 w-5 animate-spin"/></div>:!pending.length?<div className="border border-dashed bg-white p-8 text-center text-sm text-slate-500">Aucune demande en attente.</div>:pending.map(row=>(
          <article key={row.id} className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5"/></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{row.students?row.students.last_name+" "+row.students.first_name:"Élève"}</h3><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">En attente</span></div>
                <p className="mt-1 text-sm text-slate-600">{subjects[row.subject_id]??"Cours"} · {new Date(row.lesson_date+"T12:00:00").toLocaleDateString("fr-FR")} · signalé à {new Date(row.excluded_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-800">{row.reason}</p>
                {row.teacher_note&&<p className="mt-2 text-xs text-slate-500">Observation : {row.teacher_note}</p>}
              </div>
            </div>
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Portée de la décision
                <select value={scopes[row.id]??"same_subject_until"} onChange={e=>setScopes(v=>({...v,[row.id]:e.target.value as "same_subject_until"|"all_courses_until"}))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
                  <option value="same_subject_until">Cette matière uniquement</option><option value="all_courses_until">Tous les cours</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Date de fin
                <input type="date" min={row.lesson_date} value={endDates[row.id]??row.lesson_date} onChange={e=>setEndDates(v=>({...v,[row.id]:e.target.value}))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Note de l'administration (facultative)
              <textarea rows={2} value={notes[row.id]??""} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} placeholder="Précision communiquée au parent…" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/>
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={busy===row.id} onClick={()=>void review(row,"rejected")}><X className="mr-2 h-4 w-4"/>Refuser</Button>
              <Button disabled={busy===row.id||!endDates[row.id]} onClick={()=>void review(row,"approved")}>{busy===row.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Check className="mr-2 h-4 w-4"/>}Valider et informer le parent</Button>
            </div>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Historique</h2>
        {!loading&&!history.length?<p className="border border-dashed bg-white p-6 text-sm text-slate-500">Aucun signalement traité.</p>:<div className="divide-y border-y bg-white sm:rounded-lg sm:border">{history.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium text-slate-900">{row.students?row.students.last_name+" "+row.students.first_name:"Élève"} · {subjects[row.subject_id]??"Cours"}</p><p className="text-xs text-slate-500">{new Date(row.lesson_date+"T12:00:00").toLocaleDateString("fr-FR")} · {row.reason}</p></div><span className={row.status==="approved"?"rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700":"rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>{row.status==="approved"?"Validée":"Refusée"}</span></div>)}</div>}
      </section>
    </div>
  )
}
