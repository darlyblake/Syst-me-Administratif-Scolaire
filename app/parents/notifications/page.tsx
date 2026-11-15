"use client"

import { useMemo, useState } from "react"
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

type NotificationFilter = "all" | "unread"

export default function ParentNotifications() {
  const {
    loading,
    error,
    refresh,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useParentPortal()
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [busy, setBusy] = useState<string | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  )

  const visibleNotifications = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((notification) => !notification.read_at)
        : notifications,
    [filter, notifications],
  )

  const markOneAsRead = async (id: string) => {
    setBusy(id)
    try {
      await markNotificationRead(id)
    } finally {
      setBusy(null)
    }
  }

  const markAllAsRead = async () => {
    setBusy("all")
    try {
      await markAllNotificationsRead()
    } finally {
      setBusy(null)
    }
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const today = new Date()
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    return isToday
      ? `Aujourd’hui à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      : date.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
        })
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-4 sm:space-y-6">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Espace parent
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                Notifications
              </h1>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Actualiser les notifications"
            title="Actualiser"
            disabled={loading}
            onClick={() => void refresh()}
            className="h-10 w-10 shrink-0 rounded-full text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {unreadCount === 0
                ? "Vous êtes à jour"
                : `${unreadCount} notification${unreadCount > 1 ? "s" : ""} à consulter`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {notifications.length} au total
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy === "all"}
              onClick={() => void markAllAsRead()}
              className="h-9 shrink-0 rounded-full px-3 text-xs font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Tout lire
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2" aria-label="Filtrer les notifications">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Toutes
          <span className="ml-1.5 opacity-75">{notifications.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          aria-pressed={filter === "unread"}
          className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-blue-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Non lues
          {unreadCount > 0 && (
            <span className="ml-1.5 opacity-75">{unreadCount}</span>
          )}
        </button>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex animate-pulse gap-3 px-4 py-5">
              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/5 rounded bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="h-2.5 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <ParentEmptyState
          title={filter === "unread" ? "Aucune notification non lue" : "Aucune notification"}
          description={
            filter === "unread"
              ? "Toutes vos notifications ont été consultées."
              : "Les informations envoyées par votre établissement apparaîtront ici."
          }
        />
      ) : (
        <section
          aria-label="Liste des notifications"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          {visibleNotifications.map((notification, index) => {
            const isUnread = !notification.read_at

            return (
              <article
                key={notification.id}
                className={`relative flex gap-3 px-4 py-4 sm:gap-4 sm:px-5 ${
                  index > 0 ? "border-t border-slate-100" : ""
                } ${isUnread ? "bg-blue-50/60" : "bg-white"}`}
              >
                {isUnread && (
                  <span
                    aria-label="Non lue"
                    className="absolute bottom-0 left-0 top-0 w-0.5 bg-blue-600"
                  />
                )}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    isUnread
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isUnread ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <h2 className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-900">
                      {notification.title}
                    </h2>
                    <time
                      dateTime={notification.created_at}
                      className="shrink-0 text-[11px] text-slate-500"
                    >
                      {formatDate(notification.created_at)}
                    </time>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600">
                    {notification.body}
                  </p>

                  {isUnread && (
                    <button
                      type="button"
                      disabled={busy === notification.id}
                      onClick={() => void markOneAsRead(notification.id)}
                      className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {busy === notification.id ? "Mise à jour…" : "Marquer comme lue"}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
