import { supabaseBrowser } from "@/lib/supabase/client"

export type TeacherAccountResult = {
  ok: boolean
  teacher_id: string
  user_id: string
  temporary_password?: string
}

async function invoke(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabaseBrowser.functions.invoke("manage-teacher-account", {
    body: { action, ...body },
  })
  if (error) throw new Error(error.message || "Impossible de contacter le service de comptes enseignants.")
  if (!data?.ok) throw new Error(data?.error || "Opération impossible.")
  return data as TeacherAccountResult
}

export function createTeacherAccount(input: {
  establishmentId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  employeeNumber?: string
  specialty?: string
  roleId: string
  password?: string
}) {
  return invoke("create_teacher_user", {
    establishment_id: input.establishmentId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    employee_number: input.employeeNumber,
    specialty: input.specialty,
    role_id: input.roleId,
    password: input.password,
  })
}

export function attachExistingTeacher(input: {
  establishmentId: string
  email: string
  roleId: string
}) {
  return invoke("attach_existing_teacher", {
    establishment_id: input.establishmentId,
    email: input.email,
    role_id: input.roleId,
  })
}
