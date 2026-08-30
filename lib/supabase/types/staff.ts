export type PersonnelRole = "director" | "secretary" | "accountant" | "custodian" | "counselor" | "nurse" | "other"

export interface Staff {
  id: string
  establishment_id: string
  first_name: string
  last_name: string
  full_name?: string | null
  position?: string | null
  employee_number?: string | null
  email?: string | null
  phone?: string | null
  role: PersonnelRole
  hire_date?: string | null
  status?: "active" | "inactive" | "on_leave" | string
  active?: boolean
  department?: string | null
  salary?: number | null
  created_at?: string
  updated_at?: string
}
