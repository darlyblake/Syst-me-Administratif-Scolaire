"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Edit, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseBrowser } from "@/lib/supabase/client"
import { serviceMatieres } from "@/services/matieres.service"
import { getEnabledEstablishmentScopes, getEnabledGradeLevels, type EstablishmentLevelScope, type GradeLevel } from "@/services/establishment-levels.service"
import type { Matiere } from "@/types/models"

type SchoolClass = { id: string; name: string; grade_level_id: string }
type Teacher = { id: string; first_name: string; last_name: string }
type ClassSubjectAssignment = { id: string; class_id: string; subject_id: string; teacher_id: string; weekly_hours: number }

type FormState = {
  code: string
  nom: string
  gradeLevelId: string
  coefficient: number
  description: string
  scope: EstablishmentLevelScope
  primaryGeneralist: boolean
}

const EMPTY_FORM: FormState = {
  code: "",
  nom: "",
  gradeLevelId: "",
  coefficient: 1,
  description: "",
  scope: "secondary",
  primaryGeneralist: false,
}

const SCOPE_LABELS: Record<EstablishmentLevelScope, string> = {
  pre_primary: "Pré-primaire",
  primary: "Primaire",
  secondary: "Secondaire",
  high_school: "Lycée",
  university: "Université",
  center: "Centre",
}

export default function MatieresPage() {
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const [scopes, setScopes] = useState<EstablishmentLevelScope[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [assignmentSubjectId, setAssignmentSubjectId] = useState("")
  const [assignmentTeacherId, setAssignmentTeacherId] = useState("")
  const [assignmentHours, setAssignmentHours] = useState(2)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [assignmentSaving, setAssignmentSaving] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<Matiere | null>(null)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedScope, setSelectedScope] = useState<EstablishmentLevelScope | "all">("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const levelsById = useMemo(() => new Map(gradeLevels.map((level) => [level.id, level])), [gradeLevels])
  const visibleLevels = useMemo(
    () => gradeLevels.filter((level) => selectedScope === "all" || level.scope === selectedScope),
    [gradeLevels, selectedScope]
  )

  const selectedClass = useMemo(() => classes.find((item) => item.id === selectedClassId) ?? null, [classes, selectedClassId])
  const compatibleSubjects = useMemo(() => matieres.filter((subject) => selectedClass && subject.niveau.includes(selectedClass.grade_level_id)), [matieres, selectedClass])
  const classAssignments = useMemo(() => assignments.filter((item) => item.class_id === selectedClassId), [assignments, selectedClassId])

  const filteredMatieres = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return matieres.filter((matiere) => {
      const level = levelsById.get(matiere.niveau[0])
      const matchesScope = selectedScope === "all" || level?.scope === selectedScope
      const matchesSearch = !query || matiere.nom.toLowerCase().includes(query) || matiere.code.toLowerCase().includes(query)
      return matchesScope && matchesSearch
    })
  }, [matieres, searchTerm, selectedScope, levelsById])

  async function resolveEstablishmentId() {
    const { data: { user } } = await supabaseBrowser.auth.getUser()
    if (!user) throw new Error("Session expirée. Veuillez vous reconnecter.")
    const { data, error: memberError } = await supabaseBrowser
      .from("establishment_members")
      .select("establishment_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle()
    if (memberError) throw new Error(`Impossible de déterminer l'établissement: ${memberError.message}`)
    if (!data?.establishment_id) throw new Error("Aucun établissement actif n'est associé à votre compte.")
    return data.establishment_id as string
  }

  async function charger() {
    setLoading(true)
    setError(null)
    try {
      const id = etablissementId ?? await resolveEstablishmentId()
      setEtablissementId(id)
      const [enabledScopes, levels, subjects, classResult, teacherResult] = await Promise.all([
        getEnabledEstablishmentScopes(id),
        getEnabledGradeLevels(id),
        serviceMatieres.obtenirToutesLesMatieres(id),
        supabaseBrowser.from("school_classes").select("id,name,grade_level_id").eq("establishment_id", id).eq("active", true).order("name"),
        supabaseBrowser.from("teachers").select("id,first_name,last_name").eq("establishment_id", id).eq("active", true).order("last_name"),
      ])
      if (classResult.error) throw new Error("Impossible de charger les classes: " + classResult.error.message)
      if (teacherResult.error) throw new Error("Impossible de charger les enseignants: " + teacherResult.error.message)
      const loadedClasses = (classResult.data ?? []) as SchoolClass[]
      setScopes(enabledScopes)
      setGradeLevels(levels)
      setMatieres(subjects)
      setClasses(loadedClasses)
      setTeachers((teacherResult.data ?? []) as Teacher[])
      if (!selectedClassId && loadedClasses.length) setSelectedClassId(loadedClasses[0].id)
      const classIds = loadedClasses.map((item) => item.id)
      if (classIds.length) {
        const { data: assignmentRows, error: assignmentLoadError } = await supabaseBrowser
          .from("class_subjects")
          .select("id,class_id,subject_id,teacher_id,weekly_hours")
          .in("class_id", classIds)
        if (assignmentLoadError) throw new Error("Impossible de charger les affectations: " + assignmentLoadError.message)
        setAssignments((assignmentRows ?? []) as ClassSubjectAssignment[])
      } else {
        setAssignments([])
      }
      if (selectedScope !== "all" && !enabledScopes.includes(selectedScope)) setSelectedScope("all")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les matières.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void charger() }, [])

  function ouvrirAjout() {
    const firstLevel = gradeLevels[0]
    setEditing(null)
    setForm({ ...EMPTY_FORM, gradeLevelId: firstLevel?.id ?? "", scope: firstLevel?.scope ?? scopes[0] ?? "secondary", primaryGeneralist: firstLevel?.scope === "primary" })
    setOpen(true)
  }

  function ouvrirEdition(matiere: Matiere) {
    const level = levelsById.get(matiere.niveau[0])
    setEditing(matiere)
    setForm({
      code: matiere.code,
      nom: matiere.nom,
      gradeLevelId: level?.id ?? "",
      coefficient: Number(matiere.coefficient) || 1,
      description: matiere.description ?? "",
      scope: level?.scope ?? scopes[0] ?? "secondary",
      primaryGeneralist: level?.scope === "primary",
    })
    setOpen(true)
  }

  async function enregistrer() {
    if (!etablissementId || !form.code.trim() || !form.nom.trim() || !form.gradeLevelId) {
      setError("Le code, le nom et le niveau sont obligatoires.")
      return
    }
    const level = levelsById.get(form.gradeLevelId)
    if (!level || !scopes.includes(level.scope)) {
      setError("Ce niveau n'est pas activé pour cet établissement.")
      return
    }
    const duplicateName = matieres.some((item) => item.nom.trim().toLocaleLowerCase() === form.nom.trim().toLocaleLowerCase() && item.id !== editing?.id)
    if (duplicateName) {
      setError("Une matière portant déjà ce nom existe dans cet établissement.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.nom.trim(),
        coefficient: Math.max(1, Number(form.coefficient) || 1),
        description: form.description.trim() || null,
        grade_level_id: level.id,
        level_scope: level.scope,
        is_primary_generalist: level.scope === "primary" && form.primaryGeneralist,
      }
      if (editing) await serviceMatieres.modifierMatiere(editing.id, etablissementId, payload)
      else await serviceMatieres.ajouterMatiere(etablissementId, payload)
      setOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      await charger()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la matière.")
    } finally {
      setSaving(false)
    }
  }

  async function supprimer(id: string) {
    if (!window.confirm("Archiver cette matière ? Elle ne sera plus proposée dans les nouvelles affectations.")) return
    try {
      if (!etablissementId) throw new Error("Établissement non identifié.")
      await serviceMatieres.supprimerMatiere(id, etablissementId)
      await charger()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'archiver la matière.")
    }
  }

  function resetAssignmentForm() {
    setEditingAssignmentId(null)
    setAssignmentSubjectId("")
    setAssignmentTeacherId("")
    setAssignmentHours(2)
    setAssignmentError(null)
  }

  function editAssignment(assignment: ClassSubjectAssignment) {
    setEditingAssignmentId(assignment.id)
    setAssignmentSubjectId(assignment.subject_id)
    setAssignmentTeacherId(assignment.teacher_id)
    setAssignmentHours(Number(assignment.weekly_hours) || 2)
    setAssignmentError(null)
  }

  async function enregistrerAffectation() {
    if (!etablissementId || !selectedClass || !assignmentSubjectId || !assignmentTeacherId) {
      setAssignmentError("Sélectionnez une classe, une matière et un enseignant.")
      return
    }
    if (!compatibleSubjects.some((subject) => subject.id === assignmentSubjectId)) {
      setAssignmentError("Cette matière ne correspond pas au niveau de la classe sélectionnée.")
      return
    }
    if (!teachers.some((teacher) => teacher.id === assignmentTeacherId)) {
      setAssignmentError("L’enseignant sélectionné n’est pas actif dans cet établissement.")
      return
    }
    if (!Number.isFinite(assignmentHours) || assignmentHours <= 0 || assignmentHours > 40) {
      setAssignmentError("Le volume horaire doit être compris entre 0 et 40 heures par semaine.")
      return
    }
    setAssignmentSaving(true)
    setAssignmentError(null)
    try {
      const duplicate = assignments.find((item) => item.class_id === selectedClassId && item.subject_id === assignmentSubjectId && item.id !== editingAssignmentId)
      if (duplicate) throw new Error("Cette matière est déjà affectée à cette classe. Modifiez l’affectation existante.")
      if (editingAssignmentId) {
        const { error: updateError } = await supabaseBrowser.from("class_subjects").update({ teacher_id: assignmentTeacherId, weekly_hours: assignmentHours }).eq("id", editingAssignmentId).eq("class_id", selectedClassId)
        if (updateError) throw new Error(updateError.message)
      } else {
        const { error: insertError } = await supabaseBrowser.from("class_subjects").insert({ class_id: selectedClassId, subject_id: assignmentSubjectId, teacher_id: assignmentTeacherId, weekly_hours: assignmentHours })
        if (insertError) throw new Error(insertError.message)
      }
      await charger()
      resetAssignmentForm()
    } catch (e) {
      setAssignmentError(e instanceof Error ? e.message : "Impossible d’enregistrer l’affectation.")
    } finally {
      setAssignmentSaving(false)
    }
  }

  async function supprimerAffectation(assignment: ClassSubjectAssignment) {
    if (!window.confirm("Retirer cette matière de la classe ? Si elle est déjà utilisée dans un emploi du temps, la suppression peut être refusée.")) return
    setAssignmentError(null)
    try {
      const { error: deleteError } = await supabaseBrowser.from("class_subjects").delete().eq("id", assignment.id).eq("class_id", selectedClassId)
      if (deleteError) throw new Error(deleteError.message)
      await charger()
      if (editingAssignmentId === assignment.id) resetAssignmentForm()
    } catch (e) {
      setAssignmentError(e instanceof Error ? e.message : "Impossible de retirer cette affectation.")
    }
  }
  return (
    <div className="w-full min-w-0">
        <header className="flex flex-col gap-3 border-b border-[#c5c5d3]/45 pb-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            
            <div>
              <h1 className="text-[23px] font-semibold leading-7 text-[#131b2e]">Matières</h1>
              <p className="mt-0.5 text-[12px] text-[#515f74]">Référentiel des matières et niveaux d'enseignement</p>
            </div>
          </div>
          <Button onClick={ouvrirAjout} disabled={loading || gradeLevels.length === 0} className="h-8 rounded bg-[#1e3a8a] px-3 text-[11px] hover:bg-[#00236f]">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Nouvelle matière
          </Button>
        </header>

        {error && (
          <div role="alert" className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="mt-3 border border-[#c5c5d3]/60 bg-white p-2">
          <Input
            className="h-9 min-w-0 flex-1 rounded border-[#c5c5d3]/70 text-[12px]"
            placeholder="Rechercher par nom ou code"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher une matière"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button variant={selectedScope === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedScope("all")}>Tous</Button>
            {scopes.map((scope) => (
              <Button key={scope} variant={selectedScope === scope ? "default" : "outline"} size="sm" onClick={() => setSelectedScope(scope)} className="h-8 shrink-0 rounded text-[11px]">
                {SCOPE_LABELS[scope]}
              </Button>
            ))}
          </div>
        </section>

        <section aria-label="Liste des matières" className="mt-2 overflow-hidden border border-[#c5c5d3]/60 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-[#c5c5d3]/60 bg-[#f2f3ff]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74]">Code</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74]">Matière</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74]">Niveau</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74]">Catégorie</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74]">Coefficient</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chargement des matières…</td></tr>
                ) : filteredMatieres.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      {gradeLevels.length === 0 ? "Aucun niveau activé dans les paramètres de l'établissement." : "Aucune matière trouvée."}
                    </td>
                  </tr>
                ) : (
                  filteredMatieres.map((matiere) => {
                    const level = levelsById.get(matiere.niveau[0])
                    return (
                      <tr key={matiere.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{matiere.code}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{matiere.nom}</div>
                          {matiere.description && <div className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{matiere.description}</div>}
                        </td>
                        <td className="px-3 py-2">{level?.name ?? "—"}</td>
                        <td className="px-3 py-2">{level?.scope ? SCOPE_LABELS[level.scope] : "—"}</td>
                        <td className="px-3 py-2">{matiere.coefficient}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => ouvrirEdition(matiere)}>
                              <Edit className="mr-1.5 h-4 w-4" />Modifier
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void supprimer(matiere.id)} aria-label={`Archiver ${matiere.nom}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {!loading && filteredMatieres.length > 0 && (
          <div className="border-t border-[#c5c5d3]/45 px-2 py-2 text-[11px] text-[#515f74]">{filteredMatieres.length} matière(s) affichée(s) sur {matieres.length}.</div>
        )}

      <section aria-label="Affectation des matières aux classes" className="mt-6 border border-[#c5c5d3]/60 bg-white">
        <div className="border-b border-[#c5c5d3]/60 px-3 py-3">
          <h2 className="text-base font-semibold text-[#131b2e]">Affectation aux classes et aux enseignants</h2>
          <p className="mt-1 text-xs text-[#515f74]">Choisissez une classe, puis affectez une matière et un enseignant avec son volume horaire hebdomadaire.</p>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_140px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="assignment-class">Classe</Label>
            <select id="assignment-class" value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); resetAssignmentForm() }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Sélectionner une classe</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-subject">Matière</Label>
            <select id="assignment-subject" value={assignmentSubjectId} onChange={(e) => setAssignmentSubjectId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!selectedClassId || compatibleSubjects.length === 0}>
              <option value="">Sélectionner une matière</option>
              {compatibleSubjects.map((item) => <option key={item.id} value={item.id}>{item.nom} ({item.code})</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-teacher">Enseignant</Label>
            <select id="assignment-teacher" value={assignmentTeacherId} onChange={(e) => setAssignmentTeacherId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!selectedClassId || teachers.length === 0}>
              <option value="">Sélectionner un enseignant</option>
              {teachers.map((item) => <option key={item.id} value={item.id}>{item.last_name} {item.first_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-hours">Heures / semaine</Label>
            <Input id="assignment-hours" type="number" min="0.5" max="40" step="0.5" value={assignmentHours} onChange={(e) => setAssignmentHours(Number(e.target.value))} />
          </div>
          <Button onClick={() => void enregistrerAffectation()} disabled={assignmentSaving || !selectedClassId || !assignmentSubjectId || !assignmentTeacherId} className="h-10 rounded bg-[#1e3a8a] hover:bg-[#00236f]">
            {assignmentSaving ? "Enregistrement…" : editingAssignmentId ? "Enregistrer" : <><Plus className="mr-1.5 h-4 w-4" />Affecter</>}
          </Button>
          {editingAssignmentId && <div className="md:col-span-5"><Button variant="outline" size="sm" onClick={resetAssignmentForm}>Annuler la modification</Button></div>}
        </div>
        {assignmentError && <div role="alert" className="mx-3 mb-3 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{assignmentError}</div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead className="border-y border-[#c5c5d3]/60 bg-[#f2f3ff]"><tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#515f74]">Matière</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#515f74]">Enseignant</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-[#515f74]">Heures / semaine</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-[#515f74]">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {!selectedClassId ? <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">Sélectionnez une classe pour voir ses affectations.</td></tr>
              : classAssignments.length === 0 ? <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">{compatibleSubjects.length === 0 ? "Aucune matière active n’est configurée pour le niveau de cette classe." : "Aucune matière affectée à cette classe pour le moment."}</td></tr>
              : classAssignments.map((assignment) => {
                const subject = matieres.find((item) => item.id === assignment.subject_id)
                const teacher = teachers.find((item) => item.id === assignment.teacher_id)
                return <tr key={assignment.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{subject ? subject.nom + " (" + subject.code + ")" : "Matière archivée ou indisponible"}</td>
                  <td className="px-3 py-2">{teacher ? teacher.last_name + " " + teacher.first_name : "Enseignant indisponible"}</td>
                  <td className="px-3 py-2">{Number(assignment.weekly_hours)} h</td>
                  <td className="px-3 py-2"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => editAssignment(assignment)}><Edit className="mr-1.5 h-4 w-4" />Modifier</Button><Button variant="ghost" size="sm" onClick={() => void supprimerAffectation(assignment)} aria-label="Retirer l’affectation"><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        {selectedClass && <div className="border-t border-[#c5c5d3]/45 px-3 py-2 text-[11px] text-[#515f74]">{selectedClass.name} · {classAssignments.length} affectation(s)</div>}
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier la matière" : "Nouvelle matière"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="subject-code">Code *</Label><Input id="subject-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAT" /></div>
              <div className="space-y-2"><Label htmlFor="subject-coefficient">Coefficient *</Label><Input id="subject-coefficient" type="number" min="1" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: Number(e.target.value) || 1 })} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="subject-name">Nom *</Label><Input id="subject-name" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Mathématiques" /></div>
            <div className="space-y-2"><Label htmlFor="subject-scope">Catégorie</Label><select id="subject-scope" value={form.scope} onChange={(e) => { const scope = e.target.value as EstablishmentLevelScope; const first = gradeLevels.find((l) => l.scope === scope); setForm({ ...form, scope, gradeLevelId: first?.id ?? "", primaryGeneralist: scope === "primary" }) }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="" disabled>Sélectionner</option>{scopes.map((scope) => <option key={scope} value={scope}>{SCOPE_LABELS[scope]}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="subject-level">Niveau *</Label><select id="subject-level" value={form.gradeLevelId} onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un niveau</option>{visibleLevels.filter((l) => l.scope === form.scope).map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></div>
            {form.scope === "primary" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.primaryGeneralist} onChange={(e) => setForm({ ...form, primaryGeneralist: e.target.checked })} />Enseignant polyvalent pour le primaire</label>}
            <div className="space-y-2"><Label htmlFor="subject-description">Description</Label><textarea id="subject-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Description de la matière..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => void enregistrer()} disabled={saving || !form.gradeLevelId}>{saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

}
