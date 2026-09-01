import { supabaseBrowser } from "@/lib/supabase/client"

export interface AffectationEnseignant {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  weekly_hours: number | null
}

interface ClassContext { id: string; establishment_id: string; grade_level_id: string }
interface SubjectContext { id: string; establishment_id: string; grade_level_id: string | null; level_scope: string | null; is_primary_generalist: boolean }
interface TeacherContext { id: string; establishment_id: string; active: boolean }

const normalize = (value: string | null | undefined) =>
  (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

async function validateAffectation(etablissementId: string, classId: string, subjectId: string, teacherId: string) {
  const [{ data: schoolClass, error: classError }, { data: subject, error: subjectError }, { data: teacher, error: teacherError }] = await Promise.all([
    supabaseBrowser.from("school_classes").select("id,establishment_id,grade_level_id").eq("id", classId).eq("establishment_id", etablissementId).eq("active", true).single(),
    supabaseBrowser.from("subjects").select("id,establishment_id,grade_level_id,level_scope,is_primary_generalist").eq("id", subjectId).eq("establishment_id", etablissementId).eq("active", true).single(),
    supabaseBrowser.from("teachers").select("id,establishment_id,active").eq("id", teacherId).eq("establishment_id", etablissementId).eq("active", true).single(),
  ])
  if (classError || !schoolClass) throw new Error("La classe sélectionnée est introuvable ou inactive.")
  if (subjectError || !subject) throw new Error("La matière sélectionnée est introuvable ou inactive.")
  if (teacherError || !teacher) throw new Error("L'enseignant sélectionné est introuvable ou inactif.")

  const c = schoolClass as ClassContext
  const s = subject as SubjectContext
  const t = teacher as TeacherContext

  if (c.establishment_id !== t.establishment_id || c.establishment_id !== s.establishment_id) {
    throw new Error("Classe, matière et enseignant doivent appartenir au même établissement.")
  }

  // Une matière ciblée par niveau ne peut être affectée à une classe d'un autre niveau.
  if (s.grade_level_id && s.grade_level_id !== c.grade_level_id) {
    throw new Error("Cette matière n'est pas configurée pour le niveau de cette classe.")
  }

  // Le niveau de la classe doit appartenir à une catégorie activée par l'établissement.
  const { data: grade, error: gradeError } = await supabaseBrowser
    .from("grade_levels")
    .select("id,cycle_id,education_cycles!inner(code,name)")
    .eq("id", c.grade_level_id)
    .eq("active", true)
    .single()
  if (gradeError || !grade) throw new Error("Le niveau académique de la classe est introuvable ou inactif.")

  const cycle = Array.isArray((grade as any).education_cycles) ? (grade as any).education_cycles[0] : (grade as any).education_cycles
  const scopeCandidates = [normalize(cycle?.code), normalize(cycle?.name)].filter(Boolean)
  const { data: enabled } = await supabaseBrowser
    .from("establishment_enabled_levels")
    .select("level_scope")
    .eq("establishment_id", etablissementId)
    .eq("enabled", true)
  const enabledScopes = (enabled ?? []).map((row: any) => normalize(row.level_scope))
  if (enabledScopes.length > 0 && !scopeCandidates.some(scope => enabledScopes.includes(scope))) {
    throw new Error("Le niveau de cette classe n'est pas activé dans les paramètres de l'établissement.")
  }
}

export async function obtenirAffectations(etablissementId: string): Promise<AffectationEnseignant[]> {
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .select("id,class_id,subject_id,teacher_id,weekly_hours,school_classes!inner(establishment_id)")
    .eq("school_classes.establishment_id", etablissementId)
  if (error) throw new Error(`Impossible de charger les affectations: ${error.message}`)
  return (data ?? []).map(({ id, class_id, subject_id, teacher_id, weekly_hours }) => ({ id, class_id, subject_id, teacher_id, weekly_hours }))
}

export async function creerAffectation(etablissementId: string, input: Omit<AffectationEnseignant, "id">): Promise<AffectationEnseignant> {
  await validateAffectation(etablissementId, input.class_id, input.subject_id, input.teacher_id)
  const { data, error } = await supabaseBrowser
    .from("class_subjects")
    .insert(input)
    .select("id,class_id,subject_id,teacher_id,weekly_hours")
    .single()
  if (error) throw new Error(`Impossible de créer l'affectation: ${error.message}`)
  return data as AffectationEnseignant
}

export async function modifierAffectation(id: string, changes: Partial<Omit<AffectationEnseignant, "id">>, etablissementId?: string) {
  if (changes.class_id || changes.subject_id || changes.teacher_id) {
    const { data: current, error } = await supabaseBrowser.from("class_subjects").select("class_id,subject_id,teacher_id").eq("id", id).single()
    if (error || !current) throw new Error("Affectation introuvable.")
    const establishmentId = etablissementId
    if (!establishmentId) throw new Error("L'établissement est obligatoire pour modifier une affectation.")
    await validateAffectation(establishmentId, changes.class_id ?? current.class_id, changes.subject_id ?? current.subject_id, changes.teacher_id ?? current.teacher_id)
  }
  const { data, error } = await supabaseBrowser.from("class_subjects").update(changes).eq("id", id).select("id,class_id,subject_id,teacher_id,weekly_hours").single()
  if (error) throw new Error(`Impossible de modifier l'affectation: ${error.message}`)
  return data as AffectationEnseignant
}

export async function supprimerAffectation(id: string) {
  const { error } = await supabaseBrowser.from("class_subjects").delete().eq("id", id)
  if (error) throw new Error(`Impossible de supprimer l'affectation: ${error.message}`)
}
