export interface EstablishmentRole {
  id: string
  establishment_id: string
  name: string
  description: string | null
  active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface EstablishmentRolePermission {
  id: string
  role_id: string
  permission: string
  created_at: string
}

export type ValidPermission = 
  | 'dashboard'
  | 'students'
  | 'enrollments'
  | 'classes'
  | 'teachers'
  | 'notes'
  | 'attendance'
  | 'documents'
  | 'communication'
  | 'finance'
  | 'personnel'
  | 'settings'
  | 'roles.manage'
  | 'users.manage'
