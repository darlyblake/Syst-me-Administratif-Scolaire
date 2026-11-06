"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, Loader2 } from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"
import {
  getUnreadNotificationCount,
  listNotificationsPaginated,
  markNotificationRead,
  type NotificationRecord,
} from "@/lib/supabase/services/notifications.service"

function notificationHref(notification: NotificationRecord) {
  switch (notification.entity_type) {
    case "payment_schedule":
      return "/ecole/finance/paiements"
    case "enrollment":
      return "/ecole/inscriptions"
    case "school_document_request":
    case "parent_document_request":
    case "parent_document_publication":
      return "/ecole/documents"
    case "attendance_record":
    case "attendance_justification_request":
      return "/ecole/absences"
    case "school_event":
      return "/ecole/evenements"
    case "support_request":
      return "/ecole/communication"
    default:
      return null
  }
}

function formatNotificationDate(value?: string | null) {
  if (!value) return ""
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

export default function NotificationBell() {
  const router = useRouter()
  const { utilisateur, primaryEstablishment } = useUserContext()
  const userId = utilisateur?.id ?? null
  const establishmentId = primaryEstablishment?.id ?? null
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const refreshCount = useCallback(async () => {
    if (!establishmentId) {
      setUnreadCount(0)
      return
    }
    try {
      const count = await getUnreadNotificationCount(establishmentId)
      setUnreadCount(count)
    } catch (cause) {
      console.error("Chargement du compteur de notifications impossible", cause)
      setError("Le compteur de notifications est indisponible.")
    }
  }, [establishmentId])

  const loadItems = useCallback(async () => {
    if (!establishmentId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await listNotificationsPaginated(establishmentId, 1, 8, false)
      setItems(page.items)
    } catch (cause) {
      console.error("Chargement des notifications impossible", cause)
      setError("Impossible de charger les notifications pour le moment.")
    } finally {
      setLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    if (!userId || !establishmentId) {
      setUnreadCount(0)
      setItems([])
      return
    }
    void refreshCount()
    const channel = supabaseBrowser
      .channel("school-notifications-" + userId + "-" + establishmentId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "recipient_user_id=eq." + userId,
        },
        () => {
          void refreshCount()
          if (open) void loadItems()
        },
      )
      .subscribe()
    return () => {
      void supabaseBrowser.removeChannel(channel)
    }
  }, [userId, establishmentId, open, refreshCount, loadItems])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      void loadItems()
      void refreshCount()
    }
  }

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (notification.read_at == null) {
      setUpdatingId(notification.id)
      try {
        await markNotificationRead(notification.id)
        const readAt = new Date().toISOString()
        setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item))
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch (cause) {
        console.error("Impossible de marquer la notification comme lue", cause)
        setError("Cette notification n’a pas pu être marquée comme lue.")
        setUpdatingId(null)
        return
      }
      setUpdatingId(null)
    }
    const href = notificationHref(notification)
    setOpen(false)
    if (href) router.push(href)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={unreadCount > 0 ? "Notifications non lues : " + unreadCount : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded text-[#444651] hover:bg-[#f2f3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#ba1a1a] px-1 text-[9px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Fermer les notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <section role="dialog" aria-label="Centre de notifications" className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-lg border border-[#c5c5d3] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e1e3eb] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[#131b2e]">Notifications</h2>
                <p className="mt-0.5 text-[11px] text-[#515f74]">{unreadCount} non lue(s)</p>
              </div>
              <button type="button" onClick={() => { void loadItems(); void refreshCount() }} className="rounded px-2 py-1 text-[11px] font-medium text-[#1e3a8a] hover:bg-[#f2f3ff]">
                Actualiser
              </button>
            </div>

            {error && <p role="alert" className="border-b border-[#f3c7c4] bg-[#fff4f2] px-4 py-2 text-xs text-[#9b1c1c]">{error}</p>}

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#515f74]">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#515f74]">Aucune notification pour le moment.</p>
            ) : (
              <ul className="max-h-[min(65vh,440px)] divide-y divide-[#edf0f5] overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(item)}
                      disabled={updatingId === item.id}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7f8fc] disabled:opacity-60"
                    >
                      <span className={["mt-1.5 h-2 w-2 shrink-0 rounded-full", item.read_at ? "bg-[#c5c5d3]" : "bg-[#1e3a8a]"].join(" ")} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#131b2e]">{item.title || "Notification"}</span>
                          {item.read_at ? <Check className="h-3.5 w-3.5 shrink-0 text-[#64748b]" /> : null}
                        </span>
                        {item.body && <span className="mt-1 block text-[11px] leading-4 text-[#515f74]">{item.body}</span>}
                        <span className="mt-1.5 block text-[10px] text-[#7a8496]">{formatNotificationDate(item.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-[#e1e3eb] px-4 py-2 text-[10px] text-[#7a8496]">
              Notifications personnelles de cet établissement
            </div>
          </section>
        </>
      )}
    </div>
  )
}
