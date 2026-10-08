"use client"

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"

export type ParentChild = { id:string; establishment_id:string; student_number:string|null; first_name:string; last_name:string; birth_date:string|null; sex:string|null; phone:string|null; email:string|null; active:boolean; can_view_academic:boolean; can_view_finance:boolean; relationship:string|null; class_name?:string; class_id?:string; level_name?:string; level_code?:string; cycle_name?:string; enrollment_id?:string; academic_year_id?:string; academic_year_name?:string; payment_mode?:string; installment_count?:number }
export type ParentGrade = { id:string; student_id:string; score:number; comment:string|null; assessment_id:string; title?:string; assessment_date?:string; term?:string; max_score?:number; subject?:string }
export type ParentPayment = { id:string; enrollment_id:string; amount:number; payment_date:string; reference:string|null; method:string|null; notes:string|null; category?:string|null; payer_type?:string|null }
export type ParentAttendance = { id:string; student_id:string; attendance_date:string; status:string; reason:string|null }
export type ParentJustificationRequest = { id:string; attendance_id:string; student_id:string; reason:string; status:"pending"|"approved"|"rejected"|"cancelled"; reviewer_note:string|null; created_at:string }
export type ParentNotification = { id:string; title:string; body:string; type:string; read_at:string|null; created_at:string }
export type ParentEvent = { id:string; establishment_id:string; title:string; description:string|null; event_type:string; starts_at:string; ends_at:string|null; location:string|null }
export type ParentPaymentSchedule = { id:string; enrollment_id:string; installment_number:number; label:string; due_date:string; amount_due:number; amount_paid:number; status:string; category:string|null; payer_type?:string|null }
export type ParentPaymentAllocation = { id:string; payment_id:string; payment_schedule_id:string; amount:number; created_at:string; payment_date?:string }
export type ParentEnrollmentOption = { id:string; enrollment_id:string; option_id:string; amount:number; name:string; description:string|null; option_type:string|null; required:boolean }
export type ParentTimetableSlot = { id:string; class_subject_id:string; day_of_week:number; starts_at:string; ends_at:string; room:string|null; class_id:string; subject:string; teacher_id:string|null }
export type ParentLesson = { id:string; timetable_slot_id:string; lesson_date:string; topic:string; content:string; activities:string|null; subject:string; class_id:string }
export type ParentHomework = { id:string; timetable_slot_id:string; class_id:string; subject_id:string; title:string; instructions:string; due_date:string|null; created_at:string; subject:string }
export type ParentDocument = { id:string; publication_id:string; student_id:string; name:string; title:string; document_type:string; mime_type:string|null; size_bytes:number|null; created_at:string; published_at:string; storage_path:string; download_url?:string }
export type ClaimStudentInput = { studentId?:string; studentNumber?:string; birthDate?:string; fromQr?:boolean }

const PARENT_CHILDREN_CACHE_KEY = "parent-portal:linked-children"

function readCachedChildren(): ParentChild[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(PARENT_CHILDREN_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedChildren(children: ParentChild[]) {
  if (typeof window === "undefined") return
  try { window.localStorage.setItem(PARENT_CHILDREN_CACHE_KEY, JSON.stringify(children)) } catch {}
}

function useParentPortalState() {
  const [loading,setLoading]=useState(true), [error,setError]=useState<string|null>(null)
  const [children,setChildren]=useState<ParentChild[]>([]), [grades,setGrades]=useState<ParentGrade[]>([]), [payments,setPayments]=useState<ParentPayment[]>([])
  const [attendance,setAttendance]=useState<ParentAttendance[]>([]), [justificationRequests,setJustificationRequests]=useState<ParentJustificationRequest[]>([])
  const [notifications,setNotifications]=useState<ParentNotification[]>([]), [events,setEvents]=useState<ParentEvent[]>([])
  const [paymentSchedules,setPaymentSchedules]=useState<ParentPaymentSchedule[]>([]), [paymentAllocations,setPaymentAllocations]=useState<ParentPaymentAllocation[]>([]), [enrollmentOptions,setEnrollmentOptions]=useState<ParentEnrollmentOption[]>([])
  const [timetable,setTimetable]=useState<ParentTimetableSlot[]>([]), [lessons,setLessons]=useState<ParentLesson[]>([]), [homework,setHomework]=useState<ParentHomework[]>([]), [documents,setDocuments]=useState<ParentDocument[]>([])

  const refresh=useCallback(async()=>{
    setLoading(true); setError(null)
    try{
      const {data:authData,error:authError}=await supabaseBrowser.auth.getUser()
      if(authError||!authData.user) throw new Error("Session parent introuvable.")
      const userId=authData.user.id

      // Source de vérité des enfants : Edge Function authentifiée.
      // Le serveur vérifie le compte parent et lit uniquement ses associations.
      const {data:linkedData,error:linkedError}=await supabaseBrowser.functions.invoke("get-parent-children")
      if(linkedError) throw linkedError
      const linkedChildren=Array.isArray(linkedData?.children) ? linkedData.children as ParentChild[] : []
      const studentIds=linkedChildren.map(x=>x.id)
      const establishmentIds=Array.isArray(linkedData?.establishment_ids)
        ? linkedData.establishment_ids as string[]
        : [...new Set(linkedChildren.map(x=>x.establishment_id))]
      const linkMap=new Map(linkedChildren.map(x=>[x.id,x]))
      if(!studentIds.length){
        const cached=readCachedChildren()
        if(cached.length){setChildren(cached);setLoading(false);return}
        setChildren([]);setGrades([]);setPayments([]);setAttendance([]);setJustificationRequests([]);setEvents([]);setPaymentSchedules([]);setPaymentAllocations([]);setEnrollmentOptions([]);setTimetable([]);setLessons([]);setHomework([]);setDocuments([]);return
      }

      const {data:er,error:enrollmentError}=await supabaseBrowser.from("enrollments").select("id,student_id,class_id,status,tuition_plan_id,academic_year_id").in("student_id",studentIds).eq("status","active").limit(200)
      if(enrollmentError) throw enrollmentError
      const enrollments=er??[]
      const classIds=[...new Set(enrollments.map(x=>x.class_id).filter(Boolean))]
      const {data:classRows,error:classError}=classIds.length
        ?await supabaseBrowser.from("school_classes").select("id,name,grade_level_id").in("id",classIds)
        :{data:[],error:null}
      if(classError) throw classError

      const classMap=new Map((classRows??[]).map(x=>[x.id,x]))
      const enrollmentMap=new Map(enrollments.map(x=>[x.student_id,x]))
      const enrollmentStudentMap=new Map(enrollments.map(x=>[x.id,x.student_id]))

      const academicYearIds=[...new Set(enrollments.map(x=>x.academic_year_id).filter(Boolean))]
      const {data:academicYears,error:academicYearsError}=academicYearIds.length
        ?await supabaseBrowser.from("academic_years").select("id,name").in("id",academicYearIds)
        :{data:[],error:null}
      if(academicYearsError) throw academicYearsError
      const academicYearMap=new Map((academicYears??[]).map(x=>[x.id,x.name]))

      const gradeLevelIds=[...new Set((classRows??[]).map(x=>x.grade_level_id).filter(Boolean))]
      const {data:gradeLevels,error:gradeLevelsError}=gradeLevelIds.length
        ?await supabaseBrowser.from("grade_levels").select("id,name,code,cycle_id").in("id",gradeLevelIds)
        :{data:[],error:null}
      if(gradeLevelsError) throw gradeLevelsError

      const cycleIds=[...new Set((gradeLevels??[]).map(x=>x.cycle_id).filter(Boolean))]
      const {data:cycles,error:cyclesError}=cycleIds.length
        ?await supabaseBrowser.from("education_cycles").select("id,name").in("id",cycleIds)
        :{data:[],error:null}
      if(cyclesError) throw cyclesError

      const gradeMap=new Map((gradeLevels??[]).map(x=>[x.id,x]))
      const cycleMap=new Map((cycles??[]).map(x=>[x.id,x.name]))

      const tuitionPlanIds=[...new Set(enrollments.map(x=>x.tuition_plan_id).filter(Boolean))]
      const {data:tuitionPlans,error:tuitionPlansError}=tuitionPlanIds.length
        ?await supabaseBrowser.from("tuition_plans").select("id,grade_level_id,academic_year_id,payment_mode,installment_count,annual_tuition").in("id",tuitionPlanIds)
        :{data:[],error:null}
      if(tuitionPlansError) throw tuitionPlansError

      const tuitionPlanMap=new Map((tuitionPlans??[]).map(x=>[x.id,x]))
      const fallbackPairs=enrollments
        .filter(e=>!e.tuition_plan_id)
        .map(e=>({gradeLevelId:classMap.get(e.class_id)?.grade_level_id,academicYearId:e.academic_year_id}))
        .filter(x=>x.gradeLevelId&&x.academicYearId)

      const fallbackResults=await Promise.all(
        fallbackPairs.map(pair=>supabaseBrowser.from("tuition_plans").select("id,grade_level_id,academic_year_id,payment_mode,installment_count,annual_tuition").eq("grade_level_id",pair.gradeLevelId).eq("academic_year_id",pair.academicYearId).eq("active",true).limit(1))
      )
      for(const result of fallbackResults) if(result.error) throw result.error
      const fallbackPlans=fallbackResults.flatMap(result=>result.data??[])
      const allTuitionPlans=[...(tuitionPlans??[]),...fallbackPlans]
      const tuitionPlanByLevelYear=new Map(allTuitionPlans.map(plan=>[`${plan.grade_level_id}:${plan.academic_year_id}`,plan]))

      const resolvedChildren=linkedChildren.map(s=>{
        const enrollment=enrollmentMap.get(s.id)
        const schoolClass=enrollment?.class_id?classMap.get(enrollment.class_id):undefined
        const level=schoolClass?.grade_level_id?gradeMap.get(schoolClass.grade_level_id):undefined
        const plan=enrollment?.tuition_plan_id
          ?tuitionPlanMap.get(enrollment.tuition_plan_id)
          :(schoolClass?.grade_level_id&&enrollment?.academic_year_id
            ?tuitionPlanByLevelYear.get(`${schoolClass.grade_level_id}:${enrollment.academic_year_id}`)
            :undefined)

        return {
          ...s,
          class_id:enrollment?.class_id??s.class_id,
          class_name:schoolClass?.name??s.class_name,
          level_name:level?.name??s.level_name,
          level_code:level?.code??s.level_code,
          cycle_name:level?.cycle_id?cycleMap.get(level.cycle_id)??s.cycle_name:s.cycle_name,
          enrollment_id:enrollment?.id??s.enrollment_id,
          academic_year_id:enrollment?.academic_year_id??s.academic_year_id,
          academic_year_name:enrollment?.academic_year_id?academicYearMap.get(enrollment.academic_year_id)??s.academic_year_name:s.academic_year_name,
          payment_mode:plan?.payment_mode??s.payment_mode,
          installment_count:plan?.installment_count??s.installment_count,
        }
      })
      setChildren(resolvedChildren)
      writeCachedChildren(resolvedChildren)

      // Les informations des enfants sont indépendantes du reste du portail.
      // Ne pas bloquer leur affichage si une requête secondaire échoue.
      try{
      const {data:gradeRows,error:gradeError}=await supabaseBrowser.from("grades").select("id,student_id,score,comment,assessment_id,created_at").in("student_id",studentIds).order("created_at",{ascending:false}).limit(500)
      if(gradeError) console.warn("Parent grades query:", gradeError)
      const assessmentIds=[...new Set((gradeRows??[]).map(g=>g.assessment_id).filter(Boolean))]
      const {data:assessmentRows,error:assessmentError}=assessmentIds.length
        ?await supabaseBrowser.from("assessments").select("id,title,assessment_date,term,max_score,subject_id").in("id",assessmentIds)
        :{data:[],error:null}
      if(assessmentError) console.warn("Parent assessments query:", assessmentError)
      const asr={data:assessmentRows??[],error:null}
      const subjectIds=[...new Set((asr.data??[]).map(x=>x.subject_id).filter(Boolean))]
      const subr=subjectIds.length?await supabaseBrowser.from("subjects").select("id,name").in("id",subjectIds):{data:[],error:null}
      if(subr.error) console.warn("Parent subjects query:", subr.error)
      const assessmentMap=new Map((asr.data??[]).map(x=>[x.id,x])), subjectMap=new Map((subr.data??[]).map(x=>[x.id,x.name]))

      const n=await supabaseBrowser.from("notifications").select("id,title,body,type,read_at,created_at").eq("recipient_user_id",userId).order("created_at",{ascending:false}).limit(50)
      if(!n.error) setNotifications(n.data??[])

      const [gr,ar,jr,ev]=await Promise.all([
        Promise.resolve({data:gradeRows,error:null}),
        supabaseBrowser.from("attendance_records").select("id,student_id,attendance_date,status,reason").in("student_id",studentIds).order("attendance_date",{ascending:false}).limit(500),
        supabaseBrowser.from("attendance_justification_requests").select("id,attendance_id,student_id,reason,status,reviewer_note,created_at").order("created_at",{ascending:false}).limit(200),
        establishmentIds.length?supabaseBrowser.from("school_events").select("id,establishment_id,title,description,event_type,starts_at,ends_at,location").in("establishment_id",establishmentIds).order("starts_at").limit(100):Promise.resolve({data:[],error:null})
      ])
      setGrades((gr.data??[]).filter(g=>linkMap.get(g.student_id)?.can_view_academic).map(g=>{const a=assessmentMap.get(g.assessment_id);return {...g,score:Number(g.score),title:a?.title,assessment_date:a?.assessment_date,term:a?.term,max_score:a?.max_score?Number(a.max_score):undefined,subject:a?.subject_id?subjectMap.get(a.subject_id):undefined}}))
      const financeEnrollments=enrollments.filter(e=>linkMap.get(e.student_id)?.can_view_finance), financeEnrollmentIds=financeEnrollments.map(e=>e.id), academicClassIds=enrollments.filter(e=>linkMap.get(e.student_id)?.can_view_academic).map(e=>e.class_id).filter(Boolean)
      const paymentsR=financeEnrollmentIds.length?await supabaseBrowser.from("payments").select("id,enrollment_id,amount,payment_date,reference,method,notes,category,payer_type").in("enrollment_id",financeEnrollmentIds).order("payment_date",{ascending:false}).limit(500):{data:[],error:null}
      if(paymentsR.error) console.warn("Parent payments query:", paymentsR.error)
      const paymentIds=(paymentsR.data??[]).map(x=>x.id)
      const [psr,par,eor,tsr,tlr,thr,pdr]=await Promise.all([
        financeEnrollmentIds.length?supabaseBrowser.from("payment_schedules").select("id,enrollment_id,installment_number,label,due_date,amount_due,amount_paid,status,category").in("enrollment_id",financeEnrollmentIds).order("due_date"):Promise.resolve({data:[],error:null}),
        paymentIds.length?supabaseBrowser.from("payment_allocations").select("id,payment_id,payment_schedule_id,amount,created_at").in("payment_id",paymentIds):Promise.resolve({data:[],error:null}),
        financeEnrollmentIds.length?supabaseBrowser.from("enrollment_options").select("id,enrollment_id,option_id,amount").in("enrollment_id",financeEnrollmentIds):Promise.resolve({data:[],error:null}),
        // Emploi du temps : filtre directement par class_id (connus depuis les enrollments)
        // + JOIN inline avec class_subjects pour récupérer subject_id et teacher_id en une seule requête
        // Cela évite la dépendance à csMap (qui était vide si la RLS sur class_subjects bloquait)
        academicClassIds.length
          ? supabaseBrowser
              .from("timetable_slots")
              .select("id,class_subject_id,day_of_week,starts_at,ends_at,room,class_subjects!inner(class_id,subject_id,teacher_id)")
              .in("class_subjects.class_id", academicClassIds)
              .order("day_of_week")
              .order("starts_at")
          : Promise.resolve({data:[],error:null}),
        academicClassIds.length?supabaseBrowser.from("teacher_lesson_entries").select("id,timetable_slot_id,lesson_date,topic,content,activities").in("establishment_id",establishmentIds).order("lesson_date",{ascending:false}).limit(300):Promise.resolve({data:[],error:null}),
        academicClassIds.length?supabaseBrowser.from("teacher_homework").select("id,timetable_slot_id,class_id,subject_id,title,instructions,due_date,created_at").in("class_id",academicClassIds).eq("active",true).order("due_date").limit(300):Promise.resolve({data:[],error:null}),
        supabaseBrowser.from("parent_document_publications").select("id,student_id,document_id,published_at,title_override").in("student_id",studentIds).eq("active",true).order("published_at",{ascending:false}).limit(200)
      ])
      for(const [name,r] of [["payment_schedules",psr],["payment_allocations",par],["enrollment_options",eor],["timetable",tsr],["lessons",tlr],["homework",thr],["documents",pdr]] as const) if(r.error) console.warn("Parent "+name+" query:",r.error)
      const optionIds=[...new Set((eor.data??[]).map(x=>x.option_id).filter(Boolean))]
      const optionRows=optionIds.length?await supabaseBrowser.from("student_options").select("id,name,description,option_type,required").in("id",optionIds):{data:[],error:null}
      if(optionRows.error) console.warn("Parent student options query:", optionRows.error)
      setEnrollmentOptions((eor.data??[]).map(x=>({
        id:x.id,
        enrollment_id:x.enrollment_id,
        option_id:x.option_id,
        amount:Number(x.amount),
        name:(optionRows.data??[]).find(option=>option.id===x.option_id)?.name??"Option",
        description:(optionRows.data??[]).find(option=>option.id===x.option_id)?.description??null,
        option_type:(optionRows.data??[]).find(option=>option.id===x.option_id)?.option_type??null,
        required:Boolean((optionRows.data??[]).find(option=>option.id===x.option_id)?.required),
      })))
      // slotRows contient déjà class_subjects grâce au !inner join dans la requête
      // On construit csMap depuis ces données embarquées (plus fiable que la requête séparée)
      const slotRows=(tsr.data??[]) as any[]
      // csMap depuis les données embarquées dans chaque slot row
      const embeddedCsMap=new Map(slotRows.map(x=>[x.class_subject_id, x.class_subjects as {class_id:string;subject_id:string;teacher_id:string|null}|undefined]))
      // Garder la requête class_subjects séparée uniquement pour les slots si nécessaire (fallback)
      const csIds=[...new Set(slotRows.filter(x=>!x.class_subjects).map((x:any)=>x.class_subject_id))]
      const hwSubjectIds=[...new Set((thr.data??[]).map(x=>x.subject_id))]
      const allSubjectIds=[...new Set([...subjectIds,...hwSubjectIds])]
      const [csr,tsubr,dr]=await Promise.all([
        csIds.length?supabaseBrowser.from("class_subjects").select("id,class_id,subject_id,teacher_id").in("id",csIds):Promise.resolve({data:[],error:null}),
        allSubjectIds.length?supabaseBrowser.from("subjects").select("id,name").in("id",allSubjectIds):Promise.resolve({data:[],error:null}),
        (pdr.data??[]).length?supabaseBrowser.from("documents").select("id,name,document_type,mime_type,size_bytes,created_at,storage_path").in("id",(pdr.data??[]).map(x=>x.document_id)):Promise.resolve({data:[],error:null})
      ])
      for(const [name,r] of [["class_subjects",csr],["subjects",tsubr],["documents",dr]] as const) if(r.error) console.warn("Parent "+name+" query:",r.error)
      // Fusionner : données embarquées en priorité, fallback sur requête séparée
      const fallbackCsMap=new Map((csr.data??[]).map(x=>[x.id,x]))
      const csMap=new Map(slotRows.map((x:any)=>[x.class_subject_id, x.class_subjects ?? fallbackCsMap.get(x.class_subject_id)]))
      const names=new Map((tsubr.data??[]).map(x=>[x.id,x.name]))
      const visibleSlots=slotRows.filter(s=>academicClassIds.includes((csMap.get(s.class_subject_id) as any)?.class_id??"")), visibleSlotIds=new Set(visibleSlots.map((s:any)=>s.id))
      setTimetable(visibleSlots.map((s:any)=>{const cs=csMap.get(s.class_subject_id) as any;return {...s,class_id:cs?.class_id??"",subject:cs?.subject_id?names.get(cs.subject_id)??"Matière":"Matière",teacher_id:cs?.teacher_id??null}}))
      setLessons((tlr.data??[]).filter(x=>visibleSlotIds.has(x.timetable_slot_id)).map(x=>{const slot=slotRows.find(s=>s.id===x.timetable_slot_id),cs=slot?csMap.get(slot.class_subject_id):undefined;return {...x,subject:cs?.subject_id?names.get(cs.subject_id)??"Matière":"Matière",class_id:cs?.class_id??""}}))
      setHomework((thr.data??[]).filter(x=>academicClassIds.includes(x.class_id)).map(x=>({...x,subject:names.get(x.subject_id)??"Matière"})))
      setPayments((paymentsR.data??[]).filter(p=>enrollmentStudentMap.has(p.enrollment_id)).map(p=>({...p,amount:Number(p.amount)})))
      setPaymentSchedules((psr.data??[]).map(x=>({...x,amount_due:Number(x.amount_due),amount_paid:Number(x.amount_paid)})))
      setPaymentAllocations((par.data??[]).map(x=>({...x,amount:Number(x.amount),payment_date:(paymentsR.data??[]).find(p=>p.id===x.payment_id)?.payment_date})))
      setAttendance((ar.data??[]).filter(x=>linkMap.get(x.student_id)?.can_view_academic))
      setJustificationRequests((jr.data??[]) as ParentJustificationRequest[])
      setEvents(ev.data??[])

      // Les documents sont secondaires : une erreur de document/storage ne doit jamais masquer
      // les paiements, la présence ou l'emploi du temps déjà récupérés.
      try {
        const pubMap=new Map((pdr.data??[]).map(x=>[x.document_id,x])), docs:ParentDocument[]=[]
        for(const d of dr.data??[]){const p=pubMap.get(d.id);if(!p||!linkMap.get(p.student_id)?.can_view_academic)continue;let url:string|undefined;if(d.storage_path){const s=await supabaseBrowser.storage.from("school-documents").createSignedUrl(d.storage_path,300);if(!s.error)url=s.data.signedUrl}docs.push({...d,publication_id:p.id,student_id:p.student_id,title:p.title_override??d.name,published_at:p.published_at,size_bytes:d.size_bytes?Number(d.size_bytes):null,download_url:url})}
        setDocuments(docs)
      } catch(documentCause) {
        console.warn("Parent portal documents error:",documentCause)
        setDocuments([])
      }
      }catch(secondaryCause){
        console.warn("Parent portal secondary data error:",secondaryCause)
      }
    }catch(cause){console.error("Parent portal error:",cause);setError(cause instanceof Error?cause.message:"Impossible de charger vos informations.")}
    finally{setLoading(false)}
  },[])

  const claimChild=useCallback(async(input:ClaimStudentInput)=>{
    const studentNumber=input.studentNumber?.trim(),studentId=input.studentId?.trim(),birthDate=input.birthDate?.trim()
    if((!studentNumber&&!studentId)||(!input.fromQr&&!birthDate))throw new Error("L'identifiant et la date de naissance sont obligatoires en saisie manuelle.")
    const {data,error}=await supabaseBrowser.functions.invoke("claim-student",{body:{student_id:studentId||undefined,student_number:studentNumber||undefined,birth_date:birthDate||undefined,from_qr:input.fromQr===true}})
    if(error)throw error
    if(!data?.linked||!data?.student?.id)throw new Error("Le rattachement de l'élève n'a pas été confirmé.")
    const linkedStudent=data.student as {id:string;establishment_id:string;student_number:string|null;first_name:string;last_name:string}
    await refresh()
    setChildren(current=>{
      const existing=current.find(child=>child.id===linkedStudent.id)
      const next=existing ? current : [...current,{id:linkedStudent.id,establishment_id:linkedStudent.establishment_id,student_number:linkedStudent.student_number??null,first_name:linkedStudent.first_name,last_name:linkedStudent.last_name,birth_date:birthDate,sex:null,phone:null,email:null,active:true,can_view_academic:true,can_view_finance:true,relationship:"Parent"}]
      writeCachedChildren(next)
      return next
    })
    return data
  },[refresh])
  const unclaimChild=useCallback(async(studentId:string)=>{const {data,error}=await supabaseBrowser.rpc("unclaim_student",{p_student_id:studentId.trim()});if(error)throw error;if(data!==true)throw new Error("Cette association n'est plus active ou n'appartient pas à votre compte.");setChildren(c=>{const next=c.filter(x=>x.id!==studentId);writeCachedChildren(next);return next});return true},[])
  const requestAttendanceJustification=useCallback(async(a:ParentAttendance,reason:string)=>{const r=reason.trim();const child=children.find(x=>x.id===a.student_id);if(r.length<3||r.length>2000)throw new Error("Le motif doit contenir entre 3 et 2000 caractères.");if(!child?.can_view_academic)throw new Error("Vous n'êtes pas autorisé à justifier cette absence.");const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const {data,error}=await supabaseBrowser.from("attendance_justification_requests").insert({attendance_id:a.id,student_id:a.student_id,establishment_id:child.establishment_id,parent_user_id:u.user.id,reason:r}).select("id,attendance_id,student_id,reason,status,reviewer_note,created_at").single();if(error)throw error;setJustificationRequests(c=>[data as ParentJustificationRequest,...c]);return data},[children])
  const cancelAttendanceJustification=useCallback(async(id:string)=>{const {error}=await supabaseBrowser.from("attendance_justification_requests").update({status:"cancelled"}).eq("id",id).eq("status","pending");if(error)throw error;setJustificationRequests(c=>c.map(x=>x.id===id?{...x,status:"cancelled"}:x))},[])
  const markNotificationRead=useCallback(async(id:string)=>{const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const now=new Date().toISOString();const {error}=await supabaseBrowser.from("notifications").update({read_at:now}).eq("id",id).eq("recipient_user_id",u.user.id);if(error)throw error;setNotifications(c=>c.map(x=>x.id===id?{...x,read_at:now}:x))},[])
  const markAllNotificationsRead=useCallback(async()=>{const {data:u,error:ue}=await supabaseBrowser.auth.getUser();if(ue||!u.user)throw new Error("Session parent introuvable.");const now=new Date().toISOString();const {error}=await supabaseBrowser.from("notifications").update({read_at:now}).eq("recipient_user_id",u.user.id).is("read_at",null);if(error)throw error;setNotifications(c=>c.map(x=>x.read_at?x:{...x,read_at:now}))},[])
  useEffect(()=>{
    const cached=readCachedChildren()
    if(cached.length) setChildren(cached)
    void refresh()

    const {data:{subscription}}=supabaseBrowser.auth.onAuthStateChange((event,session)=>{
      if(!session) return
      if(event==="INITIAL_SESSION"||event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="USER_UPDATED"){
        window.setTimeout(()=>void refresh(),0)
      }
    })
    return ()=>subscription.unsubscribe()
  },[refresh])
  return {loading,error,refresh,children,grades,payments,attendance,justificationRequests,notifications,events,paymentSchedules,paymentAllocations,enrollmentOptions,timetable,lessons,homework,documents,claimChild,unclaimChild,requestAttendanceJustification,cancelAttendanceJustification,markNotificationRead,markAllNotificationsRead}
}


// Une seule instance du portail parent est partagée par toutes les pages.
// Cela évite que chaque navigation recrée un état enfants vide.
const ParentPortalContext = createContext<ReturnType<typeof useParentPortalState> | null>(null)

export function ParentPortalProvider({ children }: { children: ReactNode }) {
  const portal = useParentPortalState()
  return createElement(ParentPortalContext.Provider, { value: portal }, children)
}

export function useParentPortal() {
  const context = useContext(ParentPortalContext)
  if (!context) throw new Error("useParentPortal doit être utilisé dans ParentPortalProvider.")
  return context
}
