"use client"

import { useMemo } from "react"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"


export default function ParentEvents() {
 const {loading,error,refresh,events}=useParentPortal()
 const upcoming=useMemo(()=>events.filter(e=>Date.parse(e.starts_at)>=Date.now()).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at)),[events])
 const past=useMemo(()=>events.filter(e=>Date.parse(e.starts_at)<Date.now()).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)),[events])
 const render=(list:typeof events)=><div className="divide-y divide-terre/10 border border-terre/10 bg-papier">{list.map(e=>{const d=new Date(e.starts_at);return <div key={e.id} className="flex gap-4 px-5 py-4"><div className="w-14 shrink-0 border-r border-terre/10 pr-4 text-center"><p className="text-xs uppercase text-pierre">{d.toLocaleDateString("fr-FR",{month:"short"})}</p><p className="text-xl font-bold text-terre">{d.getDate()}</p></div><div className="min-w-0"><p className="font-semibold text-terre">{e.title}</p>{e.description&&<p className="mt-1 text-sm leading-6 text-pierre">{e.description}</p>}<div className="mt-2 flex flex-wrap gap-4 text-xs text-pierre"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} à {d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>{e.location&&<span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{e.location}</span>}</div></div></div>})}</div>
 return <div className="space-y-6"><ParentPageHeader eyebrow="Vie scolaire" title="Événements" description="Réunions, examens et événements liés aux établissements de vos enfants." onRefresh={()=>void refresh()} refreshing={loading}/>{error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{!loading&&!events.length?<ParentEmptyState title="Aucun événement" description="Aucun événement n’est actuellement publié pour vos établissements."/>:<><section><h2 className="mb-3 text-base font-semibold text-terre">À venir <span className="font-normal text-pierre">({upcoming.length})</span></h2>{upcoming.length?render(upcoming):<p className="border border-dashed border-terre/15 bg-papier px-5 py-8 text-sm text-pierre">Aucun événement à venir.</p>}</section>{past.length>0&&<section><h2 className="mb-3 text-base font-semibold text-terre">Passés <span className="font-normal text-pierre">({past.length})</span></h2>{render(past)}</section>}</>}</div>
}
