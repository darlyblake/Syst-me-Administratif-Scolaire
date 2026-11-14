/**
 * Client-side audit facade kept for backward compatibility.
 *
 * Audit records are now written by trusted database triggers and read from
 * public.audit_logs through the administrator-only audit page. This service
 * deliberately does not persist audit records in localStorage: browser storage
 * is user-controlled and is not an authoritative or private audit trail.
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorMessage?: string
}

class AuditService {
  /** Audit writes are server-side only. */
  logAction(_entry: Omit<AuditLogEntry, "id" | "timestamp">): void {}

  /** Local browser audit data is intentionally no longer exposed. */
  getAllLogs(): AuditLogEntry[] {
    return []
  }

  getFilteredLogs(_filters: {
    userId?: string
    action?: string
    resource?: string
    dateFrom?: string
    dateTo?: string
    success?: boolean
  }): AuditLogEntry[] {
    return []
  }

  cleanupOldLogs(_olderThanDays = 90): void {}

  exportToCSV(): string {
    return ""
  }

  logTeacherCreation(_userId: string, _userRole: string, _teacherData: unknown): void {}
  logTeacherUpdate(_userId: string, _userRole: string, _teacherId: string, _changes: unknown): void {}
  logTeacherDeletion(_userId: string, _userRole: string, _teacherId: string, _teacherName: string): void {}
  logClassAssignment(_userId: string, _userRole: string, _teacherId: string, _classes: string[]): void {}
  logMessageSent(_userId: string, _userRole: string, _recipientId: string, _subject?: string): void {}
  logDocumentAdded(_userId: string, _userRole: string, _teacherId: string, _documentType: string): void {}
  logError(_userId: string, _userRole: string, _action: string, _resource: string, _error: unknown): void {}
  logUserLogin(_userId: string, _userRole: string, _success: boolean, _errorMessage?: string): void {}
  logUserLogout(_userId: string, _userRole: string): void {}
}

export const auditService = new AuditService()
