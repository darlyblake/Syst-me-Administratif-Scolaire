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
  "grades",
  "payments",
  "payment_schedules",
  "enrollments",
  "documents",
  "school_events",
  "school_document_requests",
  "parent_document_publications",
  "class_breaks",
] as const

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

    if (activeEstablishmentId) {
      const channel = supabaseBrowser.channel("nova-school-data-" + userId + "-" + activeEstablishmentId)
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
      channels.push(channel.subscribe())
    }

    return () => {
      channels.forEach((channel) => { void supabaseBrowser.removeChannel(channel) })
    }
  }, [userId, activeEstablishmentId])

  return <>{children}</>
}
