"use client"

import { useEffect, useMemo, useState } from "react"
import { useParentPortal, type ParentAttendance } from "@/hooks/use-parent-portal"
import { supabaseBrowser } from "@/lib/supabase/client"

type StatusFilter = "all" | "present" | "absent" | "late" | "justified" | "pending"
type PeriodFilter = "week" | "month" | "custom"

function dayOfWeekFromDate(value: string) { return new Date(value + "T12:00:00").getDay() }
function dateKey(date: Date) { return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-") }
function todayInGabon() {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Libreville",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
 const get=(type:string)=>parts.find(p=>p.type===type)?.value??"00"
 return get("year")+"-"+get("month")+"-"+get("day")
}
function timeInGabon() { return new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Libreville",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()) }
function addDays(value:string,days:number) { const d=new Date(value+"T12:00:00");d.setDate(d.getDate()+days);return dateKey(d) }
function getBounds(period:PeriodFilter,anchor:string,from:string,to:string) {
 if(period==="custom") return {start:from||anchor,end:to||from||anchor}
 const d=new Date(anchor+"T12:00:00")
 if(period==="month") return {start:dateKey(new Date(d.getFullYear(),d.getMonth(),1,12)),end:dateKey(new Date(d.getFullYear(),d.getMonth()+1,0,12))}
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

  const bounds = useMemo(() => getBounds(period,anchorDate,customStart,customEnd),[period,anchorDate,customStart,customEnd])
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
    const minutes = (value:string) => { const [h,m] = value.split(":").map(Number); return h * 60 + m }
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
    const summary = { completed:completed.length, total:slots.length, present, late, absent, recorded, missing }
    if (current) {
      const record = recordFor(current.id)
      return { ...summary, kind:"lesson", title:"Cours en cours", detail:record ? "Appel enregistré : " + statusLabel(record.status) + "." : "Appel non effectué : l'enseignant n'a pas encore enregistré la présence.", subject:current.subject, teacher:current.teacher_name, room:current.room, next:null }
    }
    if (next && completed.length > 0) {
      const last = completed[completed.length - 1]
      const lastRecord = recordFor(last.id)
      const lastStatus = lastRecord ? statusLabel(lastRecord.status) : "Appel non effectué"
      return { ...summary, kind:"break", title:"Pause", detail:"Dernier cours : " + last.subject + " · " + lastStatus + ".", subject:null, teacher:null, room:null, next:next.subject + " à " + formatTime(next.starts_at) }
    }
    if (next) {
      return { ...summary, kind:"before", title:"Les cours n'ont pas encore commencé", detail:"Le prochain cours est prévu à " + formatTime(next.starts_at) + ".", subject:next.subject, teacher:next.teacher_name, room:next.room, next:null }
    }
    const last = completed[completed.length - 1]
    const lastRecord = last ? recordFor(last.id) : null
    const lastStatus = lastRecord ? statusLabel(lastRecord.status) : "Appel non effectué"
    return { ...summary, kind:slots.length ? "finished" : "empty", title:slots.length ? "Cours terminés pour aujourd'hui" : "Aucun cours prévu aujourd'hui", detail:slots.length ? (last ? "Dernier cours : " + last.subject + " · " + lastStatus + ". Le programme de la journée est terminé." : "Le programme de la journée est terminé.") : "Aucun cours n'est inscrit à l'emploi du temps aujourd'hui.", subject:null, teacher:null, room:null, next:null }
  }, [selectedChild, timetable, attendance, clock])

  const counts=useMemo(()=>{
    const recorded=allRows.filter(row=>row.attendance!==null)
    const present=recorded.filter(row=>row.derivedStatus==="present").length
    const late=recorded.filter(row=>row.derivedStatus==="late"||row.derivedStatus==="retard").length
    const absent=recorded.filter(row=>row.derivedStatus==="absent").length
    const justified=recorded.filter(row=>row.derivedStatus==="justified"||row.derivedStatus==="excused").length
    return {present,late,absent,justified,pending:allRows.length-recorded.length,recorded:recorded.length,rate:recorded.length?Math.round((present+late)/recorded.length*100):null}
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
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8 sm:space-y-6">
      <header className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-700">Espace famille</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">Présences</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-5 text-slate-500 sm:leading-6">
            Suivez les présences, retards et absences de chaque enfant, cours par cours.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto">
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </header>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="parent-attendance-child" className="text-sm font-semibold text-slate-800">Enfant sélectionné</label>
          <select id="parent-attendance-child" value={activeChildId} onChange={event=>{setChildId(event.target.value);setDateFilter("");setSubjectFilter("all")}} disabled={!allowed.length} className="h-14 w-full appearance-none border border-slate-300 bg-white px-4 text-base font-medium text-slate-900 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 disabled:bg-slate-50">
            {allowed.map(child=><option key={child.id} value={child.id}>{child.first_name} {child.last_name} · {child.class_name??child.level_name??"Classe non renseignée"}</option>)}
          </select>
        </div>
        {!selectedChild && !loading && <p className="border-y border-slate-200 py-5 text-sm text-slate-500">Aucun enfant n'est rattaché à votre compte avec accès au suivi scolaire.</p>}
        {selectedChild && <div className="border-y border-slate-200 bg-white py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Élève suivi</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedChild.first_name} {selectedChild.last_name}</h2>
          <p className="mt-1 text-sm text-slate-600">{selectedChild.class_name??selectedChild.level_name??"Classe non renseignée"}{selectedChild.academic_year_name?" · "+selectedChild.academic_year_name:""}</p>
        </div>}
        {liveStatus && <section className="border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situation aujourd'hui</p><p className="mt-1 text-xs text-slate-500">Actualisation automatique</p></div>
            <button type="button" onClick={()=>void refresh()} disabled={loading} className="text-sm font-semibold text-blue-800 disabled:opacity-50">{loading?"…":"Actualiser"}</button>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-start gap-3">
              <span className={"mt-1 h-2.5 w-2.5 shrink-0 "+(liveStatus.kind==="lesson"?"bg-blue-700":liveStatus.kind==="break"?"bg-amber-500":liveStatus.kind==="finished"?"bg-emerald-600":"bg-slate-400")}></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-950">{liveStatus.title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">{liveStatus.detail}</p>
                {liveStatus.subject&&<p className="mt-3 text-sm font-semibold text-slate-900">{liveStatus.subject}</p>}
                {liveStatus.teacher&&<p className="mt-1 text-sm text-slate-600">Enseignant : {liveStatus.teacher}</p>}
                {liveStatus.room&&<p className="mt-1 text-sm text-slate-500">Salle : {liveStatus.room}</p>}
                {liveStatus.next&&<p className="mt-2 text-sm text-slate-600">Prochain cours : {liveStatus.next}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-slate-200 text-center">
            <div className="px-2 py-3"><p className="text-xl font-semibold tabular-nums text-emerald-700">{liveStatus.present}</p><p className="text-xs text-slate-500">Présences</p></div>
            <div className="border-x border-slate-200 px-2 py-3"><p className="text-xl font-semibold tabular-nums text-amber-700">{liveStatus.late}</p><p className="text-xs text-slate-500">Retards</p></div>
            <div className="px-2 py-3"><p className="text-xl font-semibold tabular-nums text-red-700">{liveStatus.absent}</p><p className="text-xs text-slate-500">Absences</p></div>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">{liveStatus.recorded} appel(s) enregistré(s) aujourd'hui · {liveStatus.completed} cours terminés · {liveStatus.missing} appel(s) manquant(s)</div>
        </section>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div><h2 className="text-base font-semibold text-slate-950">Historique et absences</h2><p className="mt-1 text-xs text-slate-500">Consultez les cours passés et envoyez une justification.</p></div>
          <button type="button" onClick={()=>{setPeriod("month");setAnchorDate(todayInGabon());setDateFilter("");setSubjectFilter("all");setStatusFilter("all");setShowHistory(true)}} className="min-h-11 border border-blue-700 px-4 text-sm font-semibold text-blue-800">Ouvrir l'historique</button>
        </div>
      </section>

      {showHistory && <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
        <div className="max-h-[92dvh] w-full max-w-5xl space-y-4 overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div><h2 className="text-lg font-semibold text-slate-950">Suivi des présences</h2><p className="mt-1 text-xs text-slate-500">{selectedChild?.first_name??"Enfant sélectionné"} · Consultez les cours, les absences et les demandes de justification.</p></div>
        <button type="button" onClick={()=>{setShowHistory(false);setChildId(activeChildId);setPeriod("week");setStatusFilter("all");setDateFilter("");setSubjectFilter("all")}} className="border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Fermer</button>
      </div>
      {showHistory && <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enfant</span>
            <select value={activeChildId} onChange={(event) => setChildId(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800">
                {allowed.map((child) => <option key={child.id} value={child.id}>{child.first_name} {child.last_name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Période</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="week">Semaine</option><option value="month">Mois</option><option value="custom">Période personnalisée</option>
            </select>
          </label>
          {period==="custom" ? <>
            <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Du</span><input type="date" value={customStart} max={customEnd} onChange={event=>setCustomStart(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>
            <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Au</span><input type="date" value={customEnd} min={customStart} onChange={event=>setCustomEnd(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>
          </> : <label className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{period==="week"?"Semaine contenant":"Mois contenant"}</span><input type="date" value={anchorDate} onChange={event=>setAnchorDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800" /></label>}
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
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="all">Tous les statuts</option><option value="present">Présent</option><option value="absent">Absent</option><option value="late">Retard</option><option value="justified">Justifié</option><option value="pending">Appel non effectué</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span><strong className="text-slate-900">{counts.recorded}</strong> appels effectués</span>
          <span><strong className="text-emerald-700">{counts.present}</strong> présents</span>
          <span><strong className="text-amber-700">{counts.late}</strong> retards</span>
          <span><strong className="text-red-700">{counts.absent}</strong> absents</span>
          <span><strong className="text-blue-700">{counts.justified}</strong> justifiés</span>
          <span><strong className="text-slate-500">{counts.pending}</strong> appels manquants</span>
        </div>
      </section>}

      {showHistory && <section className="border border-slate-200 bg-white px-4 py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-sm font-semibold text-slate-900">Taux de présence</h2><p className="mt-1 text-xs text-slate-500">Calculé sur les appels effectués des cours terminés.</p></div>
          <p className="text-2xl font-bold tabular-nums text-blue-800">{counts.rate===null?"—":counts.rate+"%"}</p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700 transition-all" style={{width:(counts.rate??0)+"%"}} /></div>

        <p className="mt-3 text-[11px] text-slate-500">Un cours sans appel validé n'est pas compté comme une absence. Les retards sont comptés comme une présence.</p>
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
                {request?.status === "pending" ? <span className="text-xs font-medium text-amber-700">En attente</span> : request?.status === "approved" ? <span className="text-xs font-medium text-emerald-700">Acceptée</span> : request?.status === "rejected" ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700">Refusée · Renvoyer</button> : canJustify ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700">Justifier</button> : <span className="text-xs text-slate-400">—</span>}
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
                            ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Refusée · Renvoyer</button>
                            : canJustify
                              ? <button type="button" onClick={() => { setSelected(record); setReason(record.reason ?? ""); setFile(null); setFormError(null) }} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Justifier</button>
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
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">Justifier le {selected.status === "late" || selected.status === "retard" ? "retard" : "cours"}</h2>
                <p className="mt-1 text-sm text-slate-500">La demande sera transmise à l'administration de l'établissement.</p>
              </div>
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => { setSelected(null); setFile(null); setFormError(null) }}>Fermer</button>
            </div>

            {selected && requests.get(selected.id)?.status === "rejected" && requests.get(selected.id)?.reviewer_note && <p className="mt-4 border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"><strong>Retour de l'établissement :</strong> {requests.get(selected.id)?.reviewer_note}</p>}
            <label className="mt-5 block text-sm font-semibold text-slate-700">Motif de la justification
              <textarea className="mt-2 min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Expliquez brièvement le motif…" maxLength={2000} />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Document justificatif</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <span className="mt-1 block text-xs text-slate-500">Facultatif : photo JPG, PNG, WebP ou PDF — 10 Mo maximum.</span>
              {file && <span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600"><span className="truncate">{file.name} · {(file.size/1024/1024).toFixed(2)} Mo</span><button type="button" onClick={() => setFile(null)} className="font-semibold text-red-700">Retirer</button></span>}
            </label>

            {formError && <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { setSelected(null); setFile(null); setFormError(null) }}>Annuler</button>
              <button type="button" disabled={busy || reason.trim().length < 3} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50" onClick={() => void submitJustification()}>
                {busy ? "Envoi…" : "Envoyer la justification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
