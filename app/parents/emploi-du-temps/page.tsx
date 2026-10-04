"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export default function ParentTimetable() {
  const { loading, error, refresh, children, timetable } = useParentPortal()
  const allowed = useMemo(() => children.filter((child) => child.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [weekOffset, setWeekOffset] = useState(0)

  const classIds = useMemo(
    () => new Set(allowed.filter((child) => childId === "tous" || child.id === childId).map((child) => child.class_id).filter(Boolean)),
    [allowed, childId],
  )
  const slots = useMemo(() => timetable.filter((slot) => classIds.has(slot.class_id)), [timetable, classIds])

  return (
    <div className="space-y-6">
      <ParentPageHeader
        eyebrow="Organisation"
        title="Emploi du temps"
        description="Consultez l’horaire scolaire de vos enfants."
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && allowed.length === 0 ? (
        <ParentEmptyState
          title="Emploi du temps non disponible"
          description="Votre compte n’a pas actuellement l’autorisation de consulter les cours."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-terre/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
            <div className="flex items-center justify-between border border-terre/10 bg-papier">
              <Button variant="ghost" size="icon" aria-label="Semaine précédente" onClick={() => setWeekOffset((value) => value - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button type="button" className="min-w-36 px-3 text-sm font-medium text-terre" onClick={() => setWeekOffset(0)}>
                {weekOffset === 0 ? "Cette semaine" : weekOffset > 0 ? "Semaine suivante" : "Semaine précédente"}
              </button>
              <Button variant="ghost" size="icon" aria-label="Semaine suivante" onClick={() => setWeekOffset((value) => value + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <section className="overflow-x-auto border-y border-terre/10 bg-papier">
            <div className="grid min-w-[900px] grid-cols-6 divide-x divide-terre/10">
              {days.map((day, index) => {
                const items = slots.filter((slot) => slot.day_of_week === index + 1)

                return (
                  <div key={day} className="min-h-[420px]">
                    <div className="border-b border-terre/10 bg-creme px-3 py-3 text-center text-sm font-semibold text-terre">
                      {day}
                    </div>
                    <div className="divide-y divide-terre/10">
                      {items.map((slot) => (
                        <div key={slot.id} className="px-3 py-4">
                          <p className="font-medium text-terre">{slot.subject}</p>
                          <p className="mt-1 text-xs text-pierre">
                            {slot.starts_at.slice(0, 5)} – {slot.ends_at.slice(0, 5)}
                            {slot.room ? ` · ${slot.room}` : ""}
                          </p>
                        </div>
                      ))}
                      {items.length === 0 && <p className="px-3 py-4 text-xs text-pierre">Aucun cours.</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          <p className="text-xs text-pierre">L’affichage suit les jours récurrents de l’emploi du temps de l’établissement.</p>
        </>
      )}
    </div>
  )
}
