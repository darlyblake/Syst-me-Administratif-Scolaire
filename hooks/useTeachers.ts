"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { serviceEnseignants } from "@/services/enseignants.service"
import { auditService } from "@/services/audit.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { usePermissions } from "@/hooks/usePermissions"
import type { DonneesEnseignant } from "@/types/models"

interface TeacherFilters {
  searchQuery: string
  subjectFilter: string
  statusFilter: string
}

interface TeacherState {
  teachers: DonneesEnseignant[]
  loading: boolean
  error: string | null
  selectedTeacher: DonneesEnseignant | null
  filters: TeacherFilters
  currentPage: number
  teachersPerPage: number
}

interface UseTeachersReturn extends TeacherState {
  loadTeachers: () => Promise<void>
  refreshTeachers: () => Promise<void>
  setSearchQuery: (query: string) => void
  setSubjectFilter: (filter: string) => void
  setStatusFilter: (filter: string) => void
  resetFilters: () => void
  setCurrentPage: (page: number) => void
  setTeachersPerPage: (count: number) => void
  selectTeacher: (teacher: DonneesEnseignant | null) => void
  addTeacher: (teacherData: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">) => Promise<boolean>
  updateTeacher: (id: string, updates: Partial<DonneesEnseignant>) => Promise<boolean>
  deactivateTeacher: (id: string) => Promise<boolean>
  deleteTeacher: (id: string) => Promise<boolean>
  filteredTeachers: DonneesEnseignant[]
  totalPages: number
  uniqueSubjects: string[]
  stats: {
    total: number
    active: number
    inactive: number
    onLeave: number
    suspended: number
  }
  permissions: {
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canAssign: boolean
    canDelete: boolean
  }
}

const initialFilters: TeacherFilters = {
  searchQuery: "",
  subjectFilter: "",
  statusFilter: ""
}

const initialState: TeacherState = {
  teachers: [],
  loading: true,
  error: null,
  selectedTeacher: null,
  filters: initialFilters,
  currentPage: 1,
  teachersPerPage: 10
}

export function useTeachers(): UseTeachersReturn {
  const [state, setState] = useState<TeacherState>(initialState)
  const { utilisateur } = useAuthentification()
  const { can } = usePermissions()

  const permissions = useMemo(() => ({
    canView: can("enseignants.view"),
    canCreate: can("enseignants.create"),
    canEdit: can("enseignants.edit"),
    canAssign: can("enseignants.assign"),
    canDelete: can("enseignants.delete"),
  }), [can])

  const getCurrentUser = useCallback(() => ({
    id: utilisateur?.id || "unknown",
    role: utilisateur?.role || "user"
  }), [utilisateur])

  const loadTeachers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const allTeachers = serviceEnseignants.obtenirTousLesEnseignants()

      // Un enseignant connecté ne reçoit jamais la liste globale : il ne voit
      // que sa propre fiche. Les rôles de gestion gardent le périmètre de
      // l'établissement pour le moment ; l'ID d'établissement sera appliqué
      // ici lorsque le backend multi-établissement sera branché.
      const teachers = utilisateur?.role === "enseignant"
        ? allTeachers.filter((teacher) => teacher.id === utilisateur.donneesEnseignant?.id)
        : allTeachers

      setState(prev => ({ ...prev, teachers, loading: false, error: null }))

      const user = getCurrentUser()
      auditService.logAction({
        userId: user.id,
        userRole: user.role,
        action: "VIEW",
        resource: "TEACHERS_LIST",
        details: { count: teachers.length, scope: utilisateur?.role === "enseignant" ? "own" : "establishment" },
        success: true
      })
    } catch (error) {
      console.error("Erreur lors du chargement des enseignants:", error)
      setState(prev => ({ ...prev, loading: false, error: "Erreur lors du chargement des enseignants" }))
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, "VIEW", "TEACHERS_LIST", error)
    }
  }, [getCurrentUser, utilisateur])

  const refreshTeachers = useCallback(async () => {
    await loadTeachers()
  }, [loadTeachers])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, searchQuery: query }, currentPage: 1 }))
  }, [])

  const setSubjectFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, subjectFilter: filter }, currentPage: 1 }))
  }, [])

  const setStatusFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, statusFilter: filter }, currentPage: 1 }))
  }, [])

  const resetFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: initialFilters, currentPage: 1 }))
  }, [])

  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: Math.max(1, page) }))
  }, [])

  const setTeachersPerPage = useCallback((count: number) => {
    const safeCount = Math.max(1, Math.min(100, count))
    setState(prev => ({ ...prev, teachersPerPage: safeCount, currentPage: 1 }))
  }, [])

  const selectTeacher = useCallback((teacher: DonneesEnseignant | null) => {
    setState(prev => ({ ...prev, selectedTeacher: teacher }))
    if (teacher) {
      const user = getCurrentUser()
      auditService.logAction({
        userId: user.id,
        userRole: user.role,
        action: "SELECT",
        resource: "TEACHER",
        resourceId: teacher.id,
        details: { teacherName: `${teacher.nom} ${teacher.prenom}` },
        success: true
      })
    }
  }, [getCurrentUser])

  const addTeacher = useCallback(async (teacherData: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): Promise<boolean> => {
    if (!permissions.canCreate) return false
    try {
      const newTeacher = serviceEnseignants.ajouterEnseignant(teacherData)
      setState(prev => ({ ...prev, teachers: [...prev.teachers, newTeacher], error: null }))
      const user = getCurrentUser()
      auditService.logTeacherCreation(user.id, user.role, teacherData)
      return true
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'enseignant:", error)
      setState(prev => ({ ...prev, error: "Erreur lors de l'ajout de l'enseignant" }))
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, "CREATE", "TEACHER", error)
      return false
    }
  }, [getCurrentUser, permissions.canCreate])

  const updateTeacher = useCallback(async (id: string, updates: Partial<DonneesEnseignant>): Promise<boolean> => {
    if (!permissions.canEdit) return false
    try {
      const success = serviceEnseignants.mettreAJourEnseignant(id, updates)
      if (success) {
        setState(prev => ({
          ...prev,
          teachers: prev.teachers.map(teacher => teacher.id === id ? { ...teacher, ...updates } : teacher),
          selectedTeacher: prev.selectedTeacher?.id === id ? { ...prev.selectedTeacher, ...updates } : prev.selectedTeacher,
          error: null
        }))
        const user = getCurrentUser()
        auditService.logTeacherUpdate(user.id, user.role, id, updates)
      }
      return success
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'enseignant:", error)
      setState(prev => ({ ...prev, error: "Erreur lors de la mise à jour de l'enseignant" }))
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, "UPDATE", "TEACHER", error)
      return false
    }
  }, [getCurrentUser, permissions.canEdit])

  const deactivateTeacher = useCallback(async (id: string): Promise<boolean> => {
    if (!permissions.canEdit) return false
    return updateTeacher(id, { statut: "inactif" })
  }, [permissions.canEdit, updateTeacher])

  const deleteTeacher = useCallback(async (id: string): Promise<boolean> => {
    if (!permissions.canDelete) return false
    try {
      const teacher = state.teachers.find(t => t.id === id)
      const success = serviceEnseignants.supprimerEnseignant(id)
      if (success) {
        setState(prev => ({
          ...prev,
          teachers: prev.teachers.filter(teacher => teacher.id !== id),
          selectedTeacher: prev.selectedTeacher?.id === id ? null : prev.selectedTeacher,
          error: null
        }))
        const user = getCurrentUser()
        auditService.logTeacherDeletion(user.id, user.role, id, teacher ? `${teacher.nom} ${teacher.prenom}` : "Unknown")
      }
      return success
    } catch (error) {
      console.error("Erreur lors de la suppression de l'enseignant:", error)
      setState(prev => ({ ...prev, error: "Erreur lors de la suppression de l'enseignant" }))
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, "DELETE", "TEACHER", error)
      return false
    }
  }, [getCurrentUser, permissions.canDelete, state.teachers])

  const filteredTeachers = state.teachers.filter((teacher) => {
    const query = state.filters.searchQuery.trim().toLowerCase()
    const haystack = [
      teacher.nom,
      teacher.prenom,
      teacher.email ?? "",
      teacher.telephone ?? "",
      teacher.identifiant,
      ...teacher.matieres,
      ...teacher.classes,
    ].join(" ").toLowerCase()

    const matchesSearch = !query || haystack.includes(query)
    const matchesSubject = !state.filters.subjectFilter || state.filters.subjectFilter === "all" || teacher.matieres.includes(state.filters.subjectFilter)
    const matchesStatus = !state.filters.statusFilter || state.filters.statusFilter === "all" || teacher.statut === state.filters.statusFilter
    return matchesSearch && matchesSubject && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / state.teachersPerPage))
  const uniqueSubjects = Array.from(new Set(state.teachers.flatMap(teacher => teacher.matieres))).sort((a, b) => a.localeCompare(b))

  const stats = {
    total: state.teachers.length,
    active: state.teachers.filter(t => t.statut === "actif").length,
    inactive: state.teachers.filter(t => t.statut === "inactif").length,
    onLeave: state.teachers.filter(t => t.statut === "conge").length,
    suspended: state.teachers.filter(t => t.statut === "suspendu").length
  }

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  return {
    ...state,
    loadTeachers,
    refreshTeachers,
    setSearchQuery,
    setSubjectFilter,
    setStatusFilter,
    resetFilters,
    setCurrentPage,
    setTeachersPerPage,
    selectTeacher,
    addTeacher,
    updateTeacher,
    deactivateTeacher,
    deleteTeacher,
    filteredTeachers,
    totalPages,
    uniqueSubjects,
    stats,
    permissions,
  }
}
