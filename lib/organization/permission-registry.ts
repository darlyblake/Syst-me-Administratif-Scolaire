export const SCHOOL_PERMISSIONS = [
  'dashboard.view','students.view','students.create','students.edit','students.delete',
  'enrollments.view','enrollments.create','enrollments.edit',
  'attendance.view','attendance.manage','grades.view','grades.manage','classes.view',
  'payments.view','payments.create','payments.refund','finance.view',
  'documents.view','documents.create','documents.delete','exclusions.create',
  'staff.view','staff.manage','users.view','users.manage','settings.view','settings.manage',
] as const

export type SchoolPermission = typeof SCHOOL_PERMISSIONS[number]

export function isSchoolPermission(value: string): value is SchoolPermission {
  return (SCHOOL_PERMISSIONS as readonly string[]).includes(value)
}
