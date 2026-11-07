"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Calendar, Clock, MapPin, Plus, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { schoolEventsService, type SchoolEvent, type SchoolEventType } from "@/lib/supabase/services/school-events.service"

const TYPES: { value: SchoolEventType; label: string }[] = [
  { value: "reunion", label: "Réunion" }, { value: "examen", label: "Examen" },
  { value: "fete", label: "Fête" }, { value: "conference", label: "Conférence" },
  { value: "sport", label: "Sport" }, { value: "autre", label: "Autre" },
]
const emptyForm = { title: "", description: "", eventType: "reunion" as SchoolEventType, date: "", startTime: "", endTime: "", location: "" }

export default function EvenementsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear } = useAcademicYears(establishmentId)
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const refresh = useCallback(async () => {
    if (!establishmentId) { setEvents([]); setLoading(false); return }
    setLoading(true); setError(null)
    try { setEvents(await schoolEventsService.list(establishmentId, activeYear?.id ?? null)) }
    catch (e: any) { setError(e?.message || "Impossible de charger les événements.") }
    finally { setLoading(false) }
  }, [establishmentId, activeYear?.id])

  useEffect(() => { void refresh() }, [refresh])

  const upcoming = useMemo(() => events.filter(e => new Date(e.starts_at).getTime() >= Date.now()), [events])
  const addEvent = async () => {
    if (!establishmentId || !form.title.trim() || !form.date) { setError("Le titre et la date sont obligatoires."); return }
    const startsAt = new Date(form.date + "T" + (form.startTime || "00:00") + ":00").toISOString()
    const endsAt = form.endTime ? new Date(form.date + "T" + form.endTime + ":00").toISOString() : null
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) { setError("L'heure de fin doit être après l'heure de début."); return }
    setSaving(true); setError(null)
    try {
      await schoolEventsService.create({ establishmentId, academicYearId: activeYear?.id ?? null, title: form.title, description: form.description, eventType: form.eventType, startsAt, endsAt, location: form.location })
      setForm(emptyForm); setShowForm(false); await refresh()
    } catch (e: any) { setError(e?.message || "Impossible d'enregistrer l'événement.") }
    finally { setSaving(false) }
  }
  const removeEvent = async (id: string) => {
    if (!confirm("Supprimer définitivement cet événement ?")) return
    try { await schoolEventsService.remove(id); await refresh() }
    catch (e: any) { setError(e?.message || "Impossible de supprimer l'événement.") }
  }

  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <div className="flex flex-col justify-between gap-3 border-b border-[#d9dce5] pb-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Vie scolaire</p>
        <h1 className="text-2xl font-semibold text-[#131b2e]">Événements scolaires</h1>
        <p className="mt-1 text-sm text-[#64748b]">Les événements sont enregistrés dans l'espace partagé de l'établissement.</p>
      </div>
      <Button onClick={() => setShowForm(v => !v)} className="bg-[#1e3a8a] text-white hover:bg-[#172f70]"><Plus className="mr-2 h-4 w-4" />Nouvel événement</Button>
    </div>

    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    {showForm && <Card className="rounded border-[#d9dce5] shadow-none">
      <CardHeader><CardTitle className="text-lg">Ajouter un événement</CardTitle><CardDescription>Il sera visible par les utilisateurs autorisés de l'établissement.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(v => ({...v,title:e.target.value}))} placeholder="Ex. Réunion parents-professeurs" /></div>
        <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(v => ({...v,description:e.target.value}))} rows={2} /></div>
        <div className="space-y-2"><Label>Type</Label><Select value={form.eventType} onValueChange={v => setForm(s => ({...s,eventType:v as SchoolEventType}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(v => ({...v,date:e.target.value}))} /></div>
        <div className="space-y-2"><Label>Heure de début</Label><Input type="time" value={form.startTime} onChange={e => setForm(v => ({...v,startTime:e.target.value}))} /></div>
        <div className="space-y-2"><Label>Heure de fin</Label><Input type="time" value={form.endTime} onChange={e => setForm(v => ({...v,endTime:e.target.value}))} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Lieu</Label><Input value={form.location} onChange={e => setForm(v => ({...v,location:e.target.value}))} placeholder="Salle, bâtiment…" /></div>
        <div className="flex justify-end gap-2 md:col-span-2"><Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button><Button disabled={saving} onClick={() => void addEvent()} className="bg-[#1e3a8a] text-white hover:bg-[#172f70]">{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
      </CardContent>
    </Card>}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Card className="rounded border-[#d9dce5] shadow-none"><CardContent className="p-4"><p className="text-xs text-[#64748b]">Total des événements</p><p className="mt-1 text-2xl font-semibold">{events.length}</p></CardContent></Card>
      <Card className="rounded border-[#d9dce5] shadow-none"><CardContent className="p-4"><p className="text-xs text-[#64748b]">À venir</p><p className="mt-1 text-2xl font-semibold">{upcoming.length}</p></CardContent></Card>
      <Card className="col-span-2 rounded border-[#d9dce5] shadow-none md:col-span-1"><CardContent className="p-4"><p className="text-xs text-[#64748b]">Année scolaire</p><p className="mt-1 text-lg font-semibold">{activeYear?.name ?? "Non définie"}</p></CardContent></Card>
    </div>

    <section className="overflow-hidden rounded border border-[#d9dce5] bg-white">
      <div className="flex items-center justify-between border-b border-[#d9dce5] px-5 py-4"><div><h2 className="font-semibold text-[#131b2e]">Agenda de l'établissement</h2><p className="mt-1 text-sm text-[#64748b]">{events.length} événement(s) enregistré(s)</p></div><Calendar className="h-5 w-5 text-[#64748b]" /></div>
      {loading ? <p className="px-5 py-10 text-center text-sm text-[#64748b]">Chargement des événements…</p> : events.length === 0 ? <div className="px-5 py-12 text-center text-sm text-[#64748b]">Aucun événement enregistré pour cette année scolaire.</div> : <div className="divide-y divide-[#e5e7eb]">
        {events.map(event => {
          const date = new Date(event.starts_at)
          return <article key={event.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="min-w-14 border-r border-[#d9dce5] pr-4 text-center"><p className="text-xs font-semibold uppercase text-[#64748b]">{date.toLocaleDateString("fr-FR",{month:"short",timeZone:"Africa/Libreville"})}</p><p className="text-xl font-semibold text-[#131b2e]">{date.toLocaleDateString("fr-FR",{day:"2-digit",timeZone:"Africa/Libreville"})}</p></div>
              <div className="min-w-0"><p className="font-medium text-[#131b2e]">{event.title}</p><p className="mt-1 text-xs text-[#64748b]">{TYPES.find(t => t.value === event.event_type)?.label ?? event.event_type}</p>{event.description && <p className="mt-1 text-sm text-[#64748b]">{event.description}</p>}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748b]">
              <span><Clock className="mr-1 inline h-4 w-4" />{date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Libreville"})}{event.ends_at ? " – " + new Date(event.ends_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Libreville"}) : ""}</span>
              {event.location && <span><MapPin className="mr-1 inline h-4 w-4" />{event.location}</span>}
              <Button variant="outline" size="sm" className="text-red-700" onClick={() => void removeEvent(event.id)}><Trash2 className="mr-1 h-4 w-4" />Supprimer</Button>
            </div>
          </article>
        })}
      </div>}
    </section>
  </div>
}
