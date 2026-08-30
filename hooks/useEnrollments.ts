"use client"

import { useEffect, useState } from "react"
import { listEnrollmentsPaginated } from "@/lib/supabase/services/enrollment.service"
import type { EnrollmentWithRelations } from "@/lib/supabase/types"

export function useEnrollments(data: {
  establishmentId: string | null
  page?: number
  pageSize?: number
  academicYearId?: string | null
  classId?: string | null
  status?: string | null
  refreshKey?: number
  search?: string
}) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data.establishmentId) {
      setEnrollments([])
      setTotal(0)
      setTotalPages(0)
      setIsLoading(false)
      return
    }

    let active = true
    void listEnrollmentsPaginated({ ...data, establishmentId: data.establishmentId }).then((result) => {
      if (!active) return
      setEnrollments(result.items)
      setTotal(result.total)
      setTotalPages(result.total_pages)
      setError(null)
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Impossible de charger les inscriptions.")
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => { active = false }
  }, [data.establishmentId, data.page, data.pageSize, data.academicYearId, data.classId, data.status, data.refreshKey, data.search])

  return { enrollments, total, totalPages, isLoading, error }
}