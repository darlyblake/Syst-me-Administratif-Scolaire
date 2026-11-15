"use client"

import { useMemo, useState } from "react"
import { Check, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"

type NotificationFilter = "all" | "unread"

export default function ParentNotifications() {
  const { loading, error, refresh, notifications, markNotificationRead, markAllNotificationsRead } = useParentPortal()
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [busy, setBusy] = useState<string | null>(null)

  const unreadCount = useMemo(() => notifications.filter(item => !item.read_at).length, [notifications])
  const visibleNotifications = useMemo(
    () => filter === "unread" ? notifications.filter(item => !item.read_at) : notifications,
    [filter, notifications],
  )

  const markOneAsRead = async (id: string) => {
    setBusy(id)
    try { await markNotificationRead(id) } finally { setBusy(null) }
  }
  const markAllAsRead = async () => {
    setBusy("all")
    try { await markAllNotificationsRead() } finally { setBusy(null) }
  }
  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const today = new Date()
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    return isToday
      ? `Aujourd’hui à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" })
  }

  return (
    <div className="space-y-5">
      <ParentPageHeader title="Notifications" description="Les informations transmises par les établissements." onRefresh={() => void refresh()} refreshing={loading} />
      {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <p className="text-sm text-slate-600">
          {unreadCount === 0 ? "Toutes les notifications ont été consultées." : <><strong className="font-semibold text-slate-900">{unreadCount}</strong> notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}</>}
          <span className="ml-2 text-slate-400">· {notifications.length} au total</span>
        </p>
        {unreadCount > 0 && <Button type="button" variant="outline" size="sm" disabled={busy === "all"} onClick={() => void markAllAsRead()} className="rounded-md border-slate-300 bg-white"><CheckCheck className="mr-2 h-4 w-4" />Tout marquer comme lu</Button>}
      </div>

      <div className="flex gap-5 border-b border-slate-200" aria-label="Filtrer les notifications">
        <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={`border-b-2 px-1 pb-2 text-sm ${filter === "all" ? "border-blue-700 font-semibold text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          Toutes ({notifications.length})
        </button>
        <button type="button" onClick={() => setFilter("unread")} aria-pressed={filter === "unread"} className={`border-b-2 px-1 pb-2 text-sm ${filter === "unread" ? "border-blue-700 font-semibold text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          Non lues ({unreadCount})
        </button>
      </div>

      {loading && notifications.length === 0 ? (
        <p className="border-y border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">Chargement des notifications…</p>
      ) : visibleNotifications.length === 0 ? (
        <ParentEmptyState title={filter === "unread" ? "Aucune notification non lue" : "Aucune notification"} description={filter === "unread" ? "Toutes vos notifications ont été consultées." : "Les informations envoyées par votre établissement apparaîtront ici."} />
      ) : (
        <section aria-label="Liste des notifications">
          {visibleNotifications.map((notification, index) => {
            const isUnread = !notification.read_at
            return (
              <article key={notification.id} className={`relative flex gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:px-5 ${isUnread ? "bg-slate-50" : "bg-white"}`}>
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" aria-label={isUnread ? "Non lue" : "Lue"} style={{ backgroundColor: isUnread ? "#2563eb" : "transparent" }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <h2 className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{notification.title}</h2>
                    <time dateTime={notification.created_at} className="shrink-0 text-xs text-slate-500">{formatDate(notification.created_at)}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">{notification.body}</p>
                  {isUnread && <button type="button" disabled={busy === notification.id} onClick={() => void markOneAsRead(notification.id)} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"><Check className="h-3.5 w-3.5" />{busy === notification.id ? "Mise à jour…" : "Marquer comme lue"}</button>}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
