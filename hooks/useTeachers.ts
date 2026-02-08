"use client"

import { useState, useEffect, useCallback } from "react"
import { serviceEnseignants } from "@/services/enseignants.service"
import { auditService } from "@/services/audit.service"
import { useAuthentification } from "@/providers/authentification.provider"
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
  // Actions de données
  loadTeachers: () => Promise<void>
  refreshTeachers: () => Promise<void>

  // Actions de filtrage
  setSearchQuery: (query: string) => void
  setSubjectFilter: (filter: string) => void
  setStatusFilter: (filter: string) => void
  resetFilters: () => void

  // Actions de pagination
  setCurrentPage: (page: number) => void
  setTeachersPerPage: (count: number) => void

  // Actions sur les enseignants
  selectTeacher: (teacher: DonneesEnseignant | null) => void
  addTeacher: (teacherData: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">) => Promise<boolean>
  updateTeacher: (id: string, updates: Partial<DonneesEnseignant>) => Promise<boolean>
  deleteTeacher: (id: string) => Promise<boolean>

  // Données calculées
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
  teachersPerPage: 5
}

export function useTeachers(): UseTeachersReturn {
  const [state, setState] = useState<TeacherState>(initialState)
  const { utilisateur } = useAuthentification()

  // Fonction utilitaire pour obtenir l'utilisateur actuel
  const getCurrentUser = useCallback(() => ({
    id: utilisateur?.id || "unknown",
    role: utilisateur?.role || "user"
  }), [utilisateur])

  // Charger les enseignants
  const loadTeachers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const teachers = serviceEnseignants.obtenirTousLesEnseignants()
      setState(prev => ({
        ...prev,
        teachers,
        loading: false,
        error: null
      }))

      // Journaliser l'action de chargement
      const user = getCurrentUser()
      auditService.logAction({
        userId: user.id,
        userRole: user.role,
        action: 'VIEW',
        resource: 'TEACHERS_LIST',
        details: { count: teachers.length },
        success: true
      })
    } catch (error) {
      console.error("Erreur lors du chargement des enseignants:", error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Erreur lors du chargement des enseignants"
      }))

      // Journaliser l'erreur
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, 'VIEW', 'TEACHERS_LIST', error)
    }
  }, [getCurrentUser])

  // Actualiser les données
  const refreshTeachers = useCallback(async () => {
    await loadTeachers()
  }, [loadTeachers])

  // Actions de filtrage
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, searchQuery: query },
      currentPage: 1 // Reset pagination
    }))
  }, [])

  const setSubjectFilter = useCallback((filter: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, subjectFilter: filter },
      currentPage: 1
    }))
  }, [])

  const setStatusFilter = useCallback((filter: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, statusFilter: filter },
      currentPage: 1
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: initialFilters,
      currentPage: 1
    }))
  }, [])

  // Actions de pagination
  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }, [])

  const setTeachersPerPage = useCallback((count: number) => {
    setState(prev => ({
      ...prev,
      teachersPerPage: count,
      currentPage: 1
    }))
  }, [])

  // Actions sur les enseignants
  const selectTeacher = useCallback((teacher: DonneesEnseignant | null) => {
    setState(prev => ({ ...prev, selectedTeacher: teacher }))

    if (teacher) {
      // Journaliser la sélection
      const user = getCurrentUser()
      auditService.logAction({
        userId: user.id,
        userRole: user.role,
        action: 'SELECT',
        resource: 'TEACHER',
        resourceId: teacher.id,
        details: { teacherName: `${teacher.nom} ${teacher.prenom}` },
        success: true
      })
    }
  }, [getCurrentUser])

  const addTeacher = useCallback(async (teacherData: Omit<DonneesEnseignant, "id" | "identifiant" | "motDePasse">): Promise<boolean> => {
    try {
      const newTeacher = serviceEnseignants.ajouterEnseignant(teacherData)
      setState(prev => ({
        ...prev,
        teachers: [...prev.teachers, newTeacher]
      }))

      // Journaliser la création
      const user = getCurrentUser()
      auditService.logTeacherCreation(user.id, user.role, teacherData)

      return true
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'enseignant:", error)
      setState(prev => ({
        ...prev,
        error: "Erreur lors de l'ajout de l'enseignant"
      }))

      // Journaliser l'erreur
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, 'CREATE', 'TEACHER', error)

      return false
    }
  }, [getCurrentUser])

  const updateTeacher = useCallback(async (id: string, updates: Partial<DonneesEnseignant>): Promise<boolean> => {
    try {
      const success = serviceEnseignants.mettreAJourEnseignant(id, updates)
      if (success) {
        setState(prev => ({
          ...prev,
          teachers: prev.teachers.map(teacher =>
            teacher.id === id ? { ...teacher, ...updates } : teacher
          ),
          selectedTeacher: prev.selectedTeacher?.id === id
            ? { ...prev.selectedTeacher, ...updates }
            : prev.selectedTeacher
        }))

        // Journaliser la mise à jour
        const user = getCurrentUser()
        auditService.logTeacherUpdate(user.id, user.role, id, updates)
      }
      return success
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'enseignant:", error)
      setState(prev => ({
        ...prev,
        error: "Erreur lors de la mise à jour de l'enseignant"
      }))

      // Journaliser l'erreur
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, 'UPDATE', 'TEACHER', error)

      return false
    }
  }, [getCurrentUser])

  const deleteTeacher = useCallback(async (id: string): Promise<boolean> => {
    try {
      const teacher = state.teachers.find(t => t.id === id)
      const success = serviceEnseignants.supprimerEnseignant(id)
      if (success) {
        setState(prev => ({
          ...prev,
          teachers: prev.teachers.filter(teacher => teacher.id !== id),
          selectedTeacher: prev.selectedTeacher?.id === id ? null : prev.selectedTeacher
        }))

        // Journaliser la suppression
        const user = getCurrentUser()
        auditService.logTeacherDeletion(
          user.id,
          user.role,
          id,
          teacher ? `${teacher.nom} ${teacher.prenom}` : 'Unknown'
        )
      }
      return success
    } catch (error) {
      console.error("Erreur lors de la suppression de l'enseignant:", error)
      setState(prev => ({
        ...prev,
        error: "Erreur lors de la suppression de l'enseignant"
      }))

      // Journaliser l'erreur
      const user = getCurrentUser()
      auditService.logError(user.id, user.role, 'DELETE', 'TEACHER', error)

      return false
    }
  }, [state.teachers, getCurrentUser])

  // Données calculées
  const filteredTeachers = state.teachers.filter((teacher) => {
    const matchesSearch = teacher.nom.toLowerCase().includes(state.filters.searchQuery.toLowerCase()) ||
                         teacher.prenom.toLowerCase().includes(state.filters.searchQuery.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(state.filters.searchQuery.toLowerCase())
    const matchesSubject = state.filters.subjectFilter === "" ||
                          state.filters.subjectFilter === "all" ||
                          teacher.matieres.includes(state.filters.subjectFilter)
    const matchesStatus = state.filters.statusFilter === "" ||
                         state.filters.statusFilter === "all" ||
                         teacher.statut === state.filters.statusFilter

    return matchesSearch && matchesSubject && matchesStatus
  })

  const totalPages = Math.ceil(filteredTeachers.length / state.teachersPerPage)

  const uniqueSubjects = Array.from(
    new Set(state.teachers.flatMap(teacher => teacher.matieres))
  )

  const stats = {
    total: state.teachers.length,
    active: state.teachers.filter(t => t.statut === "actif").length,
    inactive: state.teachers.filter(t => t.statut === "inactif").length,
    onLeave: state.teachers.filter(t => t.statut === "conge").length,
    suspended: state.teachers.filter(t => t.statut === "suspendu").length
  }

  // Chargement initial
  useEffect(() => {
    loadTeachers()
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
    deleteTeacher,
    filteredTeachers,
    totalPages,
    uniqueSubjects,
    stats
  }
}
