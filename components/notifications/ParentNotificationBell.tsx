"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"

function getNotificationHref(type: string, entityType?: string | null) {
  if (type === "attendance_justification_reviewed" || type.startsWith("attendance_")) return "/parents/absences"
  if (type === "timetable_updated" || entityType === "timetable_schedule") return "/parents/emploi-du-temps"
  if (entityType === "payment_schedule" || type.startsWith("payment_")) return "/parents/paiements"
  if (entityType === "school_event") return "/parents/evenements"
  if (entityType === "grade" || entityType === "student_grade") return "/parents/notes"
  if (entityType === "school_document_request" || entityType === "parent_document_publication") return "/parents/documents"
  return "/parents/tableau-bord"
}

export function ParentNotificationBell() {
  const router = useRouter()
  const { notifications, loading, markNotificationRead, markAllNotificationsRead } = useParentPortal()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const unread = notifications.filter((item) => !item.read_at)
  const visible = unread.slice(0, 8)

  const openNotification = async (item: (typeof notifications)[number]) => {
    setBusy(item.id)
    try {
      if (!item.read_at) await markNotificationRead(item.id)
      setOpen(false)
      router.push(getNotificationHref(item.type, item.entity_type))
    } catch (error) {
      console.error("Impossible d’ouvrir la notification", error)
    } finally {
      setBusy(null)
    }
  }

  const clearNotifications = async () => {
    setBusy("all")
    try {
      await markAllNotificationsRead()
    } catch (error) {
      console.error("Impossible de vider les notifications non lues", error)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={unread.length ? `Notifications non lues : ${unread.length}` : "Notifications"} aria-expanded={open} className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
        <Bell className="h-5 w-5" strokeWidth={1.8} />
        {unread.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-700 px-1 text-[9px] font-bold text-white ring-2 ring-white">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>

      {open && <>
        <button type="button" aria-label="Fermer les notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <section role="dialog" aria-label="Notifications" className="fixed left-3 right-3 top-[4.25rem] z-50 mx-auto w-auto max-w-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(92vw,390px)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              <p className="mt-0.5 text-xs text-slate-500">{unread.length} non lue{unread.length > 1 ? "s" : ""}</p>
            </div>
            {unread.length > 0 && <button type="button" onClick={() => void clearNotifications()} disabled={busy === "all"} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"><CheckCheck className="h-4 w-4" />Tout vider</button>}
          </div>
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-9 text-center text-sm text-slate-500">Aucune nouvelle notification.</p>
          ) : (
            <ul className="max-h-[min(65vh,440px)] divide-y divide-slate-100 overflow-y-auto">
              {visible.map((item) => <li key={item.id}>
                <button type="button" onClick={() => void openNotification(item)} disabled={busy === item.id} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-60">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{item.title || "Notification"}</span>
                    {item.body && <span className="mt-1 block text-xs leading-5 text-slate-600">{item.body}</span>}
                    <span className="mt-1.5 block text-[10px] text-slate-400">{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Libreville" }).format(new Date(item.created_at))}</span>
                  </span>
                  {busy === item.id ? <Loader2 className="mt-1 h-4 w-4 animate-spin text-blue-700" /> : <Check className="mt-1 h-4 w-4 text-slate-300" />}
                </button>
              </li>)}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400">Les notifications sont mises à jour automatiquement</div>
        </section>
      </>}
    </div>
  )
}
