"use client"

import { useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"
import { emitSchoolRealtime } from "@/hooks/use-school-realtime"

const LIVE_TABLES = [
  "timetable_slots",
  "administrative_exclusions",
  "course_exclusions",
  "attendance_records",
  "teacher_lesson_entries",
  "teacher_homework",
  "assessments",
  "attendance_justification_requests",
  "payments",
  "enrollments",
  "documents",
  "school_events",
  "school_document_requests",
  "parent_document_publications",
  "class_breaks",
  "student_guardians",
  "students",
  "enrollment_options",
  "student_options",
  "teacher_lesson_attendance",
  "organization_payments",
  "parent_student_association_history",
  "pointage_alerts",
  "pointage_event_history",
  "staff_attendance",
  "staff_members",
  "sponsoring_organizations",
  "audit_logs",
  "enrollment_discount_snapshots",
  "establishment_members",
  "establishment_subscriptions",
  "family_discount_rules",
  "organization_coverage_rules",
  "organization_student_assignments",
  "parent_document_requests",
  "school_classes",
  "school_families",
  "student_family_members",
] as const

// Tables sans establishment_id : Realtime applique leurs politiques RLS à chaque abonné.
const LIVE_RLS_TABLES = ["payment_schedules", "payment_allocations", "grades", "class_subjects", "establishment_registration_requests", "parent_document_request_attachments", "student_transfer_requests", "establishments"] as const

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const { utilisateur, etablissementActif, contexte } = useAuthentification()
  const userId = utilisateur?.id ?? null
  const establishmentIds = (contexte?.establishments ?? []).map((item) => item.id).filter(Boolean)
  const activeEstablishmentId = etablissementActif?.id ?? establishmentIds[0] ?? null

  useEffect(() => {
    if (!userId) return

    const channels: ReturnType<typeof supabaseBrowser.channel>[] = []
    const notificationChannel = supabaseBrowser
      .channel("nova-notifications-" + userId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: "recipient_user_id=eq." + userId,
      }, (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>
        emitSchoolRealtime({
          table: "notifications",
          eventType: payload.eventType,
          establishmentId: typeof row.establishment_id === "string" ? row.establishment_id : undefined,
          record: row,
        })
        if (payload.eventType === "INSERT") {
          const title = typeof row.title === "string" ? row.title : "Nouvelle notification"
          const body = typeof row.body === "string" ? row.body : undefined
          toast(title, { description: body, duration: 6500 })
        }
      })
      .subscribe()
    channels.push(notificationChannel)

    if (contexte?.account_type !== "parent") {
      const channel = supabaseBrowser.channel("nova-school-data-" + userId + "-" + (activeEstablishmentId ?? "all"))
      if (activeEstablishmentId) {
        for (const table of LIVE_TABLES) {
          channel.on("postgres_changes", {
            event: "*",
            schema: "public",
            table,
            filter: "establishment_id=eq." + activeEstablishmentId,
          }, (payload) => {
            const row = (payload.new ?? payload.old) as Record<string, unknown>
            emitSchoolRealtime({
              table,
              eventType: payload.eventType,
              establishmentId: activeEstablishmentId,
              record: row,
            })
          })
        }
      }
      for (const table of LIVE_RLS_TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>
          emitSchoolRealtime({ table, eventType: payload.eventType, establishmentId: activeEstablishmentId ?? undefined, record: row })
        })
      }
      channels.push(channel.subscribe())
    }

    return () => {
      channels.forEach((channel) => { void supabaseBrowser.removeChannel(channel) })
    }
  }, [userId, activeEstablishmentId, contexte?.account_type])

  return <>{children}</>
}
