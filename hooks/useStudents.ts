"use client"

import { useCallback, useEffect, useState } from "react"
import { assignStudentsToClass, createStudent, deactivateStudent, listStudentsPaginated, updateStudent } from "@/lib/supabase/services/student.service"
import type { Student, StudentFilters } from "@/lib/supabase/types"

export function useStudents(establishmentId: string | null, filters: StudentFilters & { page?: number; pageSize?: number; active?: boolean } = {}) {
  const [data, setData] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!establishmentId) {
      setData([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await listStudentsPaginated(establishmentId, filters.page ?? 1, filters.pageSize ?? 50, filters.search ?? "", filters.active ?? true, filters.classId, filters.academicYearId)
        if (active) {
          setData(result.items)
          setTotal(result.total)
          setTotalPages(result.total_pages)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des élèves.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId, filters.search, filters.classId, filters.gradeLevelId, filters.academicYearId, filters.status, filters.page, filters.pageSize, filters.active, refreshKey])

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), [])
  const create = useCallback(async (student: Parameters<typeof createStudent>[0]) => {
    if (isCreating) return false
    try { setIsCreating(true); setError(null); await createStudent(student); refresh(); return true } catch (err) { setError(err instanceof Error ? err.message : "Impossible d'ajouter l'élève."); return false } finally { setIsCreating(false) }
  }, [isCreating, refresh])
  const update = useCallback(async (student: Parameters<typeof updateStudent>[0]) => {
    if (isUpdating) return false
    try { setIsUpdating(true); setError(null); await updateStudent(student); refresh(); return true } catch (err) { setError(err instanceof Error ? err.message : "Impossible de modifier l'élève."); return false } finally { setIsUpdating(false) }
  }, [isUpdating, refresh])
  const deactivate = useCallback(async (studentId: string) => {
    if (isDeactivating) return false
    try { setIsDeactivating(true); setError(null); await deactivateStudent(studentId); refresh(); return true } catch (err) { setError(err instanceof Error ? err.message : "Impossible de désactiver l'élève."); return false } finally { setIsDeactivating(false) }
  }, [isDeactivating, refresh])

  const assignToClass = useCallback(async (assignment: Parameters<typeof assignStudentsToClass>[0]) => {
    if (isAssigning) return null
    try {
      setIsAssigning(true)
      setError(null)
      const result = await assignStudentsToClass(assignment)
      refresh()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'affecter les élèves à la classe.")
      return null
    } finally {
      setIsAssigning(false)
    }
  }, [isAssigning, refresh])

  return { data, total, totalPages, isLoading, error, isCreating, isUpdating, isDeactivating, isAssigning, create, update, deactivate, assignToClass, refresh }
}
