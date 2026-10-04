"use client"

import { useEffect, useState } from "react"
import { BookOpenText, CalendarDays, CheckCircle2, FileText, Loader2, Plus, Save } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherScheduleSlot } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function TeacherCahierPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === id)
  const [schedule, setSchedule] = useState<TeacherScheduleSlot[]>([])
  const [selected, setSelected] = useState<TeacherScheduleSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState("")
  const [content, setContent] = useState("")
  const [homework, setHomework] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) {
      enseignantPortalService.getSchedule(id).then((rows) => {
        setSchedule(rows)
        const today = new Date().getDay()
        const first = rows.filter((row) => row.day_of_week === today).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? rows[0] ?? null
        setSelected(first)
        setTheme(first?.subject_name ? "Cours de " + first.subject_name : "")
      }).catch(() => setSchedule([])).finally(() => setLoading(false))
    }
  }, [estEnCoursDeChargement, utilisateur, establishment, id, router])

  const saveDraft = () => {
    if (!selected) return
    const key = "enseignant:cahier:" + id + ":" + selected.slot_id
    sessionStorage.setItem(key, JSON.stringify({ theme, content, homework }))
    setMessage("Brouillon enregistré sur cet appareil pour cette session.")
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  return (
    <TeacherShell establishmentId={id} establishmentName={establishment.name} active="cahier">
      <header className="border-b border-[#e4e6ef] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Suivi pédagogique</p>
        <h1 className="mt-1 text-2xl font-bold">Cahier de texte & devoirs</h1>
        <p className="mt-1 text-sm text-[#6d7280]">Préparez le contenu de vos séances et les travaux à donner.</p>
      </header>

      {loading ? <div className="py-16 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement des cours…</p></div> : (
        <>
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Séances</h2><p className="text-sm text-[#6d7280]">Choisissez le cours à renseigner.</p></div><CalendarDays className="h-5 w-5 text-[#707788]" /></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {schedule.slice(0, 12).map((slot) => <button key={slot.slot_id} type="button" onClick={() => { setSelected(slot); setTheme("Cours de " + slot.subject_name); setMessage("") }} className={"min-w-[190px] rounded-lg border p-3 text-left " + (selected?.slot_id === slot.slot_id ? "border-[#7890ef] bg-[#edf1ff]" : "border-[#e1e3eb] bg-white")}>
                <p className="text-xs text-[#6d7280]">{["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][slot.day_of_week]} · {slot.starts_at.slice(0,5)}</p>
                <p className="mt-1 font-semibold">{slot.subject_name}</p>
                <p className="mt-0.5 text-xs text-[#6d7280]">{slot.class_name}</p>
              </button>)}
              {!schedule.length && <div className="w-full rounded-lg border border-dashed p-6 text-center text-sm text-[#6d7280]">Aucun cours disponible dans votre emploi du temps.</div>}
            </div>
          </section>

          {selected && <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-lg border border-[#e1e3eb] bg-white">
              <div className="border-b px-4 py-3"><p className="text-xs text-[#6d7280]">Séance sélectionnée</p><h2 className="font-bold">{selected.subject_name} · {selected.class_name}</h2><p className="text-sm text-[#6d7280]">{selected.starts_at.slice(0,5)}–{selected.ends_at.slice(0,5)}{selected.room ? " · Salle " + selected.room : ""}</p></div>
              <div className="space-y-4 p-4">
                <label className="block text-sm font-medium">Thème du cours<input value={theme} onChange={(e) => setTheme(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#dfe2ec] px-3 outline-none focus:border-[#7890ef]" /></label>
                <label className="block text-sm font-medium">Contenu et activités<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7} placeholder="Décrivez ce qui a été enseigné et les activités réalisées…" className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" /></label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#7a8090]">Les données métier seront reliées au service cahier de texte lors de l’étape backend.</p>
                  <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white"><Save className="h-4 w-4" />Enregistrer le brouillon</button>
                </div>
                {message && <p className="flex items-center gap-2 text-sm text-[#277047]"><CheckCircle2 className="h-4 w-4" />{message}</p>}
              </div>
            </div>

            <div className="rounded-lg border border-[#e1e3eb] bg-white">
              <div className="border-b px-4 py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#2944a8]" /><h2 className="font-semibold">Devoir à donner</h2></div></div>
              <div className="space-y-4 p-4">
                <label className="block text-sm font-medium">Consignes<textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={8} placeholder="Exercices, lecture, recherche ou travail à préparer…" className="mt-1.5 w-full resize-y rounded-md border border-[#dfe2ec] p-3 outline-none focus:border-[#7890ef]" /></label>
                <div className="rounded-md bg-[#f4f5f8] p-3 text-sm text-[#626978]"><p className="font-medium text-[#333a49]">À prévoir</p><p className="mt-1">La date de remise et la diffusion aux élèves seront ajoutées avec le service devoirs.</p></div>
              </div>
            </div>
          </section>}

          {!selected && <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-[#6d7280]"><BookOpenText className="mx-auto h-7 w-7" /><p className="mt-2">Sélectionnez une séance pour commencer.</p></div>}
        </>
      )}
    </TeacherShell>
  )
}
