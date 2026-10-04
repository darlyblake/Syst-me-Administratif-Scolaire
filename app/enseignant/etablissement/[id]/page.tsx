"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpenText, CheckCircle2, Clock3, FileText, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherClass, type TeacherContext, type TeacherScheduleSlot, type TeacherStudent } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

function minutes(value: string) {
  const parts = value.slice(0, 5).split(":").map(Number)
  return parts[0] * 60 + parts[1]
}

export default function EspaceEtablissementEnseignantPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [context, setContext] = useState<TeacherContext | null>(null)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [students, setStudents] = useState<TeacherStudent[]>([])
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await Promise.all([
        enseignantPortalService.getContext(id),
        enseignantPortalService.getClasses(id),
        enseignantPortalService.getStudents(id),
        enseignantPortalService.getSchedule(id),
      ])
      setContext(result[0][0] ?? null)
      setClasses(result[1])
      setStudents(result[2])
      setSchedule(result[3])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger votre espace enseignant.")
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
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const today = new Date()
  const todayNumber = today.getDay()
  const todaySlots = useMemo(
    () => schedule.filter((slot) => slot.day_of_week === todayNumber).sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [schedule, todayNumber],
  )
  const currentMinutes = today.getHours() * 60 + today.getMinutes()
  const currentSlot = todaySlots.find((slot) => minutes(slot.starts_at) <= currentMinutes && currentMinutes < minutes(slot.ends_at))
  const nextSlot = todaySlots.find((slot) => minutes(slot.starts_at) > currentMinutes)
  const teacherName = context ? (context.first_name + " " + context.last_name).trim() : (contexte?.first_name || "Enseignant")
  const firstName = context?.first_name || contexte?.first_name || ""

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>
  }

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} teacherName={teacherName} active="today">
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-[#6d7280]"><Loader2 className="h-5 w-5 animate-spin" />Chargement de votre journée…</div>
      ) : (
        <>
          <section className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e5e7ef] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Aujourd’hui · {days[todayNumber]} {today.getDate()} {today.toLocaleDateString("fr-FR", { month: "long" })}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Bonjour {firstName}</h1>
              <p className="mt-1 text-sm text-[#6d7280]">{context?.specialty || "Votre journée d’enseignement"} · {todaySlots.length} cours prévu{todaySlots.length > 1 ? "s" : ""}</p>
            </div>
            <button type="button" onClick={() => void load()} className="rounded-md border border-[#dfe2ec] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f3f4f8]">Actualiser</button>
          </section>

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {currentSlot ? (
            <section className="mt-5 rounded-lg border border-[#c7d0ee] bg-[#f3f5ff] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2441a5]">En cours maintenant</p>
                  <h2 className="mt-1 text-lg font-bold">{currentSlot.subject_name} · {currentSlot.class_name}</h2>
                  <p className="mt-1 text-sm text-[#555e73]">{currentSlot.starts_at.slice(0, 5)}–{currentSlot.ends_at.slice(0, 5)} {currentSlot.room ? "· Salle " + currentSlot.room : ""}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d8def2] bg-white px-2.5 py-1 text-xs font-semibold text-[#2141a8]"><span className="h-2 w-2 rounded-full bg-[#2141a8]" />Cours actif</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/presences")} className="inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09236d]">Ouvrir l’appel <ArrowRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/pointage")} className="inline-flex items-center gap-2 rounded-md border border-[#cbd3ee] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#f8f9ff]"><Clock3 className="h-4 w-4" />Pointage du cours</button>
              </div>
            </section>
          ) : nextSlot ? (
            <section className="mt-5 rounded-xl border border-[#e0e3ed] bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Prochain cours</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="text-lg font-bold">{nextSlot.subject_name} · {nextSlot.class_name}</h2><p className="mt-1 text-sm text-[#6d7280]">{nextSlot.starts_at.slice(0, 5)}–{nextSlot.ends_at.slice(0, 5)} {nextSlot.room ? "· Salle " + nextSlot.room : ""}</p></div>
                <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/planning")} className="text-sm font-semibold text-[#2441a5]">Voir le planning <ArrowRight className="ml-1 inline h-4 w-4" /></button>
              </div>
            </section>
          ) : (
            <section className="mt-5 rounded-xl border border-[#e0e3ed] bg-white p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[#6d7280]" />
              <h2 className="mt-3 font-semibold">Aucun cours en cours</h2>
              <p className="mt-1 text-sm text-[#6d7280]">{todaySlots.length ? "Votre prochain créneau apparaîtra ici." : "Vous n’avez pas de cours prévu aujourd’hui."}</p>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Votre journée</h2><p className="text-sm text-[#6d7280]">Cours prévus aujourd’hui</p></div><span className="text-xs text-[#6d7280]">{todaySlots.length} créneau{todaySlots.length > 1 ? "x" : ""}</span></div>
            <div className="space-y-2">
              {todaySlots.map((slot) => {
                const active = slot === currentSlot
                const done = currentMinutes >= minutes(slot.ends_at)
                const stateClass = active ? "border-[#7e95f5]" : "border-[#e3e5ed]"
                const badgeClass = active ? "bg-[#e8edff] text-[#2441a5]" : done ? "bg-[#eef0f4] text-[#727887]" : "bg-[#f3f4f7] text-[#646b79]"
                return <div key={slot.slot_id} className={"flex items-center gap-3 rounded-lg border bg-white p-3 " + stateClass}>
                  <div className={"w-16 shrink-0 text-sm font-semibold " + (active ? "text-[#2441a5]" : "text-[#3c4353]")}>{slot.starts_at.slice(0, 5)}</div>
                  <div className={"h-10 w-0.5 " + (active ? "bg-[#3152c8]" : "bg-[#dfe2ea]")} />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{slot.subject_name}</p><p className="truncate text-xs text-[#6d7280]">{slot.class_name} {slot.room ? "· Salle " + slot.room : ""}</p></div>
                  <span className={"hidden shrink-0 rounded-full px-2 py-1 text-[11px] font-medium sm:inline-flex " + badgeClass}>{active ? "En cours" : done ? "Terminé" : "À venir"}</span>
                </div>
              })}
              {!todaySlots.length && <div className="rounded-lg border border-dashed border-[#d9dce6] bg-white p-8 text-center text-sm text-[#6d7280]">Aucun cours prévu pour aujourd’hui.</div>}
            </div>
          </section>

          <section className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/notes")} className="group flex items-center gap-3 rounded-md border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4] hover:bg-[#fafbfe]">
              <span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Notes & évaluations</span><span className="block text-sm text-[#6d7280]">Saisir et suivre vos évaluations</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" />
            </button>
            <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/cahier")} className="group flex items-center gap-3 rounded-lg border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4]">
              <span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><BookOpenText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Cahier de texte</span><span className="block text-sm text-[#6d7280]">Cours, activités et devoirs</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" />
            </button>
          </section>

          <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/classes")} className="group flex items-center gap-3 rounded-lg border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4]"><span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><BookOpenText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Mes classes</span><span className="block text-sm text-[#6d7280]">Voir vos affectations</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></button>
  <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/eleves")} className="group flex items-center gap-3 rounded-lg border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4]"><span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><BookOpenText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Mes élèves</span><span className="block text-sm text-[#6d7280]">Consulter vos élèves</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></button>
  <button type="button" onClick={() => router.push("/enseignant/etablissement/" + id + "/documents")} className="group flex items-center gap-3 rounded-lg border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4]"><span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Mon dossier</span><span className="block text-sm text-[#6d7280]">Documents de l’établissement</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></button>
  <button type="button" onClick={() => router.push("/enseignant/service-technique")} className="group flex items-center gap-3 rounded-lg border border-[#e1e3eb] bg-white p-4 text-left hover:border-[#bdc8f4]"><span className="border-l-2 border-[#3152c8] pl-3 text-[#2944a8]"><Clock3 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Assistance</span><span className="block text-sm text-[#6d7280]">Contacter le service technique</span></span><ArrowRight className="h-4 w-4 text-[#8a90a0]" /></button>
</section>

<section className="mt-7 border-t border-[#e2e4eb] pt-5">
            <div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-xl font-bold">{classes.length}</p><p className="text-xs text-[#737887]">Classes</p></div><div><p className="text-xl font-bold">{students.length}</p><p className="text-xs text-[#737887]">Élèves suivis</p></div><div><p className="text-xl font-bold">{new Set(classes.map((c) => c.subject_id)).size}</p><p className="text-xs text-[#737887]">Matières</p></div></div>
          </section>
        </>
      )}
    </TeacherShell>
  )
}
