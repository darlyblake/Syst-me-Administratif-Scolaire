import { supabase } from "@/lib/supabase"

export type TeacherAttachmentRequest = {
  id: string
  teacher_id: string
  establishment_id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  created_at: string
  reviewed_at: string | null
  review_note: string | null
  teacher: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    specialty: string | null
    employee_number: string | null
  } | null
}

export async function listTeacherAttachmentRequests(establishmentId: string) {
  const { data, error } = await supabase
    .from("teacher_establishment_requests")
    .select(`
      id,
      teacher_id,
      establishment_id,
      status,
      created_at,
      reviewed_at,
      review_note,
      teacher:teachers!teacher_establishment_requests_teacher_id_fkey(
        id,
        first_name,
        last_name,
        email,
        phone,
        specialty,
        employee_number
      )
    `)
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as TeacherAttachmentRequest[]
}

export async function approveTeacherAttachmentRequest(requestId: string, note?: string) {
  const { data, error } = await supabase.rpc("approve_teacher_establishment_request", {
    p_request_id: requestId,
    p_note: note?.trim() || null,
  })
  if (error) throw error
  return data as string
}

export async function rejectTeacherAttachmentRequest(requestId: string, note?: string) {
  const { error } = await supabase.rpc("reject_teacher_establishment_request", {
    p_request_id: requestId,
    p_note: note?.trim() || null,
  })
  if (error) throw error
}
