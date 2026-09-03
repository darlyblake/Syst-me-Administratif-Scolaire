"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { obtenirEnseignantsSupabase, creerEnseignantSupabase, modifierEnseignantSupabase, archiverEnseignantSupabase, supprimerEnseignantSupabase } from "@/services/enseignants.supabase.service"
import { auditService } from "@/services/audit.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { usePermissions } from "@/hooks/usePermissions"
import type { DonneesEnseignant } from "@/types/models"

interface TeacherFilters { searchQuery: string; subjectFilter: string; statusFilter: string }
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
  stats: { total: number; active: number; inactive: number; onLeave: number; suspended: number }
  permissions: { canView: boolean; canCreate: boolean; canEdit: boolean; canAssign: boolean; canDelete: boolean }
}

const initialFilters: TeacherFilters = { searchQuery: "", subjectFilter: "", statusFilter: "" }
const initialState: TeacherState = { teachers: [], loading: true, error: null, selectedTeacher: null, filters: initialFilters, currentPage: 1, teachersPerPage: 10 }

type UserWithTeacher = { id: string; role?: string; donneesEnseignant?: { id?: string }; etablissementId?: string }

export function useTeachers(): UseTeachersReturn {
  const [state, setState] = useState<TeacherState>(initialState)
  const { utilisateur, etablissementActif } = useAuthentification()
  const { can } = usePermissions()
  const user = utilisateur as UserWithTeacher | null
  const establishmentId = etablissementActif?.id ?? user?.etablissementId ?? ""

  const permissions = useMemo(() => ({
    canView: can("enseignants.view"), canCreate: can("enseignants.create"), canEdit: can("enseignants.edit"),
    canAssign: can("enseignants.assign"), canDelete: can("enseignants.delete"),
  }), [can])

  const getCurrentUser = useCallback(() => ({ id: user?.id || "unknown", role: user?.role || "user" }), [user?.id, user?.role])

  const loadTeachers = useCallback(async () => {
    if (!establishmentId) {
      setState(prev => ({ ...prev, teachers: [], loading: false, error: "Aucun établissement actif sélectionné." }))
      return
    }
    if (!permissions.canView) {
      setState(prev => ({ ...prev, teachers: [], loading: false, error: "Vous n'avez pas l'autorisation de consulter les enseignants." }))
      return
    }
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const allTeachers = await obtenirEnseignantsSupabase(establishmentId)
      const teachers = user?.role === "enseignant" && user.donneesEnseignant?.id
        ? allTeachers.filter(teacher => teacher.id === user.donneesEnseignant?.id)
        : allTeachers
      setState(prev => ({ ...prev, teachers, loading: false, error: null }))
      const current = getCurrentUser()
      auditService.logAction({ userId: current.id, userRole: current.role, action: "VIEW", resource: "TEACHERS_LIST", details: { count: teachers.length, establishmentId }, success: true })
    } catch (error) {
      console.error("Erreur lors du chargement des enseignants:", error)
      setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Erreur lors du chargement des enseignants" }))
      const current = getCurrentUser()
      auditService.logError(current.id, current.role, "VIEW", "TEACHERS_LIST", error)
    }
  }, [establishmentId, getCurrentUser, permissions.canView, user?.donneesEnseignant?.id, user?.role])

  const refreshTeachers = useCallback(async () => { await loadTeachers() }, [loadTeachers])
  const setSearchQuery = useCallback((query: string) => setState(prev => ({ ...prev, filters: { ...prev.filters, searchQuery: query }, currentPage: 1 })), [])
  const setSubjectFilter = useCallback((filter: string) => setState(prev => ({ ...prev, filters: { ...prev.filters, subjectFilter: filter }, currentPage: 1 })), [])
  const setStatusFilter = useCallback((filter: string) => setState(prev => ({ ...prev, filters: { ...prev.filters, statusFilter: filter }, currentPage: 1 })), [])
  const resetFilters = useCallback(() => setState(prev => ({ ...prev, filters: initialFilters, currentPage: 1 })), [])
  const setCurrentPage = useCallback((page: number) => setState(prev => ({ ...prev, currentPage: Math.max(1, page) })), [])
  const setTeachersPerPage = useCallback((count: number) => setState(prev => ({ ...prev, teachersPerPage: Math.max(1, Math.min(100, count)), currentPage: 1 })), [])

  const selectTeacher = useCallback((teacher: DonneesEnseignant | null) => {
    setState(prev => ({ ...prev, selectedTeacher: teacher }))
    if (teacher) {
      const current = getCurrentUser()
      auditService.logAction({ userId: current.id, userRole: current.role, action: "SELECT", resource: "TEACHER", resourceId: teacher.id, details: { teacherName: `${teacher.nom} ${teacher.prenom}` }, success: true })
    }
  }, [getCurrentUser])

  const addTeacher = useCallback(async (teacherData: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">) => {
    if (!permissions.canCreate || !establishmentId) return false
    try {
      await creerEnseignantSupabase(establishmentId, teacherData)
      await loadTeachers()
      const current = getCurrentUser(); auditService.logTeacherCreation(current.id, current.role, teacherData)
      return true
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'enseignant:", error)
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : "Erreur lors de l'ajout de l'enseignant" }))
      return false
    }
  }, [establishmentId, getCurrentUser, loadTeachers, permissions.canCreate])

  const updateTeacher = useCallback(async (id: string, updates: Partial<DonneesEnseignant>) => {
    if (!permissions.canEdit) return false
    try {
      await modifierEnseignantSupabase(id, updates)
      await loadTeachers()
      const current = getCurrentUser(); auditService.logTeacherUpdate(current.id, current.role, id, updates)
      return true
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'enseignant:", error)
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour de l'enseignant" }))
      return false
    }
  }, [getCurrentUser, loadTeachers, permissions.canEdit])

  const deactivateTeacher = useCallback(async (id: string) => {
    if (!permissions.canEdit) return false
    try { await archiverEnseignantSupabase(id); await loadTeachers(); return true }
    catch (error) { setState(prev => ({ ...prev, error: error instanceof Error ? error.message : "Impossible de désactiver l'enseignant" })); return false }
  }, [loadTeachers, permissions.canEdit])

  const deleteTeacher = useCallback(async (id: string) => {
    if (!permissions.canDelete) return false
    try {
      const teacher = state.teachers.find(t => t.id === id)
      await supprimerEnseignantSupabase(id)
      setState(prev => ({ ...prev, teachers: prev.teachers.filter(t => t.id !== id), selectedTeacher: prev.selectedTeacher?.id === id ? null : prev.selectedTeacher, error: null }))
      const current = getCurrentUser(); auditService.logTeacherDeletion(current.id, current.role, id, teacher ? `${teacher.nom} ${teacher.prenom}` : "Unknown")
      return true
    } catch (error) { setState(prev => ({ ...prev, error: error instanceof Error ? error.message : "Impossible de supprimer l'enseignant" })); return false }
  }, [getCurrentUser, permissions.canDelete, state.teachers])

  const filteredTeachers = state.teachers.filter(teacher => {
    const query = state.filters.searchQuery.trim().toLowerCase()
    const haystack = [teacher.nom, teacher.prenom, teacher.email ?? "", teacher.telephone ?? "", teacher.identifiant, ...teacher.matieres, ...teacher.classes].join(" ").toLowerCase()
    const matchesSearch = !query || haystack.includes(query)
    const matchesSubject = !state.filters.subjectFilter || state.filters.subjectFilter === "all" || teacher.matieres.includes(state.filters.subjectFilter)
    const matchesStatus = !state.filters.statusFilter || state.filters.statusFilter === "all" || teacher.statut === state.filters.statusFilter
    return matchesSearch && matchesSubject && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / state.teachersPerPage))
  const uniqueSubjects = Array.from(new Set(state.teachers.flatMap(t => t.matieres))).sort((a, b) => a.localeCompare(b))
  const stats = {
    total: state.teachers.length,
    active: state.teachers.filter(t => t.statut === "actif").length,
    inactive: state.teachers.filter(t => t.statut === "inactif").length,
    onLeave: 0,
    suspended: 0,
  }

  useEffect(() => { void loadTeachers() }, [loadTeachers])

  return { ...state, loadTeachers, refreshTeachers, setSearchQuery, setSubjectFilter, setStatusFilter, resetFilters, setCurrentPage, setTeachersPerPage, selectTeacher, addTeacher, updateTeacher, deactivateTeacher, deleteTeacher, filteredTeachers, totalPages, uniqueSubjects, stats, permissions }
}
