"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Calendar, ChevronDown, Clock3, Plus, Trash2, UserRound, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthentification } from "@/providers/authentification.provider"
import { obtenirClassesSupabase } from "@/services/classes.supabase.service"
import { getAcademicYears } from "@/lib/supabase/services/academic-year.service"
import {
  creerCreneauEmploiDuTemps,
  modifierCreneauEmploiDuTemps,
  obtenirAffectationsClasse,
  obtenirCreneauxClasse,
  supprimerCreneauEmploiDuTemps,
  type EmploiDuTempsAffectation,
  type TimetableSlot,
} from "@/services/emploi-du-temps.supabase.service"

const JOURS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
]

interface TimeRow { startsAt: string; endsAt: string }

const formatTime = (value: string) => value.slice(0, 5)
const rowKey = (row: TimeRow) => `${row.startsAt}-${row.endsAt}`

export default function EmploiDuTempsPage() {
  const { etablissementActif } = useAuthentification()
  const establishmentId = etablissementActif?.id ?? null

  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([])
  const [academicYears, setAcademicYears] = useState<any[]>([])
  const [selectedYearId, setSelectedYearId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [assignments, setAssignments] = useState<EmploiDuTempsAffectation[]>([])
  const [timeRows, setTimeRows] = useState<TimeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editor, setEditor] = useState<{
    slot: TimetableSlot | null
    dayOfWeek: number
    startsAt: string
    endsAt: string
  } | null>(null)
  const [teacherId, setTeacherId] = useState("")
  const [classSubjectId, setClassSubjectId] = useState("")
  const [room, setRoom] = useState("")
  const [saving, setSaving] = useState(false)
  const [newTimeOpen, setNewTimeOpen] = useState(false)
  const [newStartsAt, setNewStartsAt] = useState("")
  const [newEndsAt, setNewEndsAt] = useState("")

  const selectedClass = useMemo(() => classes.find(item => item.id === selectedClassId), [classes, selectedClassId])
  const activeYear = useMemo(() => academicYears.find(item => item.id === selectedYearId), [academicYears, selectedYearId])

  const teachers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    assignments.forEach(item => map.set(item.teacher_id, { id: item.teacher_id, name: item.teacher_name }))
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [assignments])

  const teacherSubjects = useMemo(
    () => assignments.filter(item => item.teacher_id === teacherId).sort((a, b) => a.subject_name.localeCompare(b.subject_name)),
    [assignments, teacherId],
  )

  const slotByCell = useMemo(() => {
    const map = new Map<string, TimetableSlot>()
    slots.forEach(slot => map.set(`${slot.day_of_week}-${slot.starts_at}-${slot.ends_at}`, slot))
    return map
  }, [slots])

  useEffect(() => {
    if (!establishmentId) {
      setLoading(false)
      return
    }
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [classRows, years] = await Promise.all([
          obtenirClassesSupabase(establishmentId),
          getAcademicYears(establishmentId),
        ])
        if (!active) return
        setClasses(classRows.map(item => ({ id: item.id, nom: item.nom })))
        setAcademicYears(years)
        const current = years.find(year => year.status === "active") ?? years[0]
        if (current) setSelectedYearId(current.id)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger les données.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [establishmentId])

  useEffect(() => {
    if (!establishmentId || !selectedClassId || !selectedYearId) {
      setSlots([])
      setAssignments([])
      return
    }
    let active = true
    ;(async () => {
      try {
        setLoadingGrid(true)
        setError(null)
        const [nextSlots, nextAssignments] = await Promise.all([
          obtenirCreneauxClasse(establishmentId, selectedClassId, selectedYearId),
          obtenirAffectationsClasse(establishmentId, selectedClassId),
        ])
        if (!active) return
        setSlots(nextSlots)
        setAssignments(nextAssignments)
        setTimeRows(current => {
          const merged = [...current, ...nextSlots.map(slot => ({ startsAt: slot.starts_at, endsAt: slot.ends_at }))]
          const unique = new Map(merged.map(row => [rowKey(row), row]))
          return Array.from(unique.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        })
        setTeacherId("")
        setClassSubjectId("")
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger l'emploi du temps.")
      } finally {
        if (active) setLoadingGrid(false)
      }
    })()
    return () => { active = false }
  }, [establishmentId, selectedClassId, selectedYearId])

  const openNewSlot = (dayOfWeek: number, row: TimeRow) => {
    setSuccess(null)
    setError(null)
    setEditor({ slot: null, dayOfWeek, startsAt: row.startsAt, endsAt: row.endsAt })
    setTeacherId("")
    setClassSubjectId("")
    setRoom("")
  }

  const openEditSlot = (slot: TimetableSlot) => {
    setSuccess(null)
    setError(null)
    setEditor({ slot, dayOfWeek: slot.day_of_week, startsAt: slot.starts_at, endsAt: slot.ends_at })
    setTeacherId(slot.teacher_id)
    setClassSubjectId(slot.class_subject_id)
    setRoom(slot.room ?? "")
  }

  const closeEditor = () => {
    if (saving) return
    setEditor(null)
    setTeacherId("")
    setClassSubjectId("")
    setRoom("")
  }

  const handleTeacherChange = (value: string) => {
    setTeacherId(value)
    const currentSubject = assignments.find(item => item.id === classSubjectId && item.teacher_id === value)
    setClassSubjectId(currentSubject?.id ?? "")
  }

  const handleSaveSlot = async () => {
    if (!establishmentId || !selectedClassId || !selectedYearId || !editor) return
    if (!classSubjectId) {
      setError("Sélectionnez d'abord un enseignant puis une matière qui lui est affectée à cette classe.")
      return
    }
    if (editor.startsAt >= editor.endsAt) {
      setError("L'heure de fin doit être après l'heure de début.")
      return
    }

    try {
      setSaving(true)
      setError(null)
      if (editor.slot) {
        await modifierCreneauEmploiDuTemps({
          id: editor.slot.id,
          etablissementId: establishmentId,
          academicYearId: selectedYearId,
          classId: selectedClassId,
          classSubjectId,
          dayOfWeek: editor.dayOfWeek,
          startsAt: editor.startsAt,
          endsAt: editor.endsAt,
          room,
        })
        setSuccess("Créneau modifié.")
      } else {
        await creerCreneauEmploiDuTemps({
          etablissementId: establishmentId,
          academicYearId: selectedYearId,
          classId: selectedClassId,
          classSubjectId,
          dayOfWeek: editor.dayOfWeek,
          startsAt: editor.startsAt,
          endsAt: editor.endsAt,
          room,
        })
        setSuccess("Créneau ajouté.")
      }
      const nextSlots = await obtenirCreneauxClasse(establishmentId, selectedClassId, selectedYearId)
      setSlots(nextSlots)
      setTimeRows(current => {
        const merged = [...current, { startsAt: editor.startsAt, endsAt: editor.endsAt }]
        const unique = new Map(merged.map(row => [rowKey(row), row]))
        return Array.from(unique.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      })
      closeEditor()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le créneau.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = async () => {
    if (!establishmentId || !editor?.slot) return
    if (!window.confirm("Supprimer ce cours de l'emploi du temps ?")) return
    try {
      setSaving(true)
      await supprimerCreneauEmploiDuTemps(editor.slot.id, establishmentId)
      setSlots(current => current.filter(slot => slot.id !== editor.slot?.id))
      setSuccess("Créneau supprimé.")
      closeEditor()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le créneau.")
    } finally {
      setSaving(false)
    }
  }

  const handleAddTimeRow = () => {
    if (!newStartsAt || !newEndsAt) return setError("Renseignez l'heure de début et l'heure de fin.")
    if (newStartsAt >= newEndsAt) return setError("L'heure de fin doit être après l'heure de début.")
    const next = { startsAt: newStartsAt, endsAt: newEndsAt }
    if (timeRows.some(row => rowKey(row) === rowKey(next))) {
      setError("Cette plage horaire existe déjà.")
      return
    }
    setTimeRows(current => [...current, next].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
    setNewStartsAt("")
    setNewEndsAt("")
    setNewTimeOpen(false)
    setError(null)
  }

  const handleRemoveTimeRow = (row: TimeRow) => {
    const hasCourses = timeRows.length && slots.some(slot => slot.starts_at === row.startsAt && slot.ends_at === row.endsAt)
    if (hasCourses) {
      setError("Cette plage contient déjà un cours. Supprimez ou déplacez d'abord les cours concernés.")
      return
    }
    setTimeRows(current => current.filter(item => rowKey(item) !== rowKey(row)))
  }

  if (loading) {
    return <main className="min-h-screen p-4 md:p-6"><div className="mx-auto max-w-7xl animate-pulse rounded-xl border bg-card p-8 text-muted-foreground">Chargement de l'emploi du temps…</div></main>
  }

  return (
    <main className="min-h-screen bg-muted/30 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <Link href="/ecole/tableau-bord" aria-label="Retour au tableau de bord"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"><Calendar className="h-6 w-6" />Emploi du temps</h1>
              <p className="text-sm text-muted-foreground">Construisez l'horaire de chaque classe comme dans un tableau Excel.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background px-3 py-1">{selectedClass?.nom ?? "Aucune classe"}</span>
            <span className="rounded-full border bg-background px-3 py-1">{activeYear?.name ?? "Aucune année"}</span>
          </div>
        </header>

        {(error || success) && (
          <div className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${error ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"}`}>
            <span>{error ?? success}</span>
            <button onClick={() => { setError(null); setSuccess(null) }} aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label>Année scolaire</Label>
                <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                  <SelectTrigger><SelectValue placeholder="Choisir l'année" /></SelectTrigger>
                  <SelectContent>{academicYears.map(year => <SelectItem key={year.id} value={year.id}>{year.name}{year.status === "active" ? " · active" : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                  <SelectContent>{classes.map(item => <SelectItem key={item.id} value={item.id}>{item.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setNewTimeOpen(true)} disabled={!selectedClassId || !selectedYearId}>
                <Clock3 className="mr-2 h-4 w-4" />Ajouter une plage horaire
              </Button>
            </div>
          </CardContent>
        </Card>

        {!selectedClassId || !selectedYearId ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Sélectionnez une année et une classe pour commencer.</CardContent></Card>
        ) : loadingGrid ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Chargement des affectations et des cours…</CardContent></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/40 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-semibold">Planning de {selectedClass?.nom}</h2><p className="text-xs text-muted-foreground">Cliquez sur une cellule vide pour créer un cours. Cliquez sur un cours pour le modifier.</p></div>
                <div className="text-xs text-muted-foreground">{assignments.length} affectation(s) disponible(s)</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 w-28 border-b border-r bg-muted/70 p-3 text-left font-semibold">Horaire</th>
                    {JOURS.map(day => <th key={day.value} className="border-b border-r bg-muted/70 p-3 text-center font-semibold">{day.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeRows.length === 0 ? (
                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Aucune plage horaire. Utilisez « Ajouter une plage horaire » pour définir vos horaires.</td></tr>
                  ) : timeRows.map(row => (
                    <tr key={rowKey(row)} className="h-28">
                      <td className="sticky left-0 z-10 border-b border-r bg-background p-3 align-top font-medium">
                        <div className="flex items-center justify-between gap-1"><span>{row.startsAt}</span><span className="text-muted-foreground">–</span><span>{row.endsAt}</span></div>
                        {!slots.some(slot => slot.starts_at === row.startsAt && slot.ends_at === row.endsAt) && <button className="mt-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleRemoveTimeRow(row)}>Supprimer la ligne</button>}
                      </td>
                      {JOURS.map(day => {
                        const slot = slotByCell.get(`${day.value}-${row.startsAt}-${row.endsAt}`)
                        return (
                          <td key={day.value} className="border-b border-r p-1 align-top">
                            {slot ? (
                              <button onClick={() => openEditSlot(slot)} className="group h-full min-h-24 w-full rounded-md border bg-background p-3 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md">
                                <div className="font-semibold leading-tight">{slot.subject_name}</div>
                                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{slot.teacher_name}</div>
                                {slot.room && <div className="mt-1 text-xs text-muted-foreground">Salle · {slot.room}</div>}
                              </button>
                            ) : (
                              <button onClick={() => openNewSlot(day.value, row)} className="flex min-h-24 w-full items-center justify-center rounded-md border border-dashed bg-muted/10 text-muted-foreground transition hover:border-foreground/30 hover:bg-muted/30">
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">Ajouter un cours le {day.label}</span>
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {newTimeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setNewTimeOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Nouvelle plage horaire</h3><p className="text-sm text-muted-foreground">Définissez vous-même les heures de la grille.</p></div><Button variant="ghost" size="icon" onClick={() => setNewTimeOpen(false)}><X className="h-4 w-4" /></Button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Début *</Label><Input type="time" value={newStartsAt} onChange={e => setNewStartsAt(e.target.value)} /></div>
              <div className="space-y-2"><Label>Fin *</Label><Input type="time" value={newEndsAt} onChange={e => setNewEndsAt(e.target.value)} /></div>
            </div>
            <div className="mt-6 flex gap-2"><Button className="flex-1" onClick={handleAddTimeRow}>Ajouter</Button><Button variant="outline" className="flex-1" onClick={() => setNewTimeOpen(false)}>Annuler</Button></div>
          </div>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={closeEditor}>
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{editor.slot ? "Modifier le cours" : "Ajouter un cours"}</h3><p className="text-sm text-muted-foreground">{JOURS.find(day => day.value === editor.dayOfWeek)?.label} · {editor.startsAt} – {editor.endsAt}</p></div><Button variant="ghost" size="icon" onClick={closeEditor}><X className="h-4 w-4" /></Button></div>

            <div className="space-y-4">
              <div className="space-y-2"><Label>Enseignant *</Label><Select value={teacherId} onValueChange={handleTeacherChange}><SelectTrigger><SelectValue placeholder={teachers.length ? "Choisir l'enseignant" : "Aucun enseignant affecté"} /></SelectTrigger><SelectContent>{teachers.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Matière *</Label><Select value={classSubjectId} onValueChange={setClassSubjectId} disabled={!teacherId}><SelectTrigger><SelectValue placeholder={teacherId ? "Choisir la matière" : "Choisissez d'abord l'enseignant"} /></SelectTrigger><SelectContent>{teacherSubjects.map(item => <SelectItem key={item.id} value={item.id}>{item.subject_name}{item.subject_code ? ` · ${item.subject_code}` : ""}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">La liste contient uniquement les matières réellement affectées à cet enseignant dans cette classe.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Début</Label><Input type="time" value={editor.startsAt} onChange={e => setEditor(current => current ? { ...current, startsAt: e.target.value } : current)} /></div>
                <div className="space-y-2"><Label>Fin</Label><Input type="time" value={editor.endsAt} onChange={e => setEditor(current => current ? { ...current, endsAt: e.target.value } : current)} /></div>
              </div>
              <div className="space-y-2"><Label>Salle</Label><Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Ex. Salle 12" /></div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              {editor.slot && <Button variant="destructive" onClick={handleDeleteSlot} disabled={saving} className="sm:mr-auto"><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>}
              <Button variant="outline" onClick={closeEditor} disabled={saving}>Annuler</Button>
              <Button onClick={handleSaveSlot} disabled={saving || !teacherId || !classSubjectId}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
