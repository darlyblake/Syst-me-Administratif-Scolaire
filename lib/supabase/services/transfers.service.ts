import { supabaseBrowser } from "@/lib/supabase/client"

export type TransferSnapshot = {
  first_name: string
  last_name: string
  birth_date: string | null
  place_of_birth: string | null
  sex: string | null
  phone: string | null
  email: string | null
  guardian_first_name: string | null
  guardian_last_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  guardian_address: string | null
  guardian_relationship: string | null
  source_student_number: string | null
  source_class_name: string | null
  source_grade_name: string | null
}

export type StudentTransfer = {
  id: string
  code: string
  source_establishment_id: string
  source_establishment_name: string
  destination_establishment_id: string
  destination_establishment_name: string
  source_student_id: string
  requested_grade_level_id: string
  requested_grade_name: string
  reason: string
  student_snapshot: TransferSnapshot
  status: "pending" | "accepted" | "rejected" | "cancelled"
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
  destination_student_id: string | null
  destination_enrollment_id: string | null
  destination_enrollment_status: "pending" | "active" | "cancelled" | null
}

export type TransferClass = { id: string; name: string; grade_level_id: string }
export type TransferTuitionPlan = {
  id: string
  registration_fee: number
  annual_tuition: number
  payment_mode: string
  installment_count: number
}

export async function listStudentTransfers(establishmentId: string): Promise<StudentTransfer[]> {
  const { data, error } = await supabaseBrowser.rpc("list_student_transfers", {
    p_establishment_id: establishmentId,
  })
  if (error) throw new Error(error.message || "Impossible de charger les transferts.")
  return (data ?? []) as StudentTransfer[]
}

export async function createStudentTransfer(input: {
  sourceEstablishmentId: string
  studentId: string
  destinationEstablishmentId: string
  requestedGradeLevelId: string
  reason: string
}): Promise<{ id: string; code: string; status: "pending" }> {
  const { data, error } = await supabaseBrowser.rpc("create_student_transfer", {
    p_source_establishment_id: input.sourceEstablishmentId,
    p_student_id: input.studentId,
    p_destination_establishment_id: input.destinationEstablishmentId,
    p_requested_grade_level_id: input.requestedGradeLevelId,
    p_reason: input.reason,
  })
  if (error) throw new Error(error.message || "Impossible de créer le dossier de transfert.")
  return data as { id: string; code: string; status: "pending" }
}

export async function reviewStudentTransfer(input: {
  transferId: string
  decision: "accept" | "reject"
  classId?: string
  tuitionPlanId?: string
  rejectionReason?: string
}) {
  const { data, error } = await supabaseBrowser.rpc("review_student_transfer", {
    p_transfer_id: input.transferId,
    p_decision: input.decision,
    p_class_id: input.classId ?? null,
    p_tuition_plan_id: input.tuitionPlanId ?? null,
    p_rejection_reason: input.rejectionReason ?? null,
  })
  if (error) throw new Error(error.message || "Impossible de traiter le transfert.")
  return data as { id: string; status: "accepted" | "rejected"; next_step?: string }
}

export async function finalizeStudentTransfer(input: {
  transferId: string
  classId: string
  tuitionPlanId: string
}) {
  const { data, error } = await supabaseBrowser.rpc("finalize_student_transfer", {
    p_transfer_id: input.transferId,
    p_class_id: input.classId,
    p_tuition_plan_id: input.tuitionPlanId,
  })
  if (error) throw new Error(error.message || "Impossible de préparer l’inscription.")
  return data as {
    id: string
    status: "accepted"
    student_id: string
    enrollment_id: string
    enrollment_status: "pending" | "active"
    academic_year_id: string
  }
}

export async function canFinalizeStudentTransfers(establishmentId: string): Promise<boolean> {
  const { data, error } = await supabaseBrowser.rpc("can_finalize_student_transfers", {
    p_establishment_id: establishmentId,
  })
  if (error) throw new Error(error.message || "Impossible de vérifier les droits de finalisation.")
  return data === true
}

export async function getTransferDestinationOptions(
  establishmentId: string,
  gradeLevelId: string,
): Promise<{ academicYearId: string | null; classes: TransferClass[]; tuitionPlans: TransferTuitionPlan[] }> {
  const { data: year, error: yearError } = await supabaseBrowser
    .from("academic_years")
    .select("id")
    .eq("establishment_id", establishmentId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (yearError) throw new Error("Impossible de vérifier l’année scolaire active.")
  if (!year) return { academicYearId: null, classes: [], tuitionPlans: [] }

  const [classesResult, plansResult] = await Promise.all([
    supabaseBrowser
      .from("school_classes")
      .select("id,name,grade_level_id")
      .eq("establishment_id", establishmentId)
      .eq("grade_level_id", gradeLevelId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabaseBrowser
      .from("tuition_plans")
      .select("id,registration_fee,annual_tuition,payment_mode,installment_count")
      .eq("establishment_id", establishmentId)
      .eq("academic_year_id", year.id)
      .eq("grade_level_id", gradeLevelId)
      .eq("active", true),
  ])

  if (classesResult.error) throw new Error("Impossible de charger les classes d’accueil.")
  if (plansResult.error) throw new Error("Impossible de charger les plans de scolarité.")
  return {
    academicYearId: year.id,
    classes: (classesResult.data ?? []) as TransferClass[],
    tuitionPlans: (plansResult.data ?? []) as TransferTuitionPlan[],
  }
}
