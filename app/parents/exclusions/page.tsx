"use client"
import { useEffect,useState } from "react"
import { AlertTriangle,CalendarDays,Clock,ShieldCheck } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

type CourseExclusion={id:string;student_id:string;subject_id:string;lesson_date:string;excluded_at:string;reason:string;scope:string;end_date:string|null;status:string;review_note:string|null;students:{first_name:string;last_name:string}|null}
type AdminExclusion={id:string;student_id:string;reason:string;start_date:string;end_date:string|null;is_permanent:boolean;status:string;students:{first_name:string;last_name:string}|null}
const fmt=(d:string)=>new Date(d+"T12:00:00").toLocaleDateString("fr-FR")
export default function ParentExclusionsPage(){
 const [courses,setCourses]=useState<CourseExclusion[]>([])
 const [admin,setAdmin]=useState<AdminExclusion[]>([])
 const [subjects,setSubjects]=useState<Record<string,string>>({})
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState<string|null>(null)
 useEffect(()=>{
  let active=true
  const load=async()=>{
   setLoading(true);setError(null)
   const [c,a]=await Promise.all([
    supabaseBrowser.from("course_exclusions").select("id,student_id,subject_id,lesson_date,excluded_at,reason,scope,end_date,status,review_note,students(first_name,last_name)").eq("status","approved").order("excluded_at",{ascending:false}),
    supabaseBrowser.from("administrative_exclusions").select("id,student_id,reason,start_date,end_date,is_permanent,status,students(first_name,last_name)").order("created_at",{ascending:false})
   ])
   if(!active)return
   if(c.error||a.error){setError("Impossible de charger les informations disciplinaires.");setCourses([]);setAdmin([]);setLoading(false);return}
   const cr=(c.data??[]) as unknown as CourseExclusion[], ar=(a.data??[]) as unknown as AdminExclusion[]
   setCourses(cr);setAdmin(ar)
   const ids=[...new Set(cr.map(x=>x.subject_id))]
   if(ids.length){const {data}=await supabaseBrowser.from("subjects").select("id,name").in("id",ids);if(active)setSubjects(Object.fromEntries((data??[]).map(x=>[x.id,x.name])))}
   setLoading(false)
  }
  void load()
  const channel=supabaseBrowser.channel("parent-disciplinary-decisions").on("postgres_changes",{event:"*",schema:"public",table:"administrative_exclusions"},()=>{void load()}).on("postgres_changes",{event:"*",schema:"public",table:"course_exclusions"},()=>{void load()}).subscribe()
  return()=>{active=false;void supabaseBrowser.removeChannel(channel)}
 },[])
 const visibleAdmin=admin.filter(x=>x.status==="active"&&(x.is_permanent||!x.end_date||x.end_date>=new Date().toISOString().slice(0,10)))
 const scope=(x:CourseExclusion)=>x.scope==="current_lesson"?"Ce cours uniquement":"Cette matière jusqu’au "+(x.end_date?fmt(x.end_date):"—")
 return <div className="space-y-5">
  <ParentPageHeader eyebrow="Vie scolaire" title="Décisions disciplinaires" description="Consultez les décisions publiées par l’établissement concernant vos enfants."/>
  {error&&<p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <section className="space-y-3"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-blue-700"/>Décisions de l’administration</h2>
   {!loading&&!visibleAdmin.length&&<p className="border border-dashed p-5 text-sm text-slate-500">Aucune exclusion administrative en vigueur.</p>}
   <div className="divide-y border-y border-slate-200 bg-white sm:rounded-xl sm:border">
    {visibleAdmin.map(x=><article key={x.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700"><AlertTriangle className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">Exclusion administrative</h3><span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">Toutes les matières</span></div><p className="mt-1 text-sm text-slate-600">{x.students?x.students.first_name+" "+x.students.last_name:"Votre enfant"}</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-800">{x.reason}</p><p className="mt-3 text-sm font-medium text-slate-700">{x.is_permanent?"Durée : définitive":"Du "+fmt(x.start_date)+" au "+(x.end_date?fmt(x.end_date):"—")}</p></div></div></article>)}
   </div>
  </section>
  <section className="space-y-3"><h2 className="font-semibold text-slate-900">Exclusions signalées par les enseignants</h2>
   {!loading&&!courses.length&&<p className="border border-dashed p-5 text-sm text-slate-500">Aucune exclusion de cours publiée.</p>}
   <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:rounded-xl sm:border">
    {courses.map(x=><article key={x.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">Exclusion de cours</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Validée</span></div><p className="mt-1 text-sm text-slate-600">{x.students?x.students.first_name+" "+x.students.last_name:"Votre enfant"} · {subjects[x.subject_id]??"Cours"}</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-800">{x.reason}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>{fmt(x.lesson_date)}</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{new Date(x.excluded_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span></div><p className="mt-2 text-sm font-medium text-slate-700">Durée : {scope(x)}</p>{x.review_note&&<p className="mt-2 text-xs text-slate-500">Précision de l’administration : {x.review_note}</p>}</div></div></article>)}
   </div>
  </section>
  {loading&&<p className="text-sm text-slate-500">Chargement des informations…</p>}
  {!loading&&!visibleAdmin.length&&!courses.length&&!error&&<ParentEmptyState title="Aucune décision publiée" description="Les décisions disciplinaires communiquées par l’établissement apparaîtront ici."/>}
 </div>
}