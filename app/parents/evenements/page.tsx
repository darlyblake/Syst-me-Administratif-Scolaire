"use client"

import { useMemo } from "react"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentEvents() {
  const { loading, error, refresh, events } = useParentPortal()
  const upcoming = useMemo(
    () => events.filter(e => Date.parse(e.starts_at) >= Date.now()).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    [events],
  )
  const past = useMemo(
    () => events.filter(e => Date.parse(e.starts_at) < Date.now()).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)),
    [events],
  )

  const render = (list: typeof events) => (
    <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:border sm:rounded-lg">
      {list.map(event => {
        const date = new Date(event.starts_at)
        return (
          <article key={event.id} className="flex gap-3 px-3 py-4 sm:gap-4 sm:px-5">
            <div className="flex h-fit w-12 shrink-0 flex-col items-center rounded-md border border-slate-200 bg-slate-50 px-1 py-2 text-center sm:w-14">
              <span className="text-[11px] font-medium uppercase text-slate-500">{date.toLocaleDateString("fr-FR", { month: "short" })}</span>
              <span className="text-xl font-bold leading-6 text-slate-900">{date.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="break-words font-semibold text-slate-900">{event.title}</h3>
              {event.description && <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{event.description}</p>}
              <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-4">
                <span className="flex items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                {event.location && <span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{event.location}</span></span>}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <ParentPageHeader eyebrow="Vie scolaire" title="Événements" description="Réunions, examens et événements liés aux établissements de vos enfants." onRefresh={() => void refresh()} refreshing={loading} />
      {error && <div className="border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">{error}</div>}
      {!loading && !events.length ? (
        <ParentEmptyState title="Aucun événement" description="Aucun événement n’est actuellement publié pour vos établissements." />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">À venir <span className="font-normal text-slate-500">({upcoming.length})</span></h2>
            {upcoming.length ? render(upcoming) : <div className="border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">Aucun événement à venir.</div>}
          </section>
          {past.length > 0 && <section className="space-y-3"><h2 className="text-base font-semibold text-slate-900">Passés <span className="font-normal text-slate-500">({past.length})</span></h2>{render(past)}</section>}
        </>
      )}
    </div>
  )
}
