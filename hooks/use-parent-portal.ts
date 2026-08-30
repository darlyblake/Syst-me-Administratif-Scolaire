"use client"

import { useCallback, useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"

export type ParentChild = {
  id: string
  establishment_id: string
  student_number: string | null
  first_name: string
  last_name: string
  birth_date: string | null
  sex: string | null
  phone: string | null
  email: string | null
  active: boolean
  can_view_academic: boolean
  can_view_finance: boolean
  relationship: string | null
  class_name?: string
  class_id?: string
  enrollment_id?: string
}

export type ParentGrade = {
  id: string
  student_id: string
  score: number
  comment: string | null
  assessment_id: string
  title?: string
  assessment_date?: string
  term?: string
  max_score?: number
  subject?: string
}

export type ParentPayment = {
  id: string
  enrollment_id: string
  amount: number
  payment_date: string
  reference: string | null
  method: string | null
  notes: string | null
}

export type ParentAttendance = {
  id: string
  student_id: string
  attendance_date: string
  status: string
  reason: string | null
}

export type ParentNotification = {
  id: string
  title: string
  body: string
  type: string
  read_at: string | null
  created_at: string
}

export type ParentEvent = {
  id: string
  establishment_id: string
  title: string
  description: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
}

export function useParentPortal() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<ParentChild[]>([])
  const [grades, setGrades] = useState<ParentGrade[]>([])
  const [payments, setPayments] = useState<ParentPayment[]>([])
  const [attendance, setAttendance] = useState<ParentAttendance[]>([])
  const [notifications, setNotifications] = useState<ParentNotification[]>([])
  const [events, setEvents] = useState<ParentEvent[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabaseBrowser.auth.getUser()
      if (authError || !authData.user) throw new Error("Session parent introuvable.")

      const userId = authData.user.id
      const { data: links, error: linksError } = await supabaseBrowser
        .from("student_guardians")
        .select("student_id, establishment_id, relationship, can_view_academic, can_view_finance")
        .eq("guardian_user_id", userId)

      if (linksError) throw linksError
      const studentIds = (links ?? []).map((link) => link.student_id)

      if (studentIds.length === 0) {
        setChildren([])
        setGrades([])
        setPayments([])
        setAttendance([])
        const [{ data: userNotifications }, { data: schoolEvents }] = await Promise.all([
          supabaseBrowser.from("notifications").select("*").eq("recipient_user_id", userId).order("created_at", { ascending: false }),
          supabaseBrowser.from("school_events").select("*").limit(0),
        ])
        setNotifications(userNotifications ?? [])
        setEvents(schoolEvents ?? [])
        return
      }

      const [studentsResult, enrollmentsResult, gradesResult, attendanceResult, notificationsResult] = await Promise.all([
        supabaseBrowser.from("students").select("*").in("id", studentIds).order("last_name"),
        supabaseBrowser.from("enrollments").select("*").in("student_id", studentIds).eq("status", "active"),
        supabaseBrowser.from("grades").select("*").in("student_id", studentIds).order("created_at", { ascending: false }),
        supabaseBrowser.from("attendance_records").select("*").in("student_id", studentIds).order("attendance_date", { ascending: false }),
        supabaseBrowser.from("notifications").select("*").eq("recipient_user_id", userId).order("created_at", { ascending: false }),
      ])

      for (const result of [studentsResult, enrollmentsResult, gradesResult, attendanceResult, notificationsResult]) {
        if (result.error) throw result.error
      }

      const enrollments = enrollmentsResult.data ?? []
      const classIds = [...new Set(enrollments.map((item) => item.class_id).filter(Boolean))]
      const assessmentIds = [...new Set((gradesResult.data ?? []).map((item) => item.assessment_id))]
      const establishmentIds = [...new Set((links ?? []).map((item) => item.establishment_id))]

      const [classesResult, assessmentsResult, eventsResult] = await Promise.all([
        classIds.length ? supabaseBrowser.from("school_classes").select("id,name").in("id", classIds) : Promise.resolve({ data: [], error: null }),
        assessmentIds.length ? supabaseBrowser.from("assessments").select("id,title,assessment_date,term,max_score,subject_id").in("id", assessmentIds) : Promise.resolve({ data: [], error: null }),
        establishmentIds.length ? supabaseBrowser.from("school_events").select("*").in("establishment_id", establishmentIds).order("starts_at") : Promise.resolve({ data: [], error: null }),
      ])

      for (const result of [classesResult, assessmentsResult, eventsResult]) {
        if (result.error) throw result.error
      }

      const classMap = new Map((classesResult.data ?? []).map((item) => [item.id, item.name]))
      const enrollmentMap = new Map(enrollments.map((item) => [item.student_id, item]))
      const linkMap = new Map((links ?? []).map((item) => [item.student_id, item]))

      const assessmentMap = new Map((assessmentsResult.data ?? []).map((item) => [item.id, item]))
      const subjectIds = [...new Set((assessmentsResult.data ?? []).map((item) => item.subject_id).filter(Boolean))]
      const subjectsResult = subjectIds.length
        ? await supabaseBrowser.from("subjects").select("id,name").in("id", subjectIds)
        : { data: [], error: null }
      if (subjectsResult.error) throw subjectsResult.error
      const subjectMap = new Map((subjectsResult.data ?? []).map((item) => [item.id, item.name]))

      const paymentEnrollmentIds = enrollments.map((item) => item.id)
      const paymentsResult = paymentEnrollmentIds.length
        ? await supabaseBrowser.from("payments").select("*").in("enrollment_id", paymentEnrollmentIds).order("payment_date", { ascending: false })
        : { data: [], error: null }
      if (paymentsResult.error) throw paymentsResult.error

      setChildren((studentsResult.data ?? []).map((student) => {
        const enrollment = enrollmentMap.get(student.id)
        const link = linkMap.get(student.id)
        return {
          ...student,
          relationship: link?.relationship ?? null,
          can_view_academic: link?.can_view_academic ?? false,
          can_view_finance: link?.can_view_finance ?? false,
          class_id: enrollment?.class_id,
          class_name: enrollment?.class_id ? classMap.get(enrollment.class_id) : undefined,
          enrollment_id: enrollment?.id,
        }
      }))

      setGrades((gradesResult.data ?? []).map((grade) => {
        const assessment = assessmentMap.get(grade.assessment_id)
        return {
          ...grade,
          score: Number(grade.score),
          title: assessment?.title,
          assessment_date: assessment?.assessment_date,
          term: assessment?.term,
          max_score: assessment?.max_score ? Number(assessment.max_score) : undefined,
          subject: assessment?.subject_id ? subjectMap.get(assessment.subject_id) : undefined,
        }
      }))
      setPayments((paymentsResult.data ?? []).map((payment) => ({ ...payment, amount: Number(payment.amount) })))
      setAttendance(attendanceResult.data ?? [])
      setNotifications(notificationsResult.data ?? [])
      setEvents(eventsResult.data ?? [])
    } catch (cause) {
      console.error("Parent portal error:", cause)
      setError(cause instanceof Error ? cause.message : "Impossible de charger vos informations.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { loading, error, refresh, children, grades, payments, attendance, notifications, events }
}
