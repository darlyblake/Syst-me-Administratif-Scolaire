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

export type ParentJustificationRequest = {
  id: string
  attendance_id: string
  student_id: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  reviewer_note: string | null
  created_at: string
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

export type ClaimStudentInput = {
  studentId?: string
  studentNumber?: string
  birthDate: string
}

export function useParentPortal() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<ParentChild[]>([])
  const [grades, setGrades] = useState<ParentGrade[]>([])
  const [payments, setPayments] = useState<ParentPayment[]>([])
  const [attendance, setAttendance] = useState<ParentAttendance[]>([])
  const [justificationRequests, setJustificationRequests] = useState<ParentJustificationRequest[]>([])
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
        .select("student_id,establishment_id,relationship,can_view_academic,can_view_finance")
        .eq("guardian_user_id", userId)
        .eq("active", true)
      if (linksError) throw linksError

      const studentIds = (links ?? []).map((link) => link.student_id)
      const establishmentIds = [...new Set((links ?? []).map((link) => link.establishment_id))]

      const notificationsResult = await supabaseBrowser
        .from("notifications")
        .select("id,title,body,type,read_at,created_at")
        .eq("recipient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (notificationsResult.error) throw notificationsResult.error
      setNotifications(notificationsResult.data ?? [])

      if (studentIds.length === 0) {
        setChildren([])
        setGrades([])
        setPayments([])
        setAttendance([])
        setJustificationRequests([])
        setEvents([])
        return
      }

      const [studentsResult, enrollmentsResult, gradesResult, attendanceResult, justificationRequestsResult, eventsResult] = await Promise.all([
        supabaseBrowser.from("students").select("id,establishment_id,student_number,first_name,last_name,birth_date,sex,phone,email,active").in("id", studentIds).order("last_name").limit(100),
        supabaseBrowser.from("enrollments").select("id,student_id,class_id,status").in("student_id", studentIds).eq("status", "active").limit(200),
        supabaseBrowser.from("grades").select("id,student_id,score,comment,assessment_id,created_at").in("student_id", studentIds).order("created_at", { ascending: false }).limit(500),
        supabaseBrowser.from("attendance_records").select("id,student_id,attendance_date,status,reason").in("student_id", studentIds).order("attendance_date", { ascending: false }).limit(500),
        supabaseBrowser.from("attendance_justification_requests").select("id,attendance_id,student_id,reason,status,reviewer_note,created_at").order("created_at", { ascending: false }).limit(200),
        establishmentIds.length
          ? supabaseBrowser.from("school_events").select("id,establishment_id,title,description,event_type,starts_at,ends_at,location").in("establishment_id", establishmentIds).order("starts_at").limit(100)
          : Promise.resolve({ data: [], error: null }),
      ])
      for (const result of [studentsResult, enrollmentsResult, gradesResult, attendanceResult, justificationRequestsResult, eventsResult]) {
        if (result.error) throw result.error
      }

      const enrollments = enrollmentsResult.data ?? []
      const classIds = [...new Set(enrollments.map((item) => item.class_id).filter(Boolean))]
      const assessmentIds = [...new Set((gradesResult.data ?? []).map((item) => item.assessment_id))]

      const [classesResult, assessmentsResult] = await Promise.all([
        classIds.length
          ? supabaseBrowser.from("school_classes").select("id,name").in("id", classIds)
          : Promise.resolve({ data: [], error: null }),
        assessmentIds.length
          ? supabaseBrowser.from("assessments").select("id,title,assessment_date,term,max_score,subject_id").in("id", assessmentIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      for (const result of [classesResult, assessmentsResult]) {
        if (result.error) throw result.error
      }

      const subjectIds = [...new Set((assessmentsResult.data ?? []).map((item) => item.subject_id).filter(Boolean))]
      const subjectsResult = subjectIds.length
        ? await supabaseBrowser.from("subjects").select("id,name").in("id", subjectIds)
        : { data: [], error: null }
      if (subjectsResult.error) throw subjectsResult.error

      const paymentEnrollmentIds = enrollments.map((item) => item.id)
      const paymentsResult = paymentEnrollmentIds.length
        ? await supabaseBrowser.from("payments").select("id,enrollment_id,amount,payment_date,reference,method,notes").in("enrollment_id", paymentEnrollmentIds).order("payment_date", { ascending: false }).limit(500)
        : { data: [], error: null }
      if (paymentsResult.error) throw paymentsResult.error

      const classMap = new Map((classesResult.data ?? []).map((item) => [item.id, item.name]))
      const enrollmentMap = new Map(enrollments.map((item) => [item.student_id, item]))
      const linkMap = new Map((links ?? []).map((item) => [item.student_id, item]))
      const assessmentMap = new Map((assessmentsResult.data ?? []).map((item) => [item.id, item]))
      const subjectMap = new Map((subjectsResult.data ?? []).map((item) => [item.id, item.name]))
      const enrollmentStudentMap = new Map(enrollments.map((item) => [item.id, item.student_id]))

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

      setGrades((gradesResult.data ?? [])
        .filter((grade) => linkMap.get(grade.student_id)?.can_view_academic === true)
        .map((grade) => {
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

      setPayments((paymentsResult.data ?? [])
        .filter((payment) => {
          const studentId = enrollmentStudentMap.get(payment.enrollment_id)
          return studentId ? linkMap.get(studentId)?.can_view_finance === true : false
        })
        .map((payment) => ({ ...payment, amount: Number(payment.amount) })))

      setAttendance((attendanceResult.data ?? [])
        .filter((record) => linkMap.get(record.student_id)?.can_view_academic === true))
      setJustificationRequests((justificationRequestsResult.data ?? []) as ParentJustificationRequest[])
      setEvents(eventsResult.data ?? [])
    } catch (cause) {
      console.error("Parent portal error:", cause)
      setError(cause instanceof Error ? cause.message : "Impossible de charger vos informations.")
    } finally {
      setLoading(false)
    }
  }, [])

  const claimChild = useCallback(async (input: ClaimStudentInput) => {
    const studentNumber = input.studentNumber?.trim()
    const studentId = input.studentId?.trim()
    const birthDate = input.birthDate.trim()
    if ((!studentNumber && !studentId) || !birthDate) throw new Error("L'identifiant et la date de naissance sont obligatoires.")

    const { data, error } = await supabaseBrowser.functions.invoke("claim-student", {
      body: { student_id: studentId || undefined, student_number: studentNumber || undefined, birth_date: birthDate },
    })
    if (error) {
      let message = error.message
      try {
        const context = (error as { context?: Response }).context
        if (context) {
          const payload = await context.json() as { error?: string }
          message = payload.error ?? message
        }
      } catch {}
      throw new Error(message)
    }
    if (!data?.linked) throw new Error("Le rattachement de l'élève n'a pas été confirmé.")
    await refresh()
    return data
  }, [refresh])

  const unclaimChild = useCallback(async (studentId: string) => {
    const normalizedStudentId = studentId.trim()
    if (!normalizedStudentId) throw new Error("Identifiant de l'élève invalide.")

    const { data, error } = await supabaseBrowser.rpc("unclaim_student", {
      p_student_id: normalizedStudentId,
    })
    if (error) throw error
    if (data !== true) throw new Error("Cette association n'est plus active ou n'appartient pas à votre compte.")

    setChildren((current) => current.filter((child) => child.id !== normalizedStudentId))
    return true
  }, [])

  const requestAttendanceJustification = useCallback(async (attendance: ParentAttendance, reason: string) => {
    const normalizedReason = reason.trim()
    if (normalizedReason.length < 3 || normalizedReason.length > 2000) throw new Error("Le motif doit contenir entre 3 et 2000 caractères.")
    const child = children.find((item) => item.id === attendance.student_id)
    if (!child || !child.can_view_academic) throw new Error("Vous n'êtes pas autorisé à justifier cette absence.")
    const { data: authData, error: authError } = await supabaseBrowser.auth.getUser()
    if (authError || !authData.user) throw new Error("Session parent introuvable.")
    const { data, error } = await supabaseBrowser
      .from("attendance_justification_requests")
      .insert({
        attendance_id: attendance.id,
        student_id: attendance.student_id,
        establishment_id: child.establishment_id,
        parent_user_id: authData.user.id,
        reason: normalizedReason,
      })
      .select("id,attendance_id,student_id,reason,status,reviewer_note,created_at")
      .single()
    if (error) throw error
    setJustificationRequests((current) => [data as ParentJustificationRequest, ...current])
    return data
  }, [children])

  const cancelAttendanceJustification = useCallback(async (requestId: string) => {
    const { error } = await supabaseBrowser
      .from("attendance_justification_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId)
      .eq("status", "pending")
    if (error) throw error
    setJustificationRequests((current) => current.map((item) => item.id === requestId ? { ...item, status: "cancelled" } : item))
  }, [])

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const { data: authData, error: authError } = await supabaseBrowser.auth.getUser()
    if (authError || !authData.user) throw new Error("Session parent introuvable.")
    const now = new Date().toISOString()
    const { error } = await supabaseBrowser
      .from("notifications")
      .update({ read_at: now })
      .eq("id", notificationId)
      .eq("recipient_user_id", authData.user.id)
    if (error) throw error
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, read_at: now } : item))
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    const { data: authData, error: authError } = await supabaseBrowser.auth.getUser()
    if (authError || !authData.user) throw new Error("Session parent introuvable.")
    const now = new Date().toISOString()
    const { error } = await supabaseBrowser
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_user_id", authData.user.id)
      .is("read_at", null)
    if (error) throw error
    setNotifications((current) => current.map((item) => item.read_at ? item : { ...item, read_at: now }))
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { loading, error, refresh, children, grades, payments, attendance, justificationRequests, notifications, events, claimChild, unclaimChild, requestAttendanceJustification, cancelAttendanceJustification, markNotificationRead, markAllNotificationsRead }
}
