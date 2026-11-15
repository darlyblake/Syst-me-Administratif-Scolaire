"use client"

import { useEffect, useMemo, useState } from "react"
import { useParentPortal, type ParentAttendance } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"

type StatusFilter = "all" | "present" | "absent" | "late" | "justified" | "pending"
type PeriodFilter = "week" | "month" | "trimester" | "custom"

function dayOfWeekFromDate(value: string) { return new Date(value + "T12:00:00").getDay() }
function dateKey(date: Date) { return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-") }
function todayInGabon() {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Libreville",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
 const get=(type:string)=>parts.find(p=>p.type===type)?.value??"00"
 return get("year")+"-"+get("month")+"-"+get("day")
}
function timeInGabon() { return new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Libreville",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()) }
function addDays(value:string,days:number) { const d=new Date(value+"T12:00:00");d.setDate(d.getDate()+days);return dateKey(d) }
function getBounds(period:PeriodFilter,anchor:string,from:string,to:string,academicStart?:string,academicEnd?:string) {
 if(period==="custom") return {start:from||anchor,end:to||from||anchor}
 const d=new Date(anchor+"T12:00:00")
 if(period==="month") return {start:dateKey(new Date(d.getFullYear(),d.getMonth(),1,12)),end:dateKey(new Date(d.getFullYear(),d.getMonth()+1,0,12))}
 if(period==="trimester" && academicStart && academicEnd) {
  const startMs=new Date(academicStart+"T12:00:00").getTime(),endMs=new Date(academicEnd+"T12:00:00").getTime()
  const totalDays=Math.max(1,Math.floor((endMs-startMs)/86400000)+1)
  const elapsed=Math.max(0,Math.min(totalDays-1,Math.floor((d.getTime()-startMs)/86400000)))
  const index=Math.min(2,Math.floor(elapsed/totalDays*3))
  const fromOffset=Math.floor(totalDays*index/3),toOffset=Math.max(fromOffset,Math.floor(totalDays*(index+1)/3)-1)
  const start=new Date(startMs);start.setDate(start.getDate()+fromOffset)
  const end=new Date(startMs);end.setDate(end.getDate()+toOffset)
  return {start:dateKey(start),end:dateKey(end)}
 }
 const start=addDays(anchor,-((d.getDay()+6)%7));return {start,end:addDays(start,6)}
}
function formatRange(start:string,end:string) {
 const opts:Intl.DateTimeFormatOptions={day:"numeric",month:"long",year:"numeric"}
 const a=new Date(start+"T12:00:00").toLocaleDateString("fr-FR",opts),b=new Date(end+"T12:00:00").toLocaleDateString("fr-FR",opts)
 return start===end?a:a+" au "+b
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—"
  return value.slice(0, 5)
}

function statusLabel(status: string) {
  if (status === "present") return "Présent"
  if (status === "late" || status === "retard") return "Retard"
  if (status === "justified" || status === "excused") return "Justifié"
  return "Absent"
}

function statusClass(status: string) {
  if (status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "late" || status === "retard") return "border-amber-200 bg-amber-50 text-amber-700"
  if (status === "justified" || status === "excused") return "border-blue-200 bg-blue-50 text-blue-700"
  return "border-red-200 bg-red-50 text-red-700"
}

export default function ParentAbsences() {
  const {
    loading,
    error,
    refresh,
    children,
    attendance,
    timetable,
    timetableBreaks,
    justificationRequests,
  } = useParentPortal()

  const allowed = useMemo(() => children.filter((c) => c.can_view_academic), [children])
  const [childId, setChildId] = useState("")
  const activeChildId = allowed.some(child => child.id === childId) ? childId : (allowed[0]?.id ?? "")
  const selectedChild = allowed.find(child => child.id === activeChildId) ?? null
  const [dateFilter, setDateFilter] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("all")
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!activeChildId) return
    const channel = supabaseBrowser
      .channel("parent-attendance-" + activeChildId)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records", filter: "student_id=eq." + activeChildId }, () => { void refresh({ silent: true }) })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_justification_requests", filter: "student_id=eq." + activeChildId }, () => { void refresh({ silent: true }) })
      .on("postgres_changes", { event: "*", schema: "public", table: "class_breaks", filter: "establishment_id=eq." + (selectedChild?.establishment_id ?? "") }, () => { void refresh({ silent: true }) })
      .subscribe()
    return () => { void supabaseBrowser.removeChannel(channel) }
  }, [activeChildId, selectedChild?.establishment_id, refresh])
  const [period, setPeriod] = useState<PeriodFilter>("week")
  const [anchorDate, setAnchorDate] = useState(todayInGabon)
  const [customStart, setCustomStart] = useState(todayInGabon)
  const [customEnd, setCustomEnd] = useState(todayInGabon)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showHistory, setShowHistory] = useState(false)
  const [selected, setSelected] = useState<ParentAttendance | null>(null)
  const [reason, setReason] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const requests = useMemo(() => {
    const latest = new Map<string, (typeof justificationRequests)[number]>()
    for (const request of [...justificationRequests].sort((a,b) => Date.parse(a.created_at)-Date.parse(b.created_at))) {
      latest.set(request.attendance_id, request)
    }
    return latest
  }, [justificationRequests])

  const bounds = useMemo(() => getBounds(period,anchorDate,customStart,customEnd,selectedChild?.academic_year_start,selectedChild?.academic_year_end),[period,anchorDate,customStart,customEnd,selectedChild?.academic_year_start,selectedChild?.academic_year_end])
  const allRows = useMemo(() => {
    const selectedChildren=allowed.filter(child=>child.id===activeChildId)
    const recordMap=new Map<string,ParentAttendance>(attendance.map(item=>[item.student_id+":"+item.attendance_date+":"+(item.lesson_key??""),item] as const))
    const result:Array<{key:string;childId:string;childName:string;date:string;slotId:string;subject:string;startsAt:string;endsAt:string;attendance:ParentAttendance|null;derivedStatus:string}>=[]
    const today=todayInGabon(),nowTime=timeInGabon()
    if(bounds.start>bounds.end)return result
    for(const child of selectedChildren){
      const slots=timetable.filter(slot=>slot.class_id===child.class_id).sort((a,b)=>a.day_of_week-b.day_of_week||a.starts_at.localeCompare(b.starts_at))
      for(let date=bounds.start;date<=bounds.end;date=addDays(date,1)){
        if(date>today)continue
        const day=dayOfWeekFromDate(date)
        for(const slot of slots){
          if(slot.day_of_week!==day)continue
          if(date===today&&slot.ends_at.slice(0,5)>nowTime)continue
          const record=recordMap.get(child.id+":"+date+":"+slot.id)??null
          result.push({key:child.id+"-"+date+"-"+slot.id,childId:child.id,childName:(child.first_name+" "+child.last_name).trim(),date,slotId:slot.id,subject:slot.subject,startsAt:slot.starts_at,endsAt:slot.ends_at,attendance:record,derivedStatus:record?.status??"pending"})
        }
      }
    }
    return result.sort((a,b)=>b.date.localeCompare(a.date)||a.startsAt.localeCompare(b.startsAt))
  },[allowed,attendance,bounds.start,bounds.end,activeChildId,timetable])
  const subjectOptions = useMemo(() => Array.from(new Set(allRows.map(row => row.subject))).sort((a,b) => a.localeCompare(b, "fr")), [allRows])
  const rows=useMemo(()=>allRows.filter(row=>{
    if(dateFilter && row.date !== dateFilter)return false
    if(subjectFilter !== "all" && row.subject !== subjectFilter)return false
    if(statusFilter==="all")return true
    if(statusFilter==="pending")return row.derivedStatus==="pending"
    if(statusFilter==="present")return row.derivedStatus==="present"
    if(statusFilter==="late")return row.derivedStatus==="late"||row.derivedStatus==="retard"
    if(statusFilter==="justified")return row.derivedStatus==="justified"||row.derivedStatus==="excused"
    return row.derivedStatus==="absent"
  }),[allRows,dateFilter,subjectFilter,statusFilter])
  const liveStatus = useMemo(() => {
    if (!selectedChild) return null
    const today = todayInGabon()
    const parts = new Intl.DateTimeFormat("fr-FR", { timeZone:"Africa/Libreville", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(new Date(clock))
    const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0)
    const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0)
    const currentMinutes = hour * 60 + minute
    const day = dayOfWeekFromDate(today)
    const slots = timetable.filter(slot => slot.class_id === selectedChild.class_id && slot.day_of_week === day).sort((a,b) => a.starts_at.localeCompare(b.starts_at))
    const breaks = timetableBreaks.filter(item =>
      item.class_id === selectedChild.class_id &&
      !!selectedChild.academic_year_id &&
      item.academic_year_id === selectedChild.academic_year_id
    )
    const minutes = (value:string) => { const [h,m] = value.split(":").map(Number); return h * 60 + m }
    const currentBreak = day >= 1 && day <= 6
      ? breaks.find(item => minutes(item.starts_at) <= currentMinutes && currentMinutes < minutes(item.ends_at))
      : undefined
    const completed = slots.filter(slot => minutes(slot.ends_at) <= currentMinutes)
    const current = slots.find(slot => minutes(slot.starts_at) <= currentMinutes && currentMinutes < minutes(slot.ends_at))
    const next = slots.find(slot => minutes(slot.starts_at) > currentMinutes)
    const records = attendance.filter(item => item.student_id === selectedChild.id && item.attendance_date === today && slots.some(slot => slot.id === item.lesson_key))
    const recordFor = (slotId:string) => records.find(item => item.lesson_key === slotId)
    const present = records.filter(item => item.status === "present").length
    const late = records.filter(item => ["late","retard"].includes(item.status)).length
    const absent = records.filter(item => item.status === "absent").length
    const recorded = records.length
    const missing = completed.filter(slot => !recordFor(slot.id)).length
    const summary = { completed:completed.length, total:slots.length, present, late, absent, recorded, missing, attendanceLabel:null as string | null }
    if (currentBreak) {
      return {
        ...summary,
        kind:"break",
        title:currentBreak.label,
        detail:"La pause est en cours jusqu'à " + formatTime(currentBreak.ends_at) + ".",
        subject:null,
        teacher:null,
        room:null,
        next:next ? next.subject + " à " + formatTime(next.starts_at) : null,
      }
    }
    if (current) {
      const record = recordFor(current.id)
      const kind = !record ? "lesson-pending" : record.status === "absent" ? "lesson-absent" : "lesson-present"
      const attendanceLabel = !record ? "Appel non effectué" : record.status === "absent" ? "Absent" : record.status === "late" || record.status === "retard" ? "En retard" : "Présent"
      const detail = !record ? "L’enseignant n’a pas encore effectué l’appel." : record.status === "absent" ? "L’appel est fait : votre enfant est signalé absent." : record.status === "late" || record.status === "retard" ? "Votre enfant est présent, avec un retard enregistré." : "Votre enfant est présent en classe."
      return { ...summary, kind, title:"Cours en cours", detail, attendanceLabel, subject:current.subject, teacher:current.teacher_name, room:current.room, next:null }
    }
    if (next && completed.length > 0) {
      const last = completed[completed.length - 1]
      const lastRecord = recordFor(last.id)
      const lastStatus = lastRecord ? statusLabel(lastRecord.status) : "Appel non effectué"
      return { ...summary, kind:"free", title:"Aucun cours en cours", detail:"Le dernier cours est terminé : " + last.subject + " · " + lastStatus + ".", subject:null, teacher:null, room:null, next:next.subject + " à " + formatTime(next.starts_at) }
    }
    if (next) {
      return { ...summary, kind:"before", title:"Les cours n'ont pas encore commencé", detail:"Le prochain cours est prévu à " + formatTime(next.starts_at) + ".", subject:next.subject, teacher:next.teacher_name, room:next.room, next:null }
    }
    const last = completed[completed.length - 1]
    const lastRecord = last ? recordFor(last.id) : null
    const lastStatus = lastRecord ? statusLabel(lastRecord.status) : "Appel non effectué"
    return { ...summary, kind:slots.length ? "finished" : "empty", title:slots.length ? "Cours terminés pour aujourd'hui" : "Aucun cours prévu aujourd'hui", detail:slots.length ? (last ? "Dernier cours : " + last.subject + " · " + lastStatus + ". Le programme de la journée est terminé." : "Le programme de la journée est terminé.") : "Aucun cours n'est inscrit à l'emploi du temps aujourd'hui.", subject:null, teacher:null, room:null, next:null }
  }, [selectedChild, timetable, timetableBreaks, attendance, clock])

  const counts=useMemo(()=>{
    const recorded=allRows.filter(row=>row.attendance!==null)
    const present=recorded.filter(row=>row.derivedStatus==="present").length
    const late=recorded.filter(row=>row.derivedStatus==="late"||row.derivedStatus==="retard").length
    const absent=recorded.filter(row=>row.derivedStatus==="absent").length
    const justified=recorded.filter(row=>row.derivedStatus==="justified"||row.derivedStatus==="excused").length
    const planned=allRows.length,absenceTotal=absent+justified,pending=planned-recorded.length
    const statusSample=present+late+absenceTotal
    const status=statusSample<3?"En cours d’observation":present>=late&&present>=absenceTotal?"Régulier":late>absenceTotal?"Retardataire":"Absentéisme à surveiller"
    return {planned,present,late,absent,justified,absenceTotal,pending,recorded:recorded.length,rate:planned?Math.round(present/planned*100):null,lateRate:planned?Math.round(late/planned*100):null,absenceRate:planned?Math.round(absenceTotal/planned*100):null,status}
  },[allRows])
  async function submitJustification() {
    if (!selected?.attendance) return
    const trimmed = reason.trim()
    if (trimmed.length < 3 || trimmed.length > 2000) {
      setFormError("Le motif doit contenir entre 3 et 2000 caractères.")
      return
    }
    if (file && (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setFormError("Le document doit être une image ou un PDF de 10 Mo maximum.")
      return
    }

    setBusy(true)
    setFormError(null)
    let uploadedPath: string | null = null
    let createdRequestId: string | null = null
    try {
      const child = allowed.find((item) => item.id === selected.student_id)
      const { data: auth, error: authError } = await supabaseBrowser.auth.getUser()
      if (authError || !auth.user || !child) throw new Error("Session parent introuvable.")

      const { data: request, error: requestError } = await supabaseBrowser
        .from("attendance_justification_requests")
        .insert({
          attendance_id: selected.attendance.id,
          student_id: selected.student_id,
          establishment_id: child.establishment_id,
          parent_user_id: auth.user.id,
          reason: trimmed,
          status: "pending",
        })
        .select("id")
        .single()

      if (requestError) throw requestError
      createdRequestId = request.id

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = auth.user.id + "/" + request.id + "/" + safeName
        const { error: uploadError } = await supabaseBrowser.storage
          .from("attendance-justifications")
          .upload(path, file, { contentType: file.type, upsert: false })

        if (uploadError) throw uploadError
        uploadedPath = path

        const { error: attachError } = await supabaseBrowser
          .from("attendance_justification_requests")
          .update({
            attachment_path: path,
            attachment_name: file.name,
            attachment_mime_type: file.type,
            attachment_size_bytes: file.size,
          })
          .eq("id", request.id)
          .eq("parent_user_id", auth.user.id)
          .eq("status", "pending")
          .select("id")
          .single()

        if (attachError) throw attachError
      }

      setSelected(null)
      setReason("")
      setFile(null)
      await refresh()
    } catch (cause) {
      if (uploadedPath) await supabaseBrowser.storage.from("attendance-justifications").remove([uploadedPath])
      if (createdRequestId) {
        await supabaseBrowser.from("attendance_justification_requests").update({status:"cancelled"}).eq("id",createdRequestId).eq("status","pending")
      }
      setFormError(cause instanceof Error ? cause.message : "Impossible d'envoyer la justification.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-8 sm:space-y-5">
      <header className="pb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Espace famille</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Suivi des présences</h1>
        <p className="mt-1 text-sm text-slate-500">Suivez la journée scolaire et les présences de votre enfant.</p>
      </header>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {allowed.length > 0 && <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Choisir un enfant">
        {allowed.map(child => {
          const active = child.id === activeChildId
          const initials = (child.first_name?.[0] ?? "") + (child.last_name?.[0] ?? "")
          return <button key={child.id} type="button" onClick={() => { setChildId(child.id); setDateFilter(""); setSubjectFilter("all") }} aria-pressed={active}
            className={"flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors " + (active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300")}>
            <span className={"grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold " + (active ? "bg-white text-blue-700" : "bg-blue-50 text-blue-700")}>{initials.toUpperCase()}</span>
            {child.first_name}
          </button>
        })}
      </nav>}

      {!selectedChild && !loading && <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Aucun enfant n'est rattaché à votre compte avec accès au suivi scolaire.</div>}

      {selectedChild && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950">{selectedChild.first_name} {selectedChild.last_name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedChild.class_name ?? selectedChild.level_name ?? "Classe non renseignée"}{selectedChild.academic_year_name ? " · " + selectedChild.academic_year_name : ""}</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{selectedChild.class_name ?? selectedChild.level_name ?? "Élève"}</span>
          </div>

          {liveStatus && <div className={"mt-4 rounded-2xl px-4 py-5 text-center " + (liveStatus.kind.startsWith("lesson") ? "bg-blue-50" : liveStatus.kind === "break" ? "bg-amber-50" : liveStatus.kind === "finished" ? "bg-slate-100" : "bg-slate-50")}>
            <div className="mx-auto flex h-28 w-36 items-center justify-center" role="img" aria-label={liveStatus.kind === "break" ? "Élève qui prend son goûter" : liveStatus.kind.startsWith("lesson") ? "Élève en classe" : "Élève sans cours en ce moment"}>
              <svg viewBox="0 0 160 120" className={"h-full w-full " + (liveStatus.kind === "lesson-absent" ? "animate-pulse" : "animate-bounce")} fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="80" cy="108" rx="42" ry="6" fill="#CBD5E1" opacity=".55" />
                <circle cx="80" cy="35" r="21" fill="#D99A6C" />
                <path d="M60 31c1-17 38-24 42 0-8-7-14-9-23-8-7 1-12 4-19 8Z" fill="#26364B" />
                <circle cx="73" cy="37" r="2" fill="#26364B" /><circle cx="87" cy="37" r="2" fill="#26364B" />
                <path d="M74 46q6 5 12 0" stroke="#8B451F" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M59 66q21-16 42 0l8 35H51l8-35Z" fill={liveStatus.kind === "break" ? "#F59E0B" : liveStatus.kind === "lesson-absent" ? "#FCA5A5" : "#3B82F6"} />
                <path d="M62 70 44 86M98 70l15 14" stroke="#D99A6C" strokeWidth="9" strokeLinecap="round" />
                {liveStatus.kind === "break" ? <><path d="M110 80h19l-2 20h-15l-2-20Z" fill="#60A5FA" stroke="#2563EB" strokeWidth="2" /><path d="M113 78q6-7 13 0" stroke="#2563EB" strokeWidth="2" /><path d="M120 69v-7m-5 4 5-4 5 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" /></> : liveStatus.kind.startsWith("lesson") ? <><path d="m105 80 19 13" stroke="#D99A6C" strokeWidth="8" strokeLinecap="round" /><path d="m119 87 13 8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" /><path d="M54 100h54" stroke="#1E40AF" strokeWidth="3" strokeLinecap="round" /></> : <><path d="M45 78 29 87M114 78l16-9" stroke="#D99A6C" strokeWidth="8" strokeLinecap="round" /><path d="M127 55q8-7 14 0m-9-10 8-6" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" /></>}
                <path d="M65 100v8m30-8v8" stroke="#26364B" strokeWidth="7" strokeLinecap="round" />
                {liveStatus.kind === "lesson-absent" && <path d="M132 25l12 12m0-12-12 12" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />}
                {liveStatus.kind === "lesson-pending" && <circle cx="132" cy="26" r="10" stroke="#2563EB" strokeWidth="2" strokeDasharray="3 3" />}
              </svg>
            </div>
            <h3 className={"mt-1 text-xl font-extrabold " + (liveStatus.kind.startsWith("lesson") ? "text-blue-800" : liveStatus.kind === "break" ? "text-amber-800" : "text-slate-900")}>{liveStatus.title}</h3>
            {liveStatus.kind.startsWith("lesson") && <span className={"mt-2 inline-flex border px-3 py-1 text-xs font-bold " + (liveStatus.kind === "lesson-absent" ? "border-red-200 bg-red-50 text-red-700" : liveStatus.kind === "lesson-pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{liveStatus.attendanceLabel}</span>}
            <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-600">{liveStatus.detail}</p>
            {liveStatus.subject && <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-left">
              <div className="rounded-xl bg-white px-3 py-2"><p className="text-[11px] text-slate-500">Matière</p><p className="text-sm font-bold text-slate-900">{liveStatus.subject}</p></div>
              <div className="rounded-xl bg-white px-3 py-2"><p className="text-[11px] text-slate-500">Enseignant</p><p className="text-sm font-bold text-slate-900">{liveStatus.teacher ?? "Non renseigné"}</p></div>
              {liveStatus.room && <div className="col-span-2 rounded-xl bg-white px-3 py-2"><p className="text-[11px] text-slate-500">Salle</p><p className="text-sm font-bold text-slate-900">{liveStatus.room}</p></div>}
            </div>}
            {liveStatus.next && <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Prochain cours : {liveStatus.next}</p>}
            <p className="mt-3 text-[11px] font-medium text-slate-500">Actualisation automatique · Heure du Gabon</p>
          </div>}

          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-100 py-3 text-center">
            <div><p className="text-2xl font-extrabold tabular-nums text-blue-700">{liveStatus?.present ?? 0}</p><p className="text-xs text-slate-500">Présences</p></div>
            <div><p className="text-2xl font-extrabold tabular-nums text-amber-600">{liveStatus?.late ?? 0}</p><p className="text-xs text-slate-500">Retards</p></div>
            <div><p className="text-2xl font-extrabold tabular-nums text-red-600">{liveStatus?.absent ?? 0}</p><p className="text-xs text-slate-500">Absences</p></div>
          </div>
          <p className="pt-3 text-center text-xs text-slate-500">{liveStatus?.recorded ?? 0} appel(s) enregistré(s) aujourd'hui · {liveStatus?.completed ?? 0} cours terminés</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-950">Taux de présence</h2>
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1" role="group" aria-label="Période du taux de présence">
              {([{value:"week",label:"Semaine"},{value:"month",label:"Mois"},{value:"trimester",label:"Trimestre"}] as const).map(option=><button key={option.value} type="button" onClick={() => { setPeriod(option.value); setAnchorDate(todayInGabon()); setDateFilter(""); setSubjectFilter("all"); setStatusFilter("all") }} className={"px-3 py-1.5 text-xs font-bold " + (period === option.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500")}>{option.label}</button>)}
            </div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
            <div className="relative mx-auto h-32 w-32">
              <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90" role="img" aria-label="Répartition des cours prévus sur la période">
                <circle cx="52" cy="52" r="44" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                {counts.planned > 0 && [
                  {value:counts.present,color:"#2563EB"},
                  {value:counts.late,color:"#F59E0B"},
                  {value:counts.absenceTotal,color:"#DC2626"},
                  {value:counts.pending,color:"#CBD5E1"}
                ].map((segment,index,segments)=>{
                  const circumference=276.46
                  const before=segments.slice(0,index).reduce((sum,item)=>sum+item.value,0)
                  const length=circumference*segment.value/counts.planned
                  return <circle key={index} cx="52" cy="52" r="44" fill="none" stroke={segment.color} strokeWidth="10" strokeDasharray={length+" "+(circumference-length)} strokeDashoffset={-circumference*before/counts.planned} />
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-950">
                <span className="text-2xl font-extrabold tabular-nums">{counts.rate===null?"—":counts.rate+"%"}</span>
                <span className="text-[10px] text-slate-500">présence</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{period==="week"?"Cette semaine":period==="month"?"Ce mois-ci":"Ce trimestre"}</p>
              <p className="mt-1 text-xs text-slate-500">{counts.planned} cours prévus passés · {counts.recorded} appels saisis · {counts.pending} appel(s) non effectué(s)</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-blue-600" />Présences</span><strong className="tabular-nums">{counts.present} · {counts.rate??0}%</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-amber-500" />Retards</span><strong className="tabular-nums">{counts.late} · {counts.lateRate??0}%</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-red-600" />Absences</span><strong className="tabular-nums">{counts.absenceTotal} · {counts.absenceRate??0}%</strong></div>
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-slate-300" />Appels manquants</span><strong className="tabular-nums">{counts.pending}</strong></div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">Profil d’assiduité : <strong className={counts.status==="Régulier"?"text-blue-700":counts.status==="Retardataire"?"text-amber-700":counts.status.startsWith("Absentéisme")?"text-red-700":"text-slate-700"}>{counts.status}</strong></div>
            {counts.status==="Absentéisme à surveiller" && <span className="border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Signal de vigilance</span>}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-slate-500">Les pourcentages sont calculés sur les cours prévus passés dans l’emploi du temps. Un appel non effectué reste distinct d’une absence. Les absences justifiées sont incluses dans le total des absences.</p>
          <button type="button" onClick={() => { setDateFilter(""); setSubjectFilter("all"); setStatusFilter("all"); setShowHistory(true) }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-800">
            Voir l'historique des cours <span aria-hidden="true">→</span>
          </button>
        </section>
      </>}
      {loading && !selectedChild && <p className="py-8 text-center text-sm text-slate-500">Chargement des informations…</p>}

      {showHistory && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
        <div className="max-h-[92dvh] w-full max-w-5xl space-y-4 overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div><h2 className="text-lg font-semibold text-slate-950">Suivi des présences</h2><p className="mt-1 text-xs text-slate-500">{selectedChild?.first_name??"Enfant sélectionné"} · Consultez les cours, les absences et les demandes de justification.</p></div>
        <button type="button" onClick={()=>{setShowHistory(false);setChildId(activeChildId);setPeriod("week");setStatusFilter("all");setDateFilter("");setSubjectFilter("all")}} className="border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Fermer</button>
      </div>
      {showHistory && <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className="h-10 w-full  border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="week">Semaine</option><option value="month">Mois</option><option value="trimester">Trimestre</option><option value="custom">Période personnalisée</option>
            </select>
          </label>
          {period==="custom" ? <>
            <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Du</span><input type="date" value={customStart} max={customEnd} onChange={event=>setCustomStart(event.target.value)} className="h-10 w-full  border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Au</span><input type="date" value={customEnd} min={customStart} onChange={event=>setCustomEnd(event.target.value)} className="h-10 w-full  border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>
          </> : <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{period==="week"?"Semaine contenant":period==="month"?"Mois contenant":"Date du trimestre"}</span><input type="date" value={anchorDate} onChange={event=>setAnchorDate(event.target.value)} className="h-10 w-full  border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>}
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date précise</span>
            <input type="date" value={dateFilter} onChange={event=>{const value=event.target.value;setDateFilter(value);if(value){setPeriod("custom");setCustomStart(value);setCustomEnd(value)}}} className="h-10 w-full border border-slate-200 bg-white px-3 text-sm text-slate-800" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matière</span>
            <select value={subjectFilter} onChange={event=>setSubjectFilter(event.target.value)} className="h-10 w-full border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="all">Toutes les matières</option>
              {subjectOptions.map(subject=><option key={subject} value={subject}>{subject}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 w-full  border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="all">Tous les statuts</option><option value="present">Présent</option><option value="absent">Absent</option><option value="late">Retard</option><option value="justified">Justifié</option><option value="pending">Appel non effectué</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span><strong className="text-slate-900">{counts.planned}</strong> cours prévus terminés</span><span><strong className="text-slate-700">{counts.recorded}</strong> appels saisis</span>
          <span><strong className="text-emerald-700">{counts.present}</strong> présents</span>
          <span><strong className="text-amber-700">{counts.late}</strong> retards</span>
          <span><strong className="text-red-700">{counts.absent}</strong> absents</span>
          <span><strong className="text-blue-700">{counts.justified}</strong> justifiés</span>
          <span><strong className="text-slate-500">{counts.pending}</strong> appels manquants</span>
        </div>
      </section>}

      {showHistory && <section className="border border-slate-200 bg-white px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-sm font-semibold text-slate-900">Taux de présence</h2><p className="mt-1 text-xs text-slate-500">Présences rapportées aux cours terminés prévus.</p></div>
          <p className="text-2xl font-bold tabular-nums text-blue-800">{counts.rate===null?"—":counts.rate+"%"}</p>
        </div>
        <div className="h-2.5 overflow-hidden  bg-slate-100"><div className="h-full  bg-blue-700 transition-all" style={{width:(counts.rate??0)+"%"}} /></div>

        <p className="mt-3 text-[11px] text-slate-500">Un cours sans appel validé n'est pas compté comme une absence. Les retards sont présentés séparément des présences.</p>
      </section>}

      {showHistory && <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Historique du {formatRange(bounds.start, bounds.end)}
        </div>

        <div className="divide-y divide-slate-100 sm:hidden">
          {rows.map((row) => {
            const record = row.attendance
            const request = record ? requests.get(record.id) : undefined
            const pending = !record
            const label = pending ? "En attente" : statusLabel(row.derivedStatus)
            const canJustify = !!record && (row.derivedStatus === "absent" || row.derivedStatus === "late" || row.derivedStatus === "retard") && (!request || request.status === "rejected" || request.status === "cancelled")
            return <article key={row.key} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.subject}</p><p className="mt-0.5 text-xs text-slate-500">{row.childName} · {new Date(row.date + "T12:00:00").toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"})}</p></div>
                {pending ? <span className="shrink-0 text-xs text-slate-400">Appel non effectué</span> : <span className={"shrink-0 border px-2 py-1 text-[11px] font-semibold " + statusClass(row.derivedStatus)}>{label}</span>}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs text-slate-500"><span>Horaire</span><strong className="font-semibold tabular-nums text-slate-700">{formatTime(row.startsAt)} – {formatTime(row.endsAt)}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Justification</span>
                {request?.status === "pending" ? <span className="text-xs font-medium text-amber-700">En attente</span> : request?.status === "approved" ? <span className="text-xs font-medium text-emerald-700">Acceptée</span> : request?.status === "rejected" ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="min-h-9  border border-red-200 px-3 text-xs font-semibold text-red-700">Refusée · Renvoyer</button> : canJustify ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="min-h-9  border border-slate-200 px-3 text-xs font-semibold text-slate-700">Justifier</button> : <span className="text-xs text-slate-400">—</span>}
              </div>
              {request?.attachment_name && <p className="text-[11px] text-slate-500">Pièce jointe : {request.attachment_name}</p>}
              {request?.reviewer_note && <p className="text-xs text-slate-600">Retour de l'établissement : {request.reviewer_note}</p>}
            </article>
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Enfant</th>
                <th className="px-5 py-3">Horaire</th>
                <th className="px-5 py-3">Matière</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const record = row.attendance
                const request = record ? requests.get(record.id) : undefined
                const pending = !record
                const label = pending ? "En attente" : statusLabel(row.derivedStatus)
                const canJustify = !!record && (row.derivedStatus === "absent" || row.derivedStatus === "late" || row.derivedStatus === "retard") && (!request || request.status === "rejected" || request.status === "cancelled")
                return (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-600">{new Date(row.date + "T12:00:00").toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"})}</td>
                    <td className="px-5 py-4 font-medium text-slate-900">{row.childName}</td>
                    <td className="px-5 py-4 font-medium text-slate-700">{formatTime(row.startsAt)} – {formatTime(row.endsAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{row.subject}</td>
                    <td className="px-5 py-4">
                      {pending
                        ? <span className="text-xs text-slate-400">Appel non effectué</span>
                        : <span className={"inline-flex border px-2.5 py-1 text-xs font-semibold " + statusClass(row.derivedStatus)}>{label}</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {request?.status === "pending"
                        ? <span className="text-xs font-medium text-amber-700">En attente</span>
                        : request?.status === "approved"
                          ? <span className="text-xs font-medium text-emerald-700">Acceptée</span>
                          : request?.status === "rejected"
                            ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className=" border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Refusée · Renvoyer</button>
                            : canJustify
                              ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className=" border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Justifier</button>
                              : <span className="text-xs text-slate-400">—</span>}
                      {request?.attachment_name && <p className="mt-1 text-[11px] text-slate-500">{request.attachment_name}</p>}
                      {request?.reviewer_note && <p className="mt-1 max-w-48 text-[11px] text-slate-500">{request.reviewer_note}</p>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-slate-500">Aucun cours correspondant aux filtres sélectionnés.</div>
        )}
      </section>}

        </div>
      </div>}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto  border border-slate-200 bg-white p-5 shadow-xl sm: sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Justifier le {selected.status === "late" || selected.status === "retard" ? "retard" : "cours"}</h2>
                <p className="mt-1 text-sm text-slate-500">La demande sera transmise à l'administration de l'établissement.</p>
              </div>
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => { setSelected(null); setFile(null); setFormError(null) }}>Fermer</button>
            </div>

            {selected && requests.get(selected.id)?.status === "rejected" && requests.get(selected.id)?.reviewer_note && <p className="mt-4 border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><strong>Retour de l'établissement :</strong> {requests.get(selected.id)?.reviewer_note}</p>}
            <label className="mt-5 block text-sm font-semibold text-slate-700">Motif de la justification
              <textarea className="mt-2 min-h-28 w-full  border border-slate-200 p-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez brièvement le motif…" maxLength={2000} />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Document justificatif</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full  border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <span className="mt-1 block text-xs text-slate-500">Facultatif : photo JPG, PNG, WebP ou PDF — 10 Mo maximum.</span>
              {file && <span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600"><span className="truncate">{file.name} · {(file.size/1024/1024).toFixed(2)} Mo</span><button type="button" onClick={() => setFile(null)} className="font-semibold text-red-700">Retirer</button></span>}
            </label>

            {formError && <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="min-h-11  border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { setSelected(null); setFile(null); setFormError(null) }}>Annuler</button>
              <button type="button" disabled={busy || reason.trim().length < 3} className="min-h-11  bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50" onClick={() => void submitJustification()}>
                {busy ? "Envoi…" : "Envoyer la justification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
