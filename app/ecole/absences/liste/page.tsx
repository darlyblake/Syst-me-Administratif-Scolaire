"use client"

import { useEffect, useMemo, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { Check, Clock3, FileCheck2, Settings2, UserRoundX } from "lucide-react"

type Slot = { id:string; starts_at:string; ends_at:string; day_of_week:number; class_subject_id:string; subject:string; class_id:string }
type Student = { id:string; student_number:string|null; last_name:string; first_name:string }
type RecordRow = { id:string; student_id:string; status:string; reason:string|null; lesson_key:string|null; attendance_date:string }
type RequestRow = { id:string; attendance_id:string; status:string; reason:string; attachment_path:string|null }

const statusText=(s:string)=>s==="present"?"Présent":s==="late"?"Retard":s==="justified"||s==="excused"?"Justifié":s==="absent"?"Absent":"Non renseigné"
const statusClass=(s:string)=>s==="present"?"text-emerald-700 bg-emerald-50 border-emerald-200":s==="late"?"text-amber-700 bg-amber-50 border-amber-200":s==="justified"||s==="excused"?"text-blue-700 bg-blue-50 border-blue-200":s==="absent"?"text-red-700 bg-red-50 border-red-200":"text-slate-400 bg-slate-50 border-slate-200"
const minutes=(a:string,b:string)=>Math.max(0,Math.round((new Date("1970-01-01T"+b).getTime()-new Date("1970-01-01T"+a).getTime())/60000))
const fmt=(n:number)=>`${Math.floor(n/60)}h ${String(n%60).padStart(2,"0")}`

export default function ListePresences(){
 const {primaryEstablishment}=useUserContext()
 const establishmentId=primaryEstablishment?.id??null
 const {data:structure=[]}=useAcademicStructure(establishmentId)
 const [classe,setClasse]=useState("")
 const [date,setDate]=useState(new Date().toISOString().slice(0,10))
 const [slots,setSlots]=useState<Slot[]>([])
 const [students,setStudents]=useState<Student[]>([])
 const [records,setRecords]=useState<RecordRow[]>([])
 const [requests,setRequests]=useState<RequestRow[]>([])
 const [selectedSlot,setSelectedSlot]=useState<string>("")
 const [loading,setLoading]=useState(false)
 const [showSettings,setShowSettings]=useState(false)
 const [resetPeriod,setResetPeriod]=useState("term")
 const [includeJustified,setIncludeJustified]=useState(false)
 const [message,setMessage]=useState("")

 const classes=useMemo(()=>structure.flatMap(c=>(c.grade_levels??[]).flatMap(l=>(l.school_classes??[]).map(x=>({id:x.id,name:x.name})))),[structure])

 async function load(){
   if(!establishmentId||!classe)return
   setLoading(true);setMessage("")
   const {data:enr,error:ee}=await supabaseBrowser.from("enrollments").select("student_id").eq("establishment_id",establishmentId).eq("class_id",classe).eq("status","active")
   if(ee){setMessage(ee.message);setLoading(false);return}
   const ids=(enr??[]).map(x=>x.student_id)
   const [{data:st,error:se},{data:cs,error:ce}]=await Promise.all([
     ids.length?supabaseBrowser.from("students").select("id,student_number,last_name,first_name").in("id",ids).order("last_name"):Promise.resolve({data:[],error:null}),
     supabaseBrowser.from("timetable_slots").select("id,starts_at,ends_at,day_of_week,class_subject_id,class_subjects!inner(class_id,subject_id,subjects(name))").eq("establishment_id",establishmentId).eq("day_of_week",new Date(date+"T12:00:00").getDay()||7).eq("class_subjects.class_id",classe).order("starts_at")
   ])
   if(se||ce){setMessage((se||ce)?.message??"Impossible de charger le registre.");setLoading(false);return}
   const normalized=(cs??[]).map((x:any)=>({id:x.id,starts_at:x.starts_at,ends_at:x.ends_at,day_of_week:x.day_of_week,class_subject_id:x.class_subject_id,class_id:x.class_subjects.class_id,subject:x.class_subjects.subjects?.name??"Matière"}))
   const [{data:ar,error:ae},{data:jr,error:je}]=await Promise.all([
     ids.length?supabaseBrowser.from("attendance_records").select("id,student_id,status,reason,lesson_key,attendance_date").in("student_id",ids).eq("attendance_date",date):Promise.resolve({data:[],error:null}),
     ids.length?supabaseBrowser.from("attendance_justification_requests").select("id,attendance_id,status,reason,attachment_path").in("student_id",ids).order("created_at",{ascending:false}):Promise.resolve({data:[],error:null})
   ])
   if(ae||je){setMessage((ae||je)?.message??"Impossible de charger les présences.");setLoading(false);return}
   setStudents(st??[]);setSlots(normalized);setRecords(ar??[]);setRequests(jr??[])
   if(!selectedSlot&&normalized[0])setSelectedSlot(normalized[0].id)
   setLoading(false)
 }
 useEffect(()=>{void load()},[establishmentId,classe,date])

 async function loadSettings(){
   if(!establishmentId)return
   const {data:year}=await supabaseBrowser.from("academic_years").select("id").eq("establishment_id",establishmentId).eq("status","active").limit(1).maybeSingle()
   if(!year)return
   const {data}=await supabaseBrowser.from("attendance_summary_settings").select("reset_period,include_justified_in_bulletin").eq("establishment_id",establishmentId).eq("academic_year_id",year.id).maybeSingle()
   if(data){setResetPeriod(data.reset_period);setIncludeJustified(data.include_justified_in_bulletin)}
 }
 useEffect(()=>{void loadSettings()},[establishmentId])

 const currentSlot=slots.find(x=>x.id===selectedSlot)
 const byStudent=new Map(records.filter(r=>r.lesson_key===selectedSlot).map(r=>[r.student_id,r]))
 const pendingRequests=new Map(requests.filter(r=>r.status==="pending").map(r=>[r.attendance_id,r]))
 const totalAbsence=records.reduce((sum,r)=>r.status==="absent"?sum+(currentSlot&&r.lesson_key===currentSlot.id?minutes(currentSlot.starts_at,currentSlot.ends_at):0):sum,0)

 async function saveSettings(){
   if(!establishmentId)return
   const {data:year}=await supabaseBrowser.from("academic_years").select("id").eq("establishment_id",establishmentId).eq("status","active").limit(1).maybeSingle()
   if(!year)return
   const {error}=await supabaseBrowser.from("attendance_summary_settings").upsert({establishment_id:establishmentId,academic_year_id:year.id,reset_period:resetPeriod,include_justified_in_bulletin:includeJustified,updated_at:new Date().toISOString()},{onConflict:"establishment_id,academic_year_id"})
   if(error){setMessage(error.message);return}
   setShowSettings(false);setMessage("Paramètres enregistrés.")
 }

 async function requestJustification(studentId:string){
   const record=byStudent.get(studentId)
   if(!record||record.status==="present")return
   const {data:auth}=await supabaseBrowser.auth.getUser()
   if(!auth.user){setMessage("Session administrative introuvable.");return}
   const {error}=await supabaseBrowser.from("attendance_justification_requests").insert({attendance_id:record.id,student_id:studentId,establishment_id:establishmentId,parent_user_id:auth.user.id,reason:"Demande de justification initiée par l'administration",status:"pending"})
   if(error)setMessage(error.message);else{setMessage("Demande créée.");await load()}
 }

 return <div className="min-h-screen bg-[#faf8ff]">
  <div className="mx-auto max-w-7xl">
   <header className="mb-5 flex flex-col gap-3 border-b border-[#d9dce5] pb-4 md:flex-row md:items-end md:justify-between">
    <div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#1e3a8a]">Vie scolaire</p><h1 className="text-2xl font-semibold text-[#131b2e]">Registre d'appel</h1><p className="mt-1 text-sm text-[#64748b]">Suivi des présences par classe, cours et créneau horaire.</p></div>
    <button onClick={()=>setShowSettings(true)} className="inline-flex items-center gap-2 border border-[#c5c5d3] bg-white px-4 py-2 text-sm font-semibold text-[#334155]"><Settings2 className="h-4 w-4"/>Paramètres</button>
   </header>
   {message&&<div className="mb-4 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
   <div className="grid gap-3 border-y border-[#d9dce5] bg-white p-4 md:grid-cols-[220px_180px_1fr]">
    <label className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Classe<select value={classe} onChange={e=>{setClasse(e.target.value);setSelectedSlot("")}} className="mt-1 h-10 w-full border border-[#c5c5d3] bg-white px-3 text-sm font-normal text-[#131b2e]"><option value="">Sélectionner une classe</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 h-10 w-full border border-[#c5c5d3] bg-white px-3 text-sm font-normal text-[#131b2e]"/></label>
    <div className="flex items-end text-sm text-[#64748b]">{classe?slots.length+" créneau(x) prévu(s)":"Choisissez une classe pour afficher les cours."}</div>
   </div>
   {classe&&<div className="mt-4 border-b border-[#d9dce5] bg-white">
    <div className="flex overflow-x-auto">
     {slots.map(s=><button key={s.id} onClick={()=>setSelectedSlot(s.id)} className={"min-w-[150px] border-r border-[#e5e7eb] px-4 py-3 text-left "+(selectedSlot===s.id?"border-b-2 border-b-[#1e3a8a] bg-[#f7f8fc]":"hover:bg-[#faf8ff]")}><span className="block text-sm font-semibold text-[#131b2e]">{s.subject}</span><span className="mt-1 block text-xs text-[#64748b]">{s.starts_at.slice(0,5)} – {s.ends_at.slice(0,5)}</span></button>)}
    </div>
   </div>}
   {currentSlot&&<section className="mt-4 border border-[#d9dce5] bg-white">
    <div className="flex flex-col gap-2 border-b border-[#d9dce5] px-5 py-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold text-[#131b2e]">{currentSlot.subject} · {currentSlot.starts_at.slice(0,5)} – {currentSlot.ends_at.slice(0,5)}</h2><p className="text-xs text-[#64748b]">{students.length} élève(s)</p></div><div className="text-xs text-[#64748b]">Absence du créneau : <strong className="text-[#131b2e]">{fmt(totalAbsence)}</strong></div></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b border-[#d9dce5] bg-[#f7f8fc] text-left text-xs uppercase tracking-wide text-[#64748b]"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Statut</th><th className="px-5 py-3">Motif</th><th className="px-5 py-3 text-right">Justification</th></tr></thead><tbody className="divide-y divide-[#e5e7eb]">{students.map((s,i)=>{const r=byStudent.get(s.id);const q=r?pendingRequests.get(r.id):undefined;return <tr key={s.id}><td className="px-5 py-4"><span className="mr-2 text-xs text-[#94a3b8]">{i+1}</span><span className="font-medium text-[#131b2e]">{s.last_name} {s.first_name}</span></td><td className="px-5 py-4">{r?<span className={"inline-flex border px-2.5 py-1 text-xs font-semibold "+statusClass(r.status)}>{statusText(r.status)}</span>:<span className="text-xs text-[#94a3b8]">Appel non enregistré</span>}</td><td className="px-5 py-4 text-[#64748b]">{r?.reason??"—"}</td><td className="px-5 py-4 text-right">{q?<span className="text-xs font-medium text-amber-700">Justification en attente</span>:r&&r.status!=="present"?<button onClick={()=>void requestJustification(s.id)} className="border border-[#c5c5d3] px-3 py-1.5 text-xs font-semibold text-[#334155]">Demander une justification</button>:<span className="text-xs text-[#94a3b8]">—</span>}</td></tr>})}</tbody></table></div>
    {!students.length&&!loading&&<div className="px-5 py-10 text-center text-sm text-[#64748b]">Aucun élève inscrit dans cette classe.</div>}
   </section>}
   {!classe&&<div className="mt-10 border border-dashed border-[#c5c5d3] bg-white px-5 py-14 text-center text-sm text-[#64748b]">Sélectionnez une classe pour ouvrir son registre d'appel.</div>}
  </div>
  {showSettings&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/40 p-4"><div className="w-full max-w-lg border border-[#d9dce5] bg-white p-6 shadow-xl"><h2 className="text-lg font-semibold text-[#131b2e]">Paramètres du registre</h2><p className="mt-1 text-sm text-[#64748b]">Détermine la période de cumul des absences utilisée pour les suivis et les futurs bulletins.</p><label className="mt-5 block text-sm font-semibold text-[#334155]">Réinitialisation du cumul<select value={resetPeriod} onChange={e=>setResetPeriod(e.target.value)} className="mt-1 h-10 w-full border border-[#c5c5d3] bg-white px-3 text-sm font-normal text-[#131b2e]"><option value="week">Chaque semaine</option><option value="month">Chaque mois</option><option value="term">À chaque trimestre</option><option value="semester">À chaque semestre</option><option value="year">À chaque année scolaire</option></select></label><label className="mt-4 flex items-start gap-3 text-sm text-[#334155]"><input type="checkbox" checked={includeJustified} onChange={e=>setIncludeJustified(e.target.checked)} className="mt-1"/><span><strong>Inclure les absences justifiées dans le bulletin</strong><span className="block text-xs text-[#64748b]">Désactivé : une absence validée comme justifiée est exclue du cumul des absences non justifiées.</span></span></label><div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowSettings(false)} className="border border-[#c5c5d3] px-4 py-2 text-sm font-semibold text-[#64748b]">Annuler</button><button onClick={()=>void saveSettings()} className="bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white">Enregistrer</button></div></div></div>}
 </div>
}
