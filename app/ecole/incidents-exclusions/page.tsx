"use client"
import { useCallback,useEffect,useState } from "react"
import { AlertTriangle,CheckCircle2,Loader2,ShieldCheck,XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"
import { TeacherCourseExclusionReview } from "@/components/ecole/TeacherCourseExclusionReview"

type Enrol={student_id:string;class_id:string;student_name:string;student_number:string|null;class_name:string}
type Sanction={id:string;student_id:string;class_id:string;reason:string;start_date:string;end_date:string|null;is_permanent:boolean;status:string;lift_reason:string|null}
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
const fmt=(d:string)=>new Date(d+"T12:00:00").toLocaleDateString("fr-FR")
export default function CourseExclusionsAdminPage(){
 const {etablissementActif,contexte}=useAuthentification()
 const eid=etablissementActif?.id??contexte?.establishments?.[0]?.id??null
 const [enrol,setEnrol]=useState<Enrol[]>([]),[rows,setRows]=useState<Sanction[]>([])
 const [choice,setChoice]=useState(""),[reason,setReason]=useState(""),[start,setStart]=useState(today()),[end,setEnd]=useState(today()),[permanent,setPermanent]=useState(false)
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("")
 const load=useCallback(async()=>{
  if(!eid){setLoading(false);return}
  setLoading(true);setError("")
  const [er,sr]=await Promise.all([supabaseBrowser.from("enrollments").select("student_id,class_id").eq("establishment_id",eid).eq("status","active"),supabaseBrowser.from("administrative_exclusions").select("id,student_id,class_id,reason,start_date,end_date,is_permanent,status,lift_reason").eq("establishment_id",eid).order("created_at",{ascending:false})])
  if(er.error||sr.error){setError("Impossible de charger les décisions ou les inscriptions.");setLoading(false);return}
  const e=er.data??[],ids=[...new Set(e.map(x=>x.student_id))],cids=[...new Set(e.map(x=>x.class_id))]
  const [st,cl]=await Promise.all([ids.length?supabaseBrowser.from("students").select("id,first_name,last_name,student_number").in("id",ids):Promise.resolve({data:[]}),cids.length?supabaseBrowser.from("school_classes").select("id,name").in("id",cids):Promise.resolve({data:[]})])
  const sm=new Map((st.data??[]).map(x=>[x.id,x])),cm=new Map((cl.data??[]).map(x=>[x.id,x.name]))
  setEnrol(e.flatMap(x=>{const s=sm.get(x.student_id);return s?[{student_id:x.student_id,class_id:x.class_id,student_name:s.last_name+" "+s.first_name,student_number:s.student_number,class_name:cm.get(x.class_id)??"Classe"}]:[]}))
  setRows((sr.data??[]) as Sanction[]);setLoading(false)
 },[eid])
 useEffect(()=>{void load()},[load])
 const selected=enrol.find(x=>x.student_id+"|"+x.class_id===choice)
 const active=rows.filter(x=>x.status==="active"&&(x.is_permanent||!x.end_date||x.end_date>=today()))
 const history=rows.filter(x=>!active.some(a=>a.id===x.id))
 const create=async()=>{
  if(!selected||reason.trim().length<3||(!permanent&&end<start))return
  if(permanent&&!window.confirm("Confirmer une exclusion définitive de toutes les matières pour cet élève ?"))return
  setSaving(true);setError("");setNotice("")
  const {error:e}=await supabaseBrowser.rpc("admin_create_administrative_exclusion",{p_establishment_id:eid,p_student_id:selected.student_id,p_class_id:selected.class_id,p_reason:reason.trim(),p_start_date:start,p_is_permanent:permanent,p_end_date:permanent?null:end})
  if(e){setError(e.message);setSaving(false);return}
  setNotice("Décision enregistrée. Les responsables légaux ont été notifiés.");setChoice("");setReason("");setStart(today());setEnd(today());setPermanent(false);await load();setSaving(false)
 }
 const lift=async(id:string)=>{
  if(!window.confirm("Confirmer la levée anticipée de cette sanction ?"))return
  setBusy(id);setError("");setNotice("")
  const {error:e}=await supabaseBrowser.rpc("admin_lift_administrative_exclusion",{p_exclusion_id:id,p_lift_reason:null})
  if(e){setError(e.message);setBusy("");return}
  setNotice("La sanction a été levée.");await load();setBusy("")
 }
 const person=(x:Sanction)=>enrol.find(e=>e.student_id===x.student_id&&e.class_id===x.class_id)
 return <main className="mx-auto max-w-6xl space-y-7">
  <header><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Vie scolaire · Administration</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">Décisions disciplinaires</h1><p className="mt-1 text-sm text-slate-600">Une exclusion administrative concerne toutes les matières, contrairement à une exclusion prononcée par un enseignant.</p></header>
  <TeacherCourseExclusionReview />
  {error&&<p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="flex items-center gap-2 border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><CheckCircle2 className="h-4 w-4"/>{notice}</p>}
  <section className="space-y-4 border border-slate-200 bg-white p-4 sm:p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-blue-700"/><div><h2 className="font-semibold">Prononcer une exclusion administrative</h2><p className="text-sm text-slate-500">Les responsables légaux sont automatiquement informés.</p></div></div>
   <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium sm:col-span-2">Élève et classe<select value={choice} onChange={e=>setChoice(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border bg-white px-3"><option value="">Sélectionner un élève…</option>{enrol.map((x,i)=><option key={x.student_id+x.class_id+i} value={x.student_id+"|"+x.class_id}>{x.student_name}{x.student_number ? " · N° " + x.student_number : ""} · {x.class_name}</option>)}</select></label>
    <label className="text-sm font-medium">Date de début<input type="date" min={today()} value={start} onChange={e=>{setStart(e.target.value);if(end<e.target.value)setEnd(e.target.value)}} className="mt-1.5 h-11 w-full rounded-lg border px-3"/></label>
    <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={permanent} onChange={e=>setPermanent(e.target.checked)} className="h-4 w-4"/>Exclusion définitive (toutes les matières)</label>
    {!permanent&&<label className="text-sm font-medium sm:col-span-2">Date de fin<input type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)} className="mt-1.5 h-11 w-full rounded-lg border px-3"/></label>}
    <label className="text-sm font-medium sm:col-span-2">Motif<textarea rows={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motif clair et factuel de la décision…" className="mt-1.5 w-full rounded-lg border px-3 py-2 font-normal"/><span className="text-xs font-normal text-slate-400">{reason.length}/1000</span></label>
   </div><div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">La sanction s’applique à toutes les matières de la classe.</p><Button onClick={()=>void create()} disabled={saving||!selected||reason.trim().length<3||(!permanent&&end<start)}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 h-4 w-4"/>}Enregistrer la décision</Button></div>
  </section>
  <section className="space-y-3"><h2 className="font-semibold">Décisions actives ou programmées ({active.length})</h2>{loading?<div className="flex justify-center border p-8"><Loader2 className="h-5 w-5 animate-spin"/></div>:!active.length?<p className="border border-dashed p-7 text-center text-sm text-slate-500">Aucune exclusion administrative en vigueur.</p>:<div className="divide-y border bg-white">{active.map(x=><article key={x.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{person(x)?.student_name??"Élève"} · {person(x)?.class_name??"Classe"}</p><p className="mt-1 text-sm text-slate-600">{x.is_permanent?"Définitive":"Du "+fmt(x.start_date)+" au "+(x.end_date?fmt(x.end_date):"—")} · Toutes les matières</p><p className="mt-2 text-sm">{x.reason}</p></div><Button variant="outline" size="sm" disabled={busy===x.id} onClick={()=>void lift(x.id)} className="shrink-0">{busy===x.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<XCircle className="mr-2 h-4 w-4"/>}Lever la sanction</Button></article>)}</div>}</section>
  <section className="space-y-3"><h2 className="font-semibold">Historique</h2>{!loading&&!history.length?<p className="border border-dashed p-6 text-sm text-slate-500">Aucune décision antérieure.</p>:<div className="divide-y border-y bg-white">{history.map(x=><div key={x.id} className="flex flex-wrap justify-between gap-2 px-4 py-3"><div><p className="text-sm font-medium">{person(x)?.student_name??"Élève"} · {person(x)?.class_name??"Classe"}</p><p className="mt-1 text-xs text-slate-500">{x.is_permanent?"Définitive":fmt(x.start_date)+" – "+(x.end_date?fmt(x.end_date):"—")} · {x.reason}</p>{x.lift_reason&&<p className="text-xs text-slate-500">Levée : {x.lift_reason}</p>}</div><span className="text-xs text-slate-500">{x.status==="lifted"?"Levée":x.status==="expired"||(x.status==="active"&&!!x.end_date&&x.end_date<today())?"Terminée":x.status==="active"&&x.start_date>today()?"À venir":x.status==="active"?"En cours":x.status}</span></div>)}</div>}</section>
  <p className="flex items-start gap-2 text-xs text-slate-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>La décision disciplinaire ne supprime pas automatiquement l’inscription de l’élève.</p>
 </main>
}