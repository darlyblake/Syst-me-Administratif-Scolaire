"use client"

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const days=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]

export default function ParentTimetable() {
 return <div className="space-y-6"><ParentPageHeader eyebrow="Organisation" title="Emploi du temps" description="Consultez l’horaire scolaire de vos enfants."/><div className="flex items-center justify-between border-b border-terre/10 pb-3"><p className="text-sm text-pierre">Semaine scolaire</p><div className="flex items-center gap-1"><button className="rounded p-2 text-pierre hover:bg-creme" aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4"/></button><button className="text-sm font-medium text-terre hover:underline">Cette semaine</button><button className="rounded p-2 text-pierre hover:bg-creme" aria-label="Semaine suivante"><ChevronRight className="h-4 w-4"/></button></div></div><div className="overflow-x-auto border border-terre/10 bg-papier"><div className="grid min-w-[900px] grid-cols-6 divide-x divide-terre/10">{days.map(d=><div key={d} className="min-h-[380px]"><div className="border-b border-terre/10 bg-creme px-3 py-3 text-center text-sm font-semibold text-terre">{d}</div><div className="p-3"><p className="text-xs text-pierre">Aucun cours affiché</p></div></div>)}</div></div><ParentEmptyState title="Emploi du temps en préparation" description="L’emploi du temps sera alimenté automatiquement depuis les cours et classes associés à vos enfants." action={<CalendarDays className="h-5 w-5 text-terre"/>}/></div>
}
