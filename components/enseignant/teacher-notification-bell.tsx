"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react"
import { enseignantPortalService, type TeacherNotification } from "@/services/enseignant-portal.service"
import { useSchoolRealtime } from "@/hooks/use-school-realtime"

type Props = { establishmentId: string }

function notificationHref(item: TeacherNotification, establishmentId: string) {
  const base = "/enseignant/etablissement/" + establishmentId
  const type = (item.type || "").toLowerCase()
  const entity = (item.entity_type || "").toLowerCase()

  if (entity === "attendance_record" || entity === "attendance_justification_request" || type.includes("attendance") || type.includes("presence")) return base + "/presences"
  if (entity === "grade" || entity === "student_grade" || type.includes("grade") || type.includes("note")) return base + "/notes"
  if (entity === "lesson" || entity === "homework" || type.includes("lesson") || type.includes("homework") || type.includes("cahier")) return base + "/cahier"
  if (entity === "timetable_slot" || entity === "timetable_schedule" || type.includes("timetable") || type.includes("planning")) return base + "/planning"
  if (entity === "support_request" || type.includes("support")) return "/enseignant/service-technique"
  return base
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Libreville",
  }).format(date)
}

export function TeacherNotificationBell({ establishmentId }: Props) {
  const router = useRouter()
  const revision = useSchoolRealtime(["notifications"])
  const [items, setItems] = useState<TeacherNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await enseignantPortalService.getNotifications(30))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les notifications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [revision])

  const unread = items.filter((item) => !item.read_at)
  const visible = unread.slice(0, 8)

  const openNotification = async (item: TeacherNotification) => {
    setBusy(item.id)
    try {
      if (!item.read_at) {
        const marked = await enseignantPortalService.markNotificationRead(item.id)
        if (!marked) throw new Error("La notification n’a pas pu être marquée comme lue.")
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry))
      }
      setOpen(false)
      router.push(notificationHref(item, establishmentId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’ouvrir cette notification.")
    } finally {
      setBusy(null)
    }
  }

  const markAll = async () => {
    setBusy("all")
    setError(null)
    try {
      await enseignantPortalService.markAllNotificationsRead()
      const readAt = new Date().toISOString()
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de marquer les notifications comme lues.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unread.length ? "Notifications non lues : " + unread.length : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#172033] transition-colors hover:bg-[#f3f4f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2441a5]"
      >
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unread.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1e40af] px-1 text-[9px] font-bold text-white ring-2 ring-white">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>

      {open && <>
        <button type="button" aria-label="Fermer les notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <section role="dialog" aria-label="Notifications" className="fixed left-3 right-3 top-[4.25rem] z-50 mx-auto w-auto max-w-[390px] overflow-hidden rounded-xl border border-[#e1e3eb] bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(92vw,390px)]">
          <div className="flex items-center justify-between border-b border-[#eceef3] px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-[#172033]">Notifications</h2>
              <p className="mt-0.5 text-xs text-[#6d7280]">{unread.length} non lue{unread.length > 1 ? "s" : ""}</p>
            </div>
            {unread.length > 0 && <button type="button" onClick={() => void markAll()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#2441a5] hover:bg-[#f2f4ff] disabled:opacity-50"><CheckCheck className="h-4 w-4" />Tout lire</button>}
          </div>
          {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#6d7280]"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-9 text-center text-sm text-[#6d7280]">Aucune nouvelle notification.</p>
          ) : (
            <ul className="max-h-[min(65vh,440px)] divide-y divide-[#eceef3] overflow-y-auto">
              {visible.map((item) => <li key={item.id}>
                <button type="button" onClick={() => void openNotification(item)} disabled={busy !== null} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#f7f8fc] disabled:opacity-60">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2441a5]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#172033]">{item.title || "Notification"}</span>
                    {item.body && <span className="mt-1 block text-xs leading-5 text-[#6d7280]">{item.body}</span>}
                    <span className="mt-1.5 block text-[10px] text-[#858b99]">{formatDate(item.created_at)}</span>
                  </span>
                  {busy === item.id ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-[#2441a5]" /> : <Check className="mt-1 h-4 w-4 text-[#a0a6b3]" />}
                </button>
              </li>)}
            </ul>
          )}
          <div className="border-t border-[#eceef3] px-4 py-2.5 text-[10px] text-[#858b99]">Les notifications sont actualisées automatiquement.</div>
        </section>
      </>}
    </div>
  )
}
