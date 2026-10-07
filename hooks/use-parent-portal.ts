"use client"

import { useCallback, useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"

export type ParentChild = { id:string; establishment_id:string; student_number:string|null; first_name:string; last_name:string; birth_date:string|null; sex:string|null; phone:string|null; email:string|null; active:boolean; can_view_academic:boolean; can_view_finance:boolean; relationship:string|null; class_name?:string; class_id?:string; enrollment_id?:string }
export type ParentGrade = { id:string; student_id:string; score:number; comment:string|null; assessment_id:string; title?:string; assessment_date?:string; term?:string; max_score?:number; subject?:string }
export type ParentPayment = { id:string; enrollment_id:string; amount:number; payment_date:string; reference:string|null; method:string|null; notes:string|null }
export type ParentAttendance = { id:string; student_id:string; attendance_date:string; status:string; reason:string|null }
export type ParentJustificationRequest = { id:string; attendance_id:string; student_id:string; reason:string; status:"pending"|"approved"|"rejected"|"cancelled"; reviewer_note:string|null; created_at:string }
export type ParentNotification = { id:string; title:string; body:string; type:string; read_at:string|null; created_at:string }
export type ParentEvent = { id:string; establishment_id:string; title:string; description:string|null; event_type:string; starts_at:string; ends_at:string|null; location:string|null }
export type ParentPaymentSchedule = { id:string; enrollment_id:string; installment_number:number; label:string; due_date:string; amount_due:number; amount_paid:number; status:string; category:string|null }
export type ParentPaymentAllocation = { id:string; payment_id:string; payment_schedule_id:string; amount:number; created_at:string; payment_date?:string }
export type ParentTimetableSlot = { id:string; class_subject_id:string; day_of_week:number; starts_at:string; ends_at:string; room:string|null; class_id:string; subject:string; teacher_id:string|null }
export type ParentLesson = { id:string; timetable_slot_id:string; lesson_date:string; topic:string; content:string; activities:string|null; subject:string; class_id:string }
export type ParentHomework = { id:string; timetable_slot_id:string; class_id:string; subject_id:string; title:string; instructions:string; due_date:string|null; created_at:string; subject:string }
export type ParentDocument = { id:string; publication_id:string; student_id:string; name:string; title:string; document_type:string; mime_type:string|null; size_bytes:number|null; created_at:string; published_at:string; storage_path:string; download_url?:string }
export type ClaimStudentInput = { studentId?:string; studentNumber?:string; birthDate?:string; fromQr?:boolean }

export function useParentPortal() {
  const [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null)
  const [children,setChildren]=useState<ParentChild[]>([]), [grades,setGrades]=useState<ParentGrade[]>([]), [payments,setPayments]=useState<ParentPayment[]>([])
  const [attendance,setAttendance]=useState<ParentAttendance[]>([]), [justificationRequests,setJustificationRequests]=useState<ParentJustificationRequest[]>([])
  const [notifications,setNotifications]=useState<ParentNotification[]>([]), [events,setEvents]=useState<ParentEvent[]>([])
  const [paymentSchedules,setPaymentSchedules]=useState<ParentPaymentSchedule[]>([]), [paymentAllocations,setPaymentAllocations]=useState<ParentPaymentAllocation[]>([])
  const [timetable,setTimetable]=useState<ParentTimetableSlot[]>([]), [lessons,setLessons]=useState<ParentLesson[]>([]), [homework,setHomework]=useState<ParentHomework[]>([]), [documents,setDocuments]=useState<ParentDocument[]>([])

  const refresh=useCallback(async()=>{
    setLoading(true); setError(null)
    try{
      const {data:authData,error:authError}=await supabaseBrowser.auth.getUser()
      if(authError||!authData.user) throw new Error("Session parent introuvable.")
      const userId=authData.user.id
      const {data:links,error:linksError}=await supabaseBrowser.from("student_guardians").select("student_id,establishment_id,relationship,can_view_academic,can_view_finance").eq("guardian_user_id",userId).eq("active",true)
      if(linksError) throw linksError
      const studentIds=(links??[]).map(x=>x.student_id), establishmentIds=[...new Set((links??[]).map(x=>x.establishment_id))]
      const linkMap=new Map((links??[]).map(x=>[x.student_id,x]))
      const n=await supabaseBrowser.from("notifications").select("id,title,body,type,read_at,created_at").eq("recipient_user_id",userId).order("created_at",{ascending:false}).limit(50)
      if(n.error) throw n.error
      setNotifications(n.data??[])
      if(!studentIds.length){setChildren([]);setGrades([]);setPayments([]);setAttendance([]);setJustificationRequests([]);setEvents([]);setPaymentSchedules([]);setPaymentAllocations([]);setTimetable([]);setLessons([]);setHomework([]);setDocuments([]);return}

      const [sr,er,gr,ar,jr,ev]=await Promise.all([
        supabaseBrowser.from("students").select("id,establishment_id,student_number,first_name,last_name,birth_date,sex,phone,email,active").in("id",studentIds).order("last_name").limit(100),
        supabaseBrowser.from("enrollments").select("id,student_id,class_id,status").in("student_id",studentIds).eq("status","active").limit(200),
        supabaseBrowser.from("grades").select("id,student_id,score,comment,assessment_id,created_at").in("student_id",studentIds).order("created_at",{ascending:false}).limit(500),
        supabaseBrowser.from("attendance_records").select("id,student_id,attendance_date,status,reason").in("student_id",studentIds).order("attendance_date",{ascending:false}).limit(500),
        supabaseBrowser.from("attendance_justification_requests").select("id,attendance_id,student_id,reason,status,reviewer_note,created_at").order("created_at",{ascending:false}).limit(200),
        establishmentIds.length?supabaseBrowser.from("school_events").select("id,establishment_id,title,description,event_type,starts_at,ends_at,location").in("establishment_id",establishmentIds).order("starts_at").limit(100):Promise.resolve({data:[],error:null})
      ])
      for(const r of [sr,er,gr,ar,jr,ev]) if(r.error) throw r.error
      const enrollments=er.data??[], classIds=[...new Set(enrollments.map(x=>x.class_id).filter(Boolean))], assessmentIds=[...new Set((gr.data??[]).map(x=>x.assessment_id))]
      const [cr,asr]=await Promise.all([
        classIds.length?supabaseBrowser.from("school_classes").select("id,name").in("id",classIds):Promise.resolve({data:[],error:null}),
        assessmentIds.length?supabaseBrowser.from("assessments").select("id,title,assessment_date,term,max_score,subject_id").in("id",assessmentIds):Promise.resolve({data:[],error:null})
      ])
      if(cr.error) throw cr.error; if(asr.error) throw asr.error
      const subjectIds=[...new Set((asr.data??[]).map(x=>x.subject_id).filter(Boolean))]
      const subr=subjectIds.length?await supabaseBrowser.from("subjects").select("id,name").in("id",subjectIds):{data:[],error:null}
      if(subr.error) throw subr.error
      const classMap=new Map((cr.data??[]).map(x=>[x.id,x.name])), assessmentMap=new Map((asr.data??[]).map(x=>[x.id,x])), subjectMap=new Map((subr.data??[]).map(x=>[x.id,x.name]))
      const enrollmentMap=new Map(enrollments.map(x=>[x.student_id,x])), enrollmentStudentMap=new Map(enrollments.map(x=>[x.id,x.student_id]))
      setChildren((sr.data??[]).map(s=>{const e=enrollmentMap.get(s.id),l=linkMap.get(s.id);return {...s,relationship:l?.relationship??null,can_view_academic:l?.can_view_academic??false,can_view_finance:l?.can_view_finance??false,class_id:e?.class_id,class_name:e?.class_id?classMap.get(e.class_id):undefined,enrollment_id:e?.id}}))
      setGrades((gr.data??[]).filter(g=>linkMap.get(g.student_id)?.can_view_academic).map(g=>{const a=assessmentMap.get(g.assessment_id);return {...g,score:Number(g.score),title:a?.title,assessment_date:a?.assessment_date,term:a?.term,max_score:a?.max_score?Number(a.max_score):undefined,subject:a?.subject_id?subjectMap.get(a.subject_id):undefined}}))
      const financeEnrollmentIds=enrollments.filter(e=>linkMap.get(e.student_id)?.can_view_finance).map(e=>e.id), academicClassIds=enrollments.filter(e=>linkMap.get(e.student_id)?.can_view_academic).map(e=>e.class_id).filter(Boolean)
      const paymentsR=financeEnrollmentIds.length?await supabaseBrowser.from("payments").select("id,enrollment_id,amount,payment_date,reference,method,notes").in("enrollment_id",financeEnrollmentIds).order("payment_date",{ascending:false}).limit(500):{data:[],error:null}
      if(paymentsR.error) throw paymentsR.error
      const paymentIds=(paymentsR.data??[]).map(x=>x.id)
      const [psr,par,tsr,tlr,thr,pdr]=await Promise.all([
        financeEnrollmentIds.length?supabaseBrowser.from("payment_schedules").select("id,enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,category").in("enrollment_id",financeEnrollmentIds).order("due_date"):Promise.resolve({data:[],error:null}),
        paymentIds.length?supabaseBrowser.from("payment_allocations").select("id,payment_id,payment_schedule_id,amount,created_at").in("payment_id",paymentIds):Promise.resolve({data:[],error:null}),
        academicClassIds.length?supabaseBrowser.from("timetable_slots").select("id,class_subject_id,day_of_week,starts_at,ends_at,room").in("establishment_id",establishmentIds).order("day_of_week").order("starts_at"):Promise.resolve({data:[],error:null}),
        academicClassIds.length?supabaseBrowser.from("teacher_lesson_entries").select("id,timetable_slot_id,lesson_date,topic,content,activities").in("establishment_id",establishmentIds).order("lesson_date",{ascending:false}).limit(300):Promise.resolve({data:[],error:null}),
        academicClassIds.length?supabaseBrowser.from("teacher_homework").select("id,timetable_slot_id,class_id,subject_id,title,instructions,due_date,created_at").in("class_id",academicClassIds).eq("active",true).order("due_date").limit(300):Promise.resolve({data:[],error:null}),
        supabaseBrowser.from("parent_document_publications").select("id,student_id,document_id,published_at,title_override").in("student_id",studentIds).eq("active",true).order("published_at",{ascending:false}).limit(200)
      ])
      for(const r of [psr,par,tsr,tlr,thr,pdr]) if(r.error) throw r.error
      const slotRows=tsr.data??[], csIds=[...new Set(slotRows.map(x=>x.class_subject_id))], hwSubjectIds=[...new Set((thr.data??[]).map(x=>x.subject_id))]
      const allSubjectIds=[...new Set([...subjectIds,...hwSubjectIds])]
      const [csr,tsubr,dr]=await Promise.all([
        csIds.length?supabaseBrowser.from("class_subjects").select("id,class_id,subject_id,teacher_id").in("id",csIds):Promise.resolve({data:[],error:null}),
        allSubjectIds.length?supabaseBrowser.from("subjects").select("id,name").in("id",allSubjectIds):Promise.resolve({data:[],error:null}),
        (pdr.data??[]).length?supabaseBrowser.from("documents").select("id,name,document_type,mime_type,size_bytes,created_at,storage_path").in("id",(pdr.data??[]).map(x=>x.document_id)):Promise.resolve({data:[],error:null})
      ])
      for(const r of [csr,tsubr,dr]) if(r.error) throw r.error
      const csMap=new Map((csr.data??[]).map(x=>[x.id,x])), names=new Map((tsubr.data??[]).map(x=>[x.id,x.name]))
      const visibleSlots=slotRows.filter(s=>academicClassIds.includes(csMap.get(s.class_subject_id)?.class_id??"")), visibleSlotIds=new Set(visibleSlots.map(s=>s.id))
      setTimetable(visibleSlots.map(s=>{const cs=csMap.get(s.class_subject_id);return {...s,class_id:cs?.class_id??"",subject:cs?.subject_id?names.get(cs.subject_id)??"Matière":"Matière",teacher_id:cs?.teacher_id??null}}))
      setLessons((tlr.data??[]).filter(x=>visibleSlotIds.has(x.timetable_slot_id)).map(x=>{const slot=slotRows.find(s=>s.id===x.timetable_slot_id),cs=slot?csMap.get(slot.class_subject_id):undefined;return {...x,subject:cs?.subject_id?names.get(cs.subject_id)??"Matière":"Matière",class_id:cs?.class_id??""}}))
      setHomework((thr.data??[]).filter(x=>academicClassIds.includes(x.class_id)).map(x=>({...x,subject:names.get(x.subject_id)??"Matière"})))
      setPayments((paymentsR.data??[]).filter(p=>enrollmentStudentMap.has(p.enrollment_id)).map(p=>({...p,amount:Number(p.amount)})))
      setPaymentSchedules((psr.data??[]).map(x=>({...x,amount_due:Number(x.amount_due),amount_paid:Number(x.amount_paid)})))
      setPaymentAllocations((par.data??[]).map(x=>({...x,amount:Number(x.amount),payment_date:(paymentsR.data??[]).find(p=>p.id===x.payment_id)?.payment_date})))
      const pubMap=new Map((pdr.data??[]).map(x=>[x.document_id,x])), docs:ParentDocument[]=[]
      for(const d of dr.data??[]){const p=pubMap.get(d.id);if(!p||!linkMap.get(p.student_id)?.can_view_academic)continue;let url:string|undefined;if(d.storage_path){const s=await supabaseBrowser.storage.from("school-documents").createSignedUrl(d.storage_path,300);if(!s.error)url=s.data.signedUrl}docs.push({...d,publication_id:p.id,student_id:p.student_id,title:p.title_override??d.name,published_at:p.published_at,size_bytes:d.size_bytes?Number(d.size_bytes):null,download_url:url})}
      setDocuments(docs); setAttendance((ar.data??[]).filter(x=>linkMap.get(x.student_id)?.can_view_academic)); setJustificationRequests((jr.data??[]) as ParentJustificationRequest[]); setEvents(ev.data??[])
    }catch(cause){console.error("Parent portal error:",cause);setError(cause instanceof Error?cause.message:"Impossible de charger vos informations.")}
    finally{setLoading(false)}
  },[])

  const claimChild=useCallback(async(input:ClaimStudentInput)=>{
    const studentNumber=input.studentNumber?.trim(),studentId=input.studentId?.trim(),birthDate=input.birthDate?.trim()
    if((!studentNumber&&!studentId)||(!input.fromQr&&!birthDate))throw new Error("L'identifiant et la date de naissance sont obligatoires en saisie manuelle.")
    const {data,error}=await supabaseBrowser.functions.invoke("claim-student",{body:{student_id:studentId||undefined,student_number:studentNumber||undefined,birth_date:birthDate||undefined}})
    if(error)throw error
    if(!data?.linked||!data?.student?.id)throw new Error("Le rattachement de l'élève n'a pas été confirmé.")
    const linkedStudent=data.student as {id:string;establishment_id:string;student_number:string|null;first_name:string;last_name:string}
    // Recharge d'abord les données serveur. Si le refresh retourne momentanément
    // une liste vide (RLS/session en cours de synchronisation), on conserve ensuite
    // le rattachement confirmé par l'Edge Function au lieu de l'écraser.
    await refresh()
    setChildren(current=>{
      const existing=current.find(child=>child.id===linkedStudent.id)
      if(existing) return current
      return [...current,{
        id:linkedStudent.id, establishment_id:linkedStudent.establishment_id,
        student_number:linkedStudent.student_number??null, first_name:linkedStudent.first_name,
        last_name:linkedStudent.last_name, birth_date:birthDate, sex:null, phone:null, email:null,
        active:true, can_view_academic:true, can_view_finance:true, relationship:"Parent",
      }]
    })
    return data
  },[refresh])
  const unclaimChild=useCallback(async(studentId:string)=>{const {data,error}=await supabaseBrowser.rpc("unclaim_student",{p_student_id:studentId.trim()});if(error)throw error;if(data!==true)throw new Error("Cette association n'est plus active ou n'appartient pas à votre compte.");setChildren(c=>c.filter(x=>x.id!==studentId));return true},[])
  const requestAttendanceJustification=useCallback(async(a:ParentAttendance,reason:string)=>{const r=reason.trim();const child=children.find(x=>x.id===a.student_id);if(r.length<3||r.length>2000)throw new Error("Le motif doit contenir entre 3 et 2000 caractères.");if(!child?.can_view_academic)throw new Error("Vous n'êtes pas autorisé à justifier cette absence.");const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const {data,error}=await supabaseBrowser.from("attendance_justification_requests").insert({attendance_id:a.id,student_id:a.student_id,establishment_id:child.establishment_id,parent_user_id:u.user.id,reason:r}).select("id,attendance_id,student_id,reason,status,reviewer_note,created_at").single();if(error)throw error;setJustificationRequests(c=>[data as ParentJustificationRequest,...c]);return data},[children])
  const cancelAttendanceJustification=useCallback(async(id:string)=>{const {error}=await supabaseBrowser.from("attendance_justification_requests").update({status:"cancelled"}).eq("id",id).eq("status","pending");if(error)throw error;setJustificationRequests(c=>c.map(x=>x.id===id?{...x,status:"cancelled"}:x))},[])
  const markNotificationRead=useCallback(async(id:string)=>{const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const now=new Date().toISOString();const {error}=await supabaseBrowser.from("notifications").update({read_at:now}).eq("id",id).eq("recipient_user_id",u.user.id);if(error)throw error;setNotifications(c=>c.map(x=>x.id===id?{...x,read_at:now}:x))},[])
  const markAllNotificationsRead=useCallback(async()=>{const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const now=new Date().toISOString();const {error}=await supabaseBrowser.from("notifications").update({read_at:now}).eq("recipient_user_id",u.user.id).is("read_at",null);if(error)throw error;setNotifications(c=>c.map(x=>x.read_at?x:{...x,read_at:now}))},[])
  useEffect(()=>{void refresh()},[refresh])
  return {loading,error,refresh,children,grades,payments,attendance,justificationRequests,notifications,events,paymentSchedules,paymentAllocations,timetable,lessons,homework,documents,claimChild,unclaimChild,requestAttendanceJustification,cancelAttendanceJustification,markNotificationRead,markAllNotificationsRead}
}
