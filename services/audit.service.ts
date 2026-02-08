/**
 * Service de journalisation d'audit
 * Enregistre toutes les actions importantes dans l'application
 */

export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorMessage?: string
}

class AuditService {
  private readonly STORAGE_KEY = "audit_logs"
  private readonly MAX_LOGS = 1000 // Limite pour éviter de surcharger le localStorage

  /**
   * Enregistre une action dans le journal d'audit
   */
  logAction(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
    try {
      const auditEntry: AuditLogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        ...entry
      }

      const logs = this.getAllLogs()
      logs.unshift(auditEntry) // Ajouter au début pour avoir les plus récents en premier

      // Limiter le nombre d'entrées
      if (logs.length > this.MAX_LOGS) {
        logs.splice(this.MAX_LOGS)
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs))

      // Log dans la console en mode développement
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Audit Log:', auditEntry)
      }
    } catch (error) {
      console.error('Erreur lors de la journalisation d\'audit:', error)
    }
  }

  /**
   * Récupère tous les logs d'audit
   */
  getAllLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Erreur lors de la récupération des logs d\'audit:', error)
      return []
    }
  }

  /**
   * Récupère les logs filtrés par critères
   */
  getFilteredLogs(filters: {
    userId?: string
    action?: string
    resource?: string
    dateFrom?: string
    dateTo?: string
    success?: boolean
  }): AuditLogEntry[] {
    const logs = this.getAllLogs()

    return logs.filter(log => {
      if (filters.userId && log.userId !== filters.userId) return false
      if (filters.action && log.action !== filters.action) return false
      if (filters.resource && log.resource !== filters.resource) return false
      if (filters.success !== undefined && log.success !== filters.success) return false
      if (filters.dateFrom && log.timestamp < filters.dateFrom) return false
      if (filters.dateTo && log.timestamp > filters.dateTo) return false
      return true
    })
  }

  /**
   * Supprime les anciens logs (plus vieux que la date spécifiée)
   */
  cleanupOldLogs(olderThanDays: number = 90): void {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const logs = this.getAllLogs()
      const filteredLogs = logs.filter(log =>
        new Date(log.timestamp) > cutoffDate
      )

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLogs))
    } catch (error) {
      console.error('Erreur lors du nettoyage des logs d\'audit:', error)
    }
  }

  /**
   * Exporte les logs au format CSV
   */
  exportToCSV(): string {
    const logs = this.getAllLogs()

    if (logs.length === 0) return ''

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'User Role',
      'Action',
      'Resource',
      'Resource ID',
      'Details',
      'Success',
      'Error Message'
    ]

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        log.timestamp,
        log.userId,
        log.userRole,
        log.action,
        log.resource,
        log.resourceId || '',
        JSON.stringify(log.details).replace(/"/g, '""'), // Échapper les guillemets
        log.success,
        log.errorMessage || ''
      ].join(','))
    ]

    return csvRows.join('\n')
  }

  /**
   * Génère un ID unique pour les entrées d'audit
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // === MÉTHODES DE LOGGING SPÉCIALISÉES ===

  /**
   * Log la création d'un enseignant
   */
  logTeacherCreation(userId: string, userRole: string, teacherData: any): void {
    this.logAction({
      userId,
      userRole,
      action: 'CREATE',
      resource: 'TEACHER',
      details: {
        teacherName: `${teacherData.nom} ${teacherData.prenom}`,
        teacherEmail: teacherData.email,
        contractType: teacherData.typeContrat
      },
      success: true
    })
  }

  /**
   * Log la modification d'un enseignant
   */
  logTeacherUpdate(userId: string, userRole: string, teacherId: string, changes: any): void {
    this.logAction({
      userId,
      userRole,
      action: 'UPDATE',
      resource: 'TEACHER',
      resourceId: teacherId,
      details: changes,
      success: true
    })
  }

  /**
   * Log la suppression d'un enseignant
   */
  logTeacherDeletion(userId: string, userRole: string, teacherId: string, teacherName: string): void {
    this.logAction({
      userId,
      userRole,
      action: 'DELETE',
      resource: 'TEACHER',
      resourceId: teacherId,
      details: { teacherName },
      success: true
    })
  }

  /**
   * Log l'assignation de classes
   */
  logClassAssignment(userId: string, userRole: string, teacherId: string, classes: string[]): void {
    this.logAction({
      userId,
      userRole,
      action: 'ASSIGN',
      resource: 'CLASSES',
      resourceId: teacherId,
      details: { assignedClasses: classes },
      success: true
    })
  }

  /**
   * Log l'envoi d'un message
   */
  logMessageSent(userId: string, userRole: string, recipientId: string, subject?: string): void {
    this.logAction({
      userId,
      userRole,
      action: 'SEND_MESSAGE',
      resource: 'MESSAGE',
      resourceId: recipientId,
      details: { subject: subject || 'N/A' },
      success: true
    })
  }

  /**
   * Log l'ajout d'un document
   */
  logDocumentAdded(userId: string, userRole: string, teacherId: string, documentType: string): void {
    this.logAction({
      userId,
      userRole,
      action: 'ADD_DOCUMENT',
      resource: 'DOCUMENT',
      resourceId: teacherId,
      details: { documentType },
      success: true
    })
  }

  /**
   * Log une erreur
   */
  logError(userId: string, userRole: string, action: string, resource: string, error: any): void {
    this.logAction({
      userId,
      userRole,
      action,
      resource,
      details: { error: error.message || 'Unknown error' },
      success: false,
      errorMessage: error.message
    })
  }

  /**
   * Log une connexion utilisateur
   */
  logUserLogin(userId: string, userRole: string, success: boolean, errorMessage?: string): void {
    this.logAction({
      userId,
      userRole,
      action: 'LOGIN',
      resource: 'AUTH',
      details: {},
      success,
      errorMessage
    })
  }

  /**
   * Log une déconnexion utilisateur
   */
  logUserLogout(userId: string, userRole: string): void {
    this.logAction({
      userId,
      userRole,
      action: 'LOGOUT',
      resource: 'AUTH',
      details: {},
      success: true
    })
  }
}

// Instance singleton
export const auditService = new AuditService()
