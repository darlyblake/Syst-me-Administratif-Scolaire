"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarPlus, CheckCircle2, Loader2, Save, Search } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherAssessment, type TeacherAssessmentStudent } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function NotesEnseignantPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const [assessments, setAssessments] = useState<TeacherAssessment[]>([]); const [selected, setSelected] = useState<TeacherAssessment | null>(null)
  const [students, setStudents] = useState<TeacherAssessmentStudent[]>([]); const [scores, setScores] = useState<Record<string, string>>({}); const [comments, setComments] = useState<Record<string, string>>({}); const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<Array<{ slot_id: string; academic_year_id: string; class_id: string; class_name: string; subject_id: string; subject_name: string }>>([])
  const [programmingOpen, setProgrammingOpen] = useState(false)
  const [assessmentTitle, setAssessmentTitle] = useState("")
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [assessmentMax, setAssessmentMax] = useState("20")
  const [gradePeriods, setGradePeriods] = useState<Array<{ id: string; academic_year_id: string; period_number: number; label: string; period_type: string; start_date: string; end_date: string; entry_open: boolean; is_current: boolean }>>([])
  const [assessmentClassSubject, setAssessmentClassSubject] = useState("")
  const [programmingSaving, setProgrammingSaving] = useState(false)
  const establishment = contexte?.establishments?.find((item) => item.id === id)

  useEffect(() => { if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) router.replace("/enseignant") }, [estEnCoursDeChargement, utilisateur, establishment, router])
  useEffect(() => {
    if (!establishment || !id) return
    setLoading(true)
    Promise.all([enseignantPortalService.getAssessments(id), enseignantPortalService.getSchedule(id), enseignantPortalService.getGradePeriods(id)])
      .then(([assessmentRows, scheduleRows, periodRows]) => {
        setAssessments(assessmentRows)
        setGradePeriods(periodRows)
        setSchedule(scheduleRows.map((s) => ({
          slot_id: s.slot_id,
          academic_year_id: s.academic_year_id,
          class_id: s.class_id,
          class_name: s.class_name,
          subject_id: s.subject_id,
          subject_name: s.subject_name,
        })))
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Impossible de charger les évaluations."))
      .finally(() => setLoading(false))
  }, [id, establishment])

  const classSubjects = useMemo(() => {
    const map = new Map<string, { academic_year_id: string; class_id: string; class_name: string; subject_id: string; subject_name: string }>()
    schedule.forEach((s) => {
      const key = `${s.class_id}:${s.subject_id}`
      if (!map.has(key)) map.set(key, {
        academic_year_id: s.academic_year_id,
        class_id: s.class_id,
        class_name: s.class_name,
        subject_id: s.subject_id,
        subject_name: s.subject_name,
      })
    })
    return Array.from(map.values()).sort((a, b) => `${a.class_name} ${a.subject_name}`.localeCompare(`${b.class_name} ${b.subject_name}`))
  }, [schedule])

  const programAssessment = async () => {
    const selectedPair = classSubjects.find((item) => `${item.class_id}:${item.subject_id}` === assessmentClassSubject)
    const maxScore = Number(assessmentMax.replace(",", "."))
    const activePeriod = gradePeriods.find((period) => period.entry_open && period.is_current) ?? gradePeriods.find((period) => period.entry_open)
    if (!selectedPair || !assessmentTitle.trim() || !assessmentDate || !activePeriod || !Number.isFinite(maxScore) || maxScore <= 0) {
      setMessage(!activePeriod ? "Aucune période de saisie des notes n’est ouverte par l’établissement." : "Renseignez le titre, la classe/matière, la date et un barème valide.")
      return
    }
    setProgrammingSaving(true)
    setMessage(null)
    try {
      await enseignantPortalService.createAssessment({
        establishmentId: id,
        academicYearId: selectedPair.academic_year_id,
        classId: selectedPair.class_id,
        subjectId: selectedPair.subject_id,
        title: assessmentTitle.trim(),
        assessmentDate,
        maxScore,
        term: activePeriod.label,
      })
      const refreshed = await enseignantPortalService.getAssessments(id)
      setAssessments(refreshed)
      setProgrammingOpen(false)
      setAssessmentTitle("")
      setMessage("Évaluation programmée. Vous pouvez maintenant saisir les notes.")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible de programmer l'évaluation.")
    } finally {
      setProgrammingSaving(false)
    }
  }

  const openAssessment = async (assessment: TeacherAssessment) => { setSelected(assessment); setMessage(null); setSearch(""); try { const rows = await enseignantPortalService.getAssessmentStudents(assessment.assessment_id); setStudents(rows); setScores(Object.fromEntries(rows.map((r) => [r.student_id, r.score == null ? "" : String(r.score)]))); setComments(Object.fromEntries(rows.map((r) => [r.student_id, r.comment ?? ""]))) } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible de charger les élèves.") } }
  const filteredStudents = useMemo(() => { const q = search.trim().toLowerCase(); if (!q) return students; return students.filter((s) => `${s.last_name} ${s.first_name} ${s.student_number ?? ""}`.toLowerCase().includes(q)) }, [students, search])
  const completed = students.filter((s) => scores[s.student_id]?.trim() !== "").length
  const save = async (student: TeacherAssessmentStudent) => { if (!selected) return; const raw = scores[student.student_id]?.replace(",", ".").trim(); const score = Number(raw); if (!raw || !Number.isFinite(score) || score < 0 || score > selected.max_score) { setMessage(`La note doit être comprise entre 0 et ${selected.max_score}.`); return }; setSaving(student.student_id); setMessage(null); try { await enseignantPortalService.recordGrade(selected.assessment_id, student.student_id, score, comments[student.student_id]); setStudents((current) => current.map((r) => r.student_id === student.student_id ? { ...r, score, comment: comments[student.student_id] || null } : r)); if (student.score == null) setAssessments((current) => current.map((r) => r.assessment_id === selected.assessment_id ? { ...r, grade_count: r.grade_count + 1 } : r)); setMessage(`Note de ${student.last_name} ${student.first_name} enregistrée.`) } catch (e) { setMessage(e instanceof Error ? e.message : "Enregistrement impossible.") } finally { setSaving(null) } }

  if (estEnCoursDeChargement || !utilisateur || !establishment) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  return <TeacherShell establishmentId={id} establishmentName={establishment.name} active="notes"><div className="mx-auto max-w-7xl">
    <header className="border-b border-[#e4e6ef] pb-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Suivi pédagogique</p><h1 className="mt-1 text-2xl font-bold text-[#202532]">Notes</h1><p className="mt-1 text-sm text-[#6d7280]">{establishment.name} · évaluations et saisie des notes</p></div><button type="button" onClick={() => setProgrammingOpen(true)} className="inline-flex h-10 items-center gap-2 bg-[#0b2b83] px-4 text-sm font-semibold text-white hover:bg-[#09246e]"><CalendarPlus className="h-4 w-4" />Programmer une évaluation</button></div></header>
    {message && <div role="status" className="mb-5 rounded-md border bg-white p-3 text-sm">{message}</div>}
    {programmingOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 p-3 sm:p-5" role="dialog" aria-modal="true"><section className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-[#cfd4df] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)]"><div className="flex items-start justify-between gap-5 border-b border-[#dfe3ea] bg-[#f7f8fa] px-5 py-4 sm:px-6"><div><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#3152c8]">Notes</p><h2 className="mt-1 text-lg font-bold text-[#202532]">Programmer une évaluation</h2><p className="mt-1 text-sm text-[#6d7280]">La classe et la matière sont limitées à vos enseignements.</p></div><button type="button" onClick={() => setProgrammingOpen(false)} className="inline-flex h-8 items-center border border-[#d6dae3] bg-white px-3 text-xs font-semibold text-[#4f5665] hover:bg-[#f1f3f6]">Fermer</button></div><CardContent className="grid gap-4 overflow-y-auto px-5 py-5 sm:px-6 md:grid-cols-2">
      <div className="md:col-span-2"><label className="text-sm font-medium">Intitulé</label><Input className="mt-1 border-[#cfd4df] focus-visible:border-[#3152c8] focus-visible:ring-[#3152c8]/10" value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="Ex. Contrôle de mathématiques" /></div>
      <div><label className="text-sm font-medium">Classe et matière</label><select className="mt-1 h-10 w-full border border-[#cfd4df] bg-white px-3 text-sm outline-none focus:border-[#3152c8]" value={assessmentClassSubject} onChange={(e) => setAssessmentClassSubject(e.target.value)}><option value="">Sélectionner</option>{classSubjects.map((item) => <option key={`${item.class_id}:${item.subject_id}`} value={`${item.class_id}:${item.subject_id}`}>{item.class_name} · {item.subject_name}</option>)}</select></div>
      <div><label className="text-sm font-medium">Date</label><Input className="mt-1 border-[#cfd4df] focus-visible:border-[#3152c8] focus-visible:ring-[#3152c8]/10" type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Barème</label><Input className="mt-1 border-[#cfd4df] focus-visible:border-[#3152c8] focus-visible:ring-[#3152c8]/10" type="number" min="0.5" step="0.5" value={assessmentMax} onChange={(e) => setAssessmentMax(e.target.value)} /></div>
      <div><label className="text-sm font-medium">Période de saisie</label><div className="mt-1 flex h-10 items-center border border-[#d8dce4] bg-[#f3f4f6] px-3 text-sm text-[#626978]">{(gradePeriods.find((period) => period.entry_open && period.is_current) ?? gradePeriods.find((period) => period.entry_open))?.label ?? "Aucune période ouverte"}</div></div>
      <div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setProgrammingOpen(false)}>Annuler</Button><Button onClick={() => void programAssessment()} disabled={programmingSaving || !gradePeriods.some((period) => period.entry_open)}>{programmingSaving ? "Programmation…" : "Programmer l'évaluation"}</Button></div>
    </CardContent></section></div>}

    {!selected ? <Card className="border border-[#dfe2eb] bg-white"><CardHeader><CardTitle className="text-base">Choisissez une évaluation</CardTitle></CardHeader><CardContent>{loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : assessments.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Aucune évaluation disponible.</p> : <div className="divide-y">{assessments.map((a) => <button key={a.assessment_id} type="button" onClick={() => void openAssessment(a)} className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-4 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2"><div className="min-w-0"><p className="font-medium">{a.title}</p><p className="truncate text-sm text-muted-foreground">{a.class_name} · {a.subject_name} · {a.term ?? "Période non précisée"}</p></div><div className="shrink-0 text-right text-sm"><p>{a.assessment_date}</p><p className="text-muted-foreground">{a.grade_count} note(s) saisie(s)</p></div></button>)}</div>}</CardContent></Card> : <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{selected.title}</h2><p className="text-sm text-muted-foreground">{selected.class_name} · {selected.subject_name} · note sur {selected.max_score}</p></div><Button variant="outline" onClick={() => setSelected(null)}>Changer d’évaluation</Button></div>
      <Card className="mb-5 border border-[#dfe2eb] bg-white"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="border border-[#dfe2eb] bg-[#f7f8fb] p-2"><CheckCircle2 className="h-4 w-4" /></div><div><p className="text-sm font-medium">Progression de la saisie</p><p className="text-xs text-muted-foreground">{completed} sur {students.length} élève(s) renseigné(s)</p></div></div><div className="h-2 w-full max-w-xs overflow-hidden bg-[#e6e8ee]"><div className="h-full bg-[#0b2b83] transition-all" style={{ width: `${students.length ? Math.round(completed / students.length * 100) : 0}%` }} /></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Rechercher un élève" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève…" /></div></CardContent></Card>
      <Card className="border border-[#dfe2eb] bg-white"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b bg-muted/30 text-left text-muted-foreground"><tr><th className="px-5 py-3">Élève</th><th className="px-5 py-3">Note / {selected.max_score}</th><th className="px-5 py-3">Commentaire</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{filteredStudents.map((s) => <tr key={s.student_id}><td className="px-5 py-3 font-medium">{s.last_name} {s.first_name}<span className="ml-2 text-xs font-normal text-muted-foreground">{s.student_number ?? ""}</span></td><td className="w-36 px-5 py-3"><Input inputMode="decimal" aria-label={`Note de ${s.last_name} ${s.first_name}`} value={scores[s.student_id] ?? ""} onChange={(e) => setScores((c) => ({ ...c, [s.student_id]: e.target.value }))} /></td><td className="px-5 py-3"><Input value={comments[s.student_id] ?? ""} onChange={(e) => setComments((c) => ({ ...c, [s.student_id]: e.target.value }))} placeholder="Facultatif" /></td><td className="px-5 py-3 text-right"><Button size="sm" onClick={() => void save(s)} disabled={saving === s.student_id}>{saving === s.student_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving === s.student_id ? "Enregistrement…" : "Enregistrer"}</Button></td></tr>)}</tbody></table></div>{filteredStudents.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{search ? "Aucun élève trouvé." : "Aucun élève inscrit à cette évaluation."}</p>}</CardContent></Card>
    </div>}
  </div></TeacherShell>
}