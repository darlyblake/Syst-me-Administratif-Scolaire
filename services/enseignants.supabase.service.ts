import { supabaseBrowser } from "@/lib/supabase/client"
import type { DonneesEnseignant } from "@/types/models"

interface TeacherRow {
  id: string; establishment_id: string | null; profile_id: string | null; employee_number: string | null
  first_name: string; last_name: string; phone: string | null; email: string | null
  specialty: string | null; hire_date: string | null; active: boolean
}
interface AssignmentRow {
  class_id: string; subject_id: string; teacher_id: string | null
  school_classes?: { name: string | null; establishment_id: string | null } | null
  subjects?: { name: string | null } | null
}
const TEACHER_SELECT = "id,establishment_id,profile_id,employee_number,first_name,last_name,phone,email,specialty,hire_date,active"

const toTeacher = (row: TeacherRow, assignments: AssignmentRow[] = []): DonneesEnseignant => ({
  id: row.id,
  identifiant: row.employee_number ?? row.email ?? row.id,
  motDePasse: "",
  nom: row.last_name,
  prenom: row.first_name,
  telephone: row.phone ?? undefined,
  email: row.email ?? undefined,
  matieres: assignments.map(item => item.subjects?.name).filter((name): name is string => Boolean(name)),
  classes: assignments.map(item => item.school_classes?.name).filter((name): name is string => Boolean(name)),
  statut: row.active ? "actif" : "inactif",
  dateEmbauche: row.hire_date ?? undefined,
})

function generateEmployeeNumber(firstName: string, lastName: string) {
  const base = `${lastName.slice(0, 3)}${firstName.slice(0, 2)}`.toUpperCase().replace(/[^A-Z]/g, "") || "ENS"
  return `${base}-${Date.now().toString().slice(-6)}`
}

export async function obtenirEnseignantsSupabase(etablissementId: string): Promise<DonneesEnseignant[]> {
  if (!etablissementId) return []

  const { data: links, error: linkError } = await supabaseBrowser
    .from("teacher_establishments")
    .select("teacher_id")
    .eq("establishment_id", etablissementId)
    .eq("status", "active")

  if (linkError) throw new Error(`Impossible de charger les rattachements enseignants: ${linkError.message}`)

  const teacherIds = Array.from(new Set((links ?? []).map(row => row.teacher_id).filter(Boolean)))
  if (!teacherIds.length) return []

  const { data: teacherData, error: teacherError } = await supabaseBrowser
    .from("teachers")
    .select(TEACHER_SELECT)
    .in("id", teacherIds)
    .order("last_name")
    .order("first_name")

  if (teacherError) throw new Error(`Impossible de charger les enseignants: ${teacherError.message}`)

  const rows = (teacherData ?? []) as TeacherRow[]
  const ids = rows.map(row => row.id)

  const { data: assignmentData, error: assignmentError } = await supabaseBrowser
    .from("class_subjects")
    .select("class_id,subject_id,teacher_id,school_classes!inner(name,establishment_id),subjects(name)")
    .in("teacher_id", ids)
    .eq("school_classes.establishment_id", etablissementId)

  if (assignmentError) throw new Error(`Impossible de charger les affectations: ${assignmentError.message}`)

  const grouped = new Map<string, AssignmentRow[]>()
  for (const assignment of (assignmentData ?? []) as AssignmentRow[]) {
    if (!assignment.teacher_id) continue
    grouped.set(assignment.teacher_id, [...(grouped.get(assignment.teacher_id) ?? []), assignment])
  }

  return rows.map(row => toTeacher(row, grouped.get(row.id) ?? []))
}

export async function creerEnseignantSupabase(etablissementId: string, input: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): Promise<DonneesEnseignant> {
  if (!etablissementId) throw new Error("Établissement actif introuvable")

  const { data, error } = await supabaseBrowser.from("teachers").insert({
    establishment_id: etablissementId,
    employee_number: generateEmployeeNumber(input.prenom, input.nom),
    first_name: input.prenom.trim(),
    last_name: input.nom.trim(),
    phone: input.telephone?.trim() || null,
    email: input.email?.trim() || null,
    specialty: input.matieres?.[0] || null,
    hire_date: input.dateEmbauche || null,
    active: input.statut !== "inactif",
  }).select(TEACHER_SELECT).single()

  if (error) throw new Error(`Impossible de créer l'enseignant: ${error.message}`)

  const teacher = data as TeacherRow
  const { error: membershipError } = await supabaseBrowser.from("teacher_establishments").upsert({
    teacher_id: teacher.id,
    establishment_id: etablissementId,
    status: teacher.active ? "active" : "inactive",
  }, { onConflict: "teacher_id,establishment_id" })

  if (membershipError) throw new Error(`Impossible d'enregistrer l'enseignant dans l'établissement: ${membershipError.message}`)
  return toTeacher(teacher)
}

export async function modifierEnseignantSupabase(id: string, changes: Partial<DonneesEnseignant>, etablissementId?: string): Promise<boolean> {
  const payload: Record<string, unknown> = {}
  if (changes.nom !== undefined) payload.last_name = changes.nom.trim()
  if (changes.prenom !== undefined) payload.first_name = changes.prenom.trim()
  if (changes.email !== undefined) payload.email = changes.email?.trim() || null
  if (changes.telephone !== undefined) payload.phone = changes.telephone?.trim() || null
  if (changes.dateEmbauche !== undefined) payload.hire_date = changes.dateEmbauche || null
  if (changes.statut !== undefined) payload.active = changes.statut === "actif"
  if (changes.matieres?.length) payload.specialty = changes.matieres[0]
  if (!Object.keys(payload).length) return true

  const { error } = await supabaseBrowser.from("teachers").update(payload).eq("id", id)
  if (error) throw new Error(`Impossible de modifier l'enseignant: ${error.message}`)

  if (changes.statut !== undefined && etablissementId) {
    const { error: membershipError } = await supabaseBrowser
      .from("teacher_establishments")
      .update({ status: changes.statut === "actif" ? "active" : "inactive" })
      .eq("teacher_id", id)
      .eq("establishment_id", etablissementId)

    if (membershipError) throw new Error(`Impossible de mettre à jour le rattachement établissement: ${membershipError.message}`)
  }
  return true
}

export async function archiverEnseignantSupabase(id: string, etablissementId?: string): Promise<boolean> {
  if (!etablissementId) throw new Error("Établissement actif introuvable")

  const { error } = await supabaseBrowser
    .from("teacher_establishments")
    .update({ status: "inactive" })
    .eq("teacher_id", id)
    .eq("establishment_id", etablissementId)

  if (error) throw new Error(`Impossible de désactiver le rattachement enseignant: ${error.message}`)

  return true
}

export async function supprimerEnseignantSupabase(id: string): Promise<boolean> {
  const { error } = await supabaseBrowser.from("teachers").delete().eq("id", id)
  if (error) throw new Error(`Impossible de supprimer l'enseignant: ${error.message}`)
  return true
}
