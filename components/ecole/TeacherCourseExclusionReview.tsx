"use client"
import { useCallback,useEffect,useState } from "react"
import { AlertTriangle,Check,Loader2,X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"

type Row={id:string;student_id:string;subject_id:string;lesson_date:string;excluded_at:string;reason:string;teacher_note:string|null;scope:string;end_date:string|null;status:"pending"|"approved"|"rejected";review_note:string|null;students:{first_name:string;last_name:string}|null}
export function TeacherCourseExclusionReview(){
 const {etablissementActif,contexte}=useAuthentification()
 const eid=etablissementActif?.id??contexte?.establishments?.[0]?.id??null
 const [rows,setRows]=useState<Row[]>([]),[subjects,setSubjects]=useState<Record<string,string>>({})
 const [ends,setEnds]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState("")
 const load=useCallback(async()=>{
  if(!eid){setLoading(false);return}
  setLoading(true);setError("")
  const {data,error:e}=await supabaseBrowser.from("course_exclusions").select("id,student_id,subject_id,lesson_date,excluded_at,reason,teacher_note,scope,end_date,status,review_note,students(first_name,last_name)").eq("establishment_id",eid).order("created_at",{ascending:false})
  if(e){setError("Impossible de charger les signalements des enseignants.");setRows([]);setLoading(false);return}
  const items=(data??[]) as unknown as Row[];setRows(items);setEnds(Object.fromEntries(items.map(x=>[x.id,x.end_date??x.lesson_date])))
  const ids=[...new Set(items.map(x=>x.subject_id))]
  if(ids.length){const {data:subs}=await supabaseBrowser.from("subjects").select("id,name").in("id",ids);setSubjects(Object.fromEntries((subs??[]).map(x=>[x.id,x.name])))}
  setLoading(false)
 },[eid])
 useEffect(()=>{void load()},[load])
 const review=async(row:Row,decision:"approved"|"rejected")=>{
  setBusy(row.id);setError("")
  const {error:e}=await supabaseBrowser.rpc("admin_review_course_exclusion",{p_exclusion_id:row.id,p_decision:decision,p_end_date:decision==="approved"?(ends[row.id]??row.end_date):null,p_scope:decision==="approved"?"same_subject_until":null,p_review_note:notes[row.id]??null})
  if(e){setError(e.message);setBusy("");return}
  await load();setBusy("")
 }
 const pending=rows.filter(x=>x.status==="pending"),history=rows.filter(x=>x.status!=="pending")
 return <section className="space-y-4">
  <header><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-slate-900">Demandes des enseignants</h2><span className="text-sm text-slate-500">{pending.length} à traiter</span></div><p className="mt-1 text-sm text-slate-500">Une demande prolongée reste limitée à la matière de l’enseignant. Elle ne peut pas devenir une sanction générale.</p></header>
  {error&&<p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {loading?<div className="flex justify-center border bg-white p-8"><Loader2 className="h-5 w-5 animate-spin"/></div>:!pending.length?<div className="border border-dashed bg-white p-6 text-sm text-slate-500">Aucune demande en attente.</div>:pending.map(row=><article key={row.id} className="space-y-4 border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{row.students?row.students.last_name+" "+row.students.first_name:"Élève"}</h3><span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">En attente</span></div><p className="mt-1 text-sm text-slate-600">{subjects[row.subject_id]??"Cours"} · {new Date(row.lesson_date+"T12:00:00").toLocaleDateString("fr-FR")} · {new Date(row.excluded_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p><p className="mt-3 whitespace-pre-line text-sm text-slate-800">{row.reason}</p>{row.teacher_note&&<p className="mt-2 text-xs text-slate-500">Observation : {row.teacher_note}</p>}</div></div>
   <div className="grid gap-3 border-t pt-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Portée de la décision<select disabled className="mt-1.5 h-10 w-full rounded-lg border bg-slate-50 px-3 text-sm"><option>Cette matière uniquement</option></select></label><label className="text-sm font-medium text-slate-700">Date de fin<input type="date" min={row.lesson_date} value={ends[row.id]??row.lesson_date} onChange={e=>setEnds(v=>({...v,[row.id]:e.target.value}))} className="mt-1.5 h-10 w-full rounded-lg border px-3 text-sm"/></label></div>
   <label className="block text-sm font-medium text-slate-700">Note à communiquer au parent (facultative)<textarea rows={2} value={notes[row.id]??""} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))} className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm"/></label>
   <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={busy===row.id} onClick={()=>void review(row,"rejected")}><X className="mr-2 h-4 w-4"/>Refuser</Button><Button disabled={busy===row.id||!ends[row.id]} onClick={()=>void review(row,"approved")}>{busy===row.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Check className="mr-2 h-4 w-4"/>}Valider et informer le parent</Button></div>
  </article>)}
  <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-800">Historique des demandes enseignantes</h3>{!history.length?<p className="border border-dashed bg-white p-5 text-sm text-slate-500">Aucune demande traitée.</p>:<div className="divide-y border-y bg-white">{history.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium">{row.students?row.students.last_name+" "+row.students.first_name:"Élève"} · {subjects[row.subject_id]??"Cours"}</p><p className="mt-1 text-xs text-slate-500">{new Date(row.lesson_date+"T12:00:00").toLocaleDateString("fr-FR")} · {row.reason}</p></div><span className="text-xs font-medium">{row.status==="approved"?"Validée":"Refusée"}</span></div>)}</div>}</div>
 </section>
}
