"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import {
  enseignantPortalService,
  type TeacherClass,
  type TeacherContext,
  type TeacherScheduleSlot,
  type TeacherStudent,
} from "@/services/enseignant-portal.service"

const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
type Onglet = "aperçu" | "classes" | "élèves" | "emploi-du-temps"

export default function EspaceEtablissementEnseignantPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id
  const { utilisateur, contexte, estEnCoursDeChargement, deconnecter } = useAuthentification()
  const [onglet, setOnglet] = useState<Onglet>("aperçu")
  const [context, setContext] = useState<TeacherContext | null>(null)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const establishment = contexte?.establishments?.find((item) => item.id === establishmentId)

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError(null)
    try {
      const [teacherContext, teacherClasses, teacherStudents, teacherSchedule] = await Promise.all([
        enseignantPortalService.getContext(establishmentId),
        enseignantPortalService.getClasses(establishmentId),
        enseignantPortalService.getStudents(establishmentId),
        enseignantPortalService.getSchedule(establishmentId),
      ])
      setContext(teacherContext[0] ?? null)
      setClasses(teacherClasses)
      setStudents(teacherStudents)
      setSchedule(teacherSchedule)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger votre espace enseignant.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estEnCoursDeChargement, utilisateur, establishmentId, establishment, router])

  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return students
    return students.filter((student) =>
      `${student.first_name} ${student.last_name} ${student.student_number ?? ""} ${student.class_name}`.toLowerCase().includes(value),
    )
  }, [students, search])

  const classCount = classes.length
  const studentCount = students.length
  const subjectCount = new Set(classes.map((item) => item.subject_id)).size

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen bg-creme flex items-center justify-center"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement de votre espace enseignant…</div></main>
  }

  return (
    <main className="min-h-screen bg-creme">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="border-b pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" aria-label="Retour aux établissements" onClick={() => router.push("/enseignant")}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-terre">Espace enseignant</p><h1 className="truncate text-2xl font-semibold tracking-tight">{establishment.name}</h1><p className="mt-1 text-sm text-muted-foreground">{context ? `${context.first_name} ${context.last_name}` : "Votre espace pédagogique"}{context?.specialty ? ` · ${context.specialty}` : ""}</p></div>
            </div>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button><Button variant="outline" size="sm" onClick={async () => { await deconnecter(); router.replace("/") }}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button></div>
          </div>
        </header>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b" aria-label="Navigation enseignant">
          {([
            ["aperçu", "Vue d'ensemble", GraduationCap],
            ["classes", "Mes classes", BookOpen],
            ["élèves", "Mes élèves", Users],
            ["emploi-du-temps", "Emploi du temps", CalendarDays],
          ] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => setOnglet(value)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${onglet === value ? "border-terre text-terre" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>
          ))}
        </nav>

        {error && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rouge-terre/30 bg-rouge-terre/5 p-4 text-sm text-rouge-terre"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Réessayer</Button></div>}

        {onglet === "aperçu" && <section className="py-7"><div className="mb-6"><h2 className="text-xl font-semibold">Vue d'ensemble</h2><p className="mt-1 text-sm text-muted-foreground">Les informations utiles pour commencer votre journée.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Classes" value={classCount} icon={<BookOpen className="h-4 w-4" />} /><Summary label="Élèves suivis" value={studentCount} icon={<Users className="h-4 w-4" />} /><Summary label="Matières" value={subjectCount} icon={<ClipboardList className="h-4 w-4" />} /><Summary label="Cours planifiés" value={schedule.length} icon={<CalendarDays className="h-4 w-4" />} /></div><div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle className="text-base">Prochains cours</CardTitle></CardHeader><CardContent>{schedule.length === 0 ? <Empty text="Aucun cours planifié pour le moment." /> : <div className="divide-y">{schedule.slice(0, 5).map((slot) => <div key={slot.slot_id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{slot.subject_name}</p><p className="text-sm text-muted-foreground">{slot.class_name}{slot.room ? ` · Salle ${slot.room}` : ""}</p></div><p className="shrink-0 text-sm font-medium">{jours[slot.day_of_week - 1] ?? "Jour"} · {slot.starts_at.slice(0, 5)}</p></div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Vos classes</CardTitle></CardHeader><CardContent>{classes.length === 0 ? <Empty text="Aucune affectation de classe." /> : <div className="divide-y">{classes.slice(0, 6).map((item) => <div key={`${item.class_id}-${item.subject_id}`} className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{item.class_name}</p><p className="text-sm text-muted-foreground">{item.subject_name}</p></div>{item.weekly_hours != null && <span className="text-sm text-muted-foreground">{item.weekly_hours} h/sem.</span>}</div>)}</div>}</CardContent></Card></div></section>}

        {onglet === "classes" && <section className="py-7"><div className="mb-5"><h2 className="text-xl font-semibold">Mes classes</h2><p className="mt-1 text-sm text-muted-foreground">Vos affectations pédagogiques dans cet établissement.</p></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Classe</th><th className="px-5 py-3 font-medium">Matière</th><th className="px-5 py-3 font-medium">Volume</th></tr></thead><tbody className="divide-y">{classes.map((item) => <tr key={`${item.class_id}-${item.subject_id}`}><td className="px-5 py-3 font-medium">{item.class_name}</td><td className="px-5 py-3">{item.subject_name}</td><td className="px-5 py-3 text-muted-foreground">{item.weekly_hours != null ? `${item.weekly_hours} h/sem.` : "—"}</td></tr>)}</tbody></table></div>{classes.length === 0 && <Empty text="Aucune classe ne vous est encore affectée." />}</CardContent></Card></section>}

        {onglet === "élèves" && <section className="py-7"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Mes élèves</h2><p className="mt-1 text-sm text-muted-foreground">Uniquement les élèves des classes qui vous sont affectées.</p></div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un élève…" /></div></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Élève</th><th className="px-5 py-3 font-medium">Matricule</th><th className="px-5 py-3 font-medium">Classe</th></tr></thead><tbody className="divide-y">{filteredStudents.map((student) => <tr key={student.student_id}><td className="px-5 py-3 font-medium">{student.last_name} {student.first_name}</td><td className="px-5 py-3 text-muted-foreground">{student.student_number ?? "—"}</td><td className="px-5 py-3">{student.class_name}</td></tr>)}</tbody></table></div>{filteredStudents.length === 0 && <Empty text={search ? "Aucun élève ne correspond à votre recherche." : "Aucun élève dans vos classes."} />}</CardContent></Card></section>}

        {onglet === "emploi-du-temps" && <section className="py-7"><div className="mb-5"><h2 className="text-xl font-semibold">Emploi du temps</h2><p className="mt-1 text-sm text-muted-foreground">Vos horaires dans cet établissement.</p></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Jour</th><th className="px-5 py-3 font-medium">Horaire</th><th className="px-5 py-3 font-medium">Classe</th><th className="px-5 py-3 font-medium">Matière</th><th className="px-5 py-3 font-medium">Salle</th></tr></thead><tbody className="divide-y">{schedule.map((slot) => <tr key={slot.slot_id}><td className="px-5 py-3 font-medium">{jours[slot.day_of_week - 1] ?? "—"}</td><td className="px-5 py-3">{slot.starts_at.slice(0, 5)} – {slot.ends_at.slice(0, 5)}</td><td className="px-5 py-3">{slot.class_name}</td><td className="px-5 py-3">{slot.subject_name}</td><td className="px-5 py-3 text-muted-foreground">{slot.room ?? "—"}</td></tr>)}</tbody></table></div>{schedule.length === 0 && <Empty text="Aucun horaire disponible." />}</CardContent></Card></section>}
      </div>
    </main>
  )
}

function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-lg border bg-white p-4"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><p className="mt-2 text-2xl font-semibold">{value}</p></div> }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-sm text-muted-foreground">{text}</div> }
