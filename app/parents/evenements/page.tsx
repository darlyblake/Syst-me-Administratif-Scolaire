"use client"

import { useMemo } from "react"
import { Calendar, MapPin, Clock, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"

const TYPES: Record<string, { label: string; className: string }> = {
  reunion: { label: "Réunion", className: "bg-terre-soft text-terre" },
  examen: { label: "Examen", className: "bg-rose-100 text-rose-700" },
  fete: { label: "Fête", className: "bg-fuchsia-100 text-fuchsia-700" },
  conference: { label: "Conférence", className: "bg-sky-100 text-sky-700" },
  sport: { label: "Sport", className: "bg-emerald-100 text-emerald-700" },
}

export default function ParentsEvenementsPage() {
  const { loading, error, refresh, events } = useParentPortal()
  const lists = useMemo(() => {
    const now = Date.now()
    return {
      upcoming: events.filter((event) => new Date(event.starts_at).getTime() >= now).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
      past: events.filter((event) => new Date(event.starts_at).getTime() < now).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    }
  }, [events])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-pierre"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Chargement des événements...</div>

  const render = (items: typeof events) => (
    <div className="space-y-3">
      {items.map((event) => {
        const type = TYPES[event.event_type] ?? { label: event.event_type || "Événement", className: "bg-slate-100 text-slate-700" }
        const date = new Date(event.starts_at)
        return (
          <Card key={event.id} className="border-terre/10 bg-papier">
            <CardContent className="flex gap-4 p-5">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-terre-soft text-terre">
                <span className="text-[10px] font-semibold uppercase">{date.toLocaleDateString("fr-FR", { month: "short" })}</span>
                <span className="text-xl font-bold">{date.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-terre">{event.title}</h3><Badge className={type.className}>{type.label}</Badge></div>
                {event.description && <p className="mt-1 text-sm leading-6 text-pierre">{event.description}</p>}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-pierre">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-terre">Vie scolaire</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-terre"><Calendar className="h-6 w-6" />Événements</h1><p className="mt-1 text-sm text-pierre">Les événements des établissements auxquels vos enfants sont associés.</p></div>
        <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </header>
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex flex-col gap-3 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button variant="outline" onClick={() => void refresh()} className="bg-white">Réessayer</Button></CardContent></Card>}
      <section><CardHeader className="px-0 pb-3"><CardTitle className="text-base text-terre">À venir <span className="font-normal text-pierre">({lists.upcoming.length})</span></CardTitle></CardHeader>{lists.upcoming.length ? render(lists.upcoming) : <Card><CardContent className="py-10 text-center text-sm text-pierre">Aucun événement à venir.</CardContent></Card>}</section>
      {lists.past.length > 0 && <section><CardHeader className="px-0 pb-3"><CardTitle className="text-base text-terre">Événements passés <span className="font-normal text-pierre">({lists.past.length})</span></CardTitle></CardHeader>{render(lists.past)}</section>}
    </div>
  )
}
