"use client"

import { useMemo, useState } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export default function ParentTimetable() {
  const printTimetable = () => {
    const cleanup = () => document.body.classList.remove("print-parent-timetable")
    document.body.classList.add("print-parent-timetable")
    window.addEventListener("afterprint", cleanup, { once: true })
    window.print()
    window.setTimeout(cleanup, 1500)
  }
  const { loading, error, refresh, children, timetable } = useParentPortal()
  const allowed = useMemo(() => children.filter(child => child.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [selectedDay, setSelectedDay] = useState(() => { const today = new Date().getDay(); return today >= 1 && today <= 6 ? today : 1 })
  const classIds = useMemo(() => new Set(allowed.filter(child => childId === "tous" || child.id === childId).map(child => child.class_id).filter(Boolean)), [allowed, childId])
  const slots = useMemo(() => timetable.filter(slot => classIds.has(slot.class_id)), [timetable, classIds])

  return <div className="space-y-7">
    <style>{`
      @media print {
        body.print-parent-timetable * { visibility: hidden !important; }
        body.print-parent-timetable #parent-timetable-print-zone,
        body.print-parent-timetable #parent-timetable-print-zone * { visibility: visible !important; }
        body.print-parent-timetable #parent-timetable-print-zone {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
      }
    `}</style>
    <ParentPageHeader eyebrow="Organisation" title="Emploi du temps" description="Le programme hebdomadaire de vos enfants pour l’année scolaire en cours." onRefresh={() => void refresh()} refreshing={loading} />
    {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading && allowed.length === 0 ? <ParentEmptyState title="Emploi du temps non disponible" description="Votre compte n’a pas actuellement l’autorisation de consulter les cours." /> : <>
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
        <Button type="button" variant="outline" onClick={printTimetable} className="w-full gap-2 border-blue-200 text-blue-800 hover:bg-blue-50 sm:w-auto">
          <Printer className="h-4 w-4" /> Imprimer l’emploi du temps
        </Button>
      </div>
      <div id="parent-timetable-print-zone" className="min-w-0">
      <div className="hidden print:block print:mb-4">
        <h1 className="text-xl font-bold text-slate-900">Emploi du temps</h1>
        <p className="mt-1 text-sm text-slate-600">{childId === "tous" ? "Tous les enfants" : allowed.find(child => child.id === childId)?.first_name + " " + allowed.find(child => child.id === childId)?.last_name}</p>
        <p className="text-xs text-slate-500">Programme hebdomadaire — année scolaire en cours</p>
      </div>
      <section className="overflow-hidden border border-slate-200 bg-white">
        <div className="grid grid-cols-6 border-b border-slate-200 sm:hidden print:hidden">{days.map((day,index) => <button key={day} type="button" onClick={() => setSelectedDay(index + 1)} className={`min-h-12 px-1 text-[11px] font-semibold transition-colors ${selectedDay === index + 1 ? "border-b-2 border-blue-700 bg-blue-50 text-blue-800" : "text-slate-500"}`}>{day.slice(0,3)}</button>)}</div>
        <div className="divide-y divide-slate-100 sm:hidden print:hidden">{slots.filter(slot => slot.day_of_week === selectedDay).sort((a,b) => a.starts_at.localeCompare(b.starts_at)).map(slot => <article key={slot.id} className="flex items-center gap-3 px-4 py-4"><div className="w-20 shrink-0"><p className="text-sm font-semibold tabular-nums text-slate-900">{slot.starts_at.slice(0,5)}</p><p className="text-xs tabular-nums text-slate-500">{slot.ends_at.slice(0,5)}</p></div><div className="min-w-0 flex-1 border-l-2 border-blue-600 pl-3"><p className="truncate text-sm font-semibold text-slate-900">{slot.subject}</p><p className="mt-1 truncate text-xs text-slate-500">{slot.teacher_name}</p>{slot.room && <p className="mt-0.5 text-[11px] text-slate-400">Salle {slot.room}</p>}</div></article>)}
          {slots.filter(slot => slot.day_of_week === selectedDay).length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">Aucun cours prévu ce jour.</p>}
        </div>
        <div className="hidden overflow-x-auto sm:block print:block print:overflow-visible"><div className="grid min-w-[900px] grid-cols-6 divide-x divide-slate-200 print:min-w-0">{days.map((day,index) => { const items = slots.filter(slot => slot.day_of_week === index + 1); return <div key={day} className="min-h-[420px] print:min-h-0"><div className="border-b border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700">{day}</div><div className="divide-y divide-slate-100">{items.map(slot => <div key={slot.id} className="px-3 py-4"><p className="font-semibold text-slate-900">{slot.subject}</p><p className="mt-1 text-xs text-slate-500">{slot.starts_at.slice(0,5)} – {slot.ends_at.slice(0,5)}{slot.room ? ` · ${slot.room}` : ""}</p><p className="mt-1 text-[11px] text-slate-500">{slot.teacher_name}</p></div>)}{items.length === 0 && <p className="px-3 py-4 text-xs text-slate-400">Aucun cours.</p>}</div></div> })}</div></div>
      </section>
      </div>
      <p className="text-xs text-slate-500 print:hidden">Ce programme se répète chaque semaine. Il reste valable jusqu’à ce que l’établissement le modifie. Vous serez averti uniquement lorsqu’un changement sera effectué.</p>
    </>}
  </div>
}