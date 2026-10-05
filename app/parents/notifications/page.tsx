"use client"

import { useMemo, useState } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentNotifications() {
  const { loading, error, refresh, notifications, markNotificationRead, markAllNotificationsRead } = useParentPortal()
  const unread = useMemo(() => notifications.filter((notification) => !notification.read_at), [notifications])
  const [busy, setBusy] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      <ParentPageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Les informations importantes envoyées à votre compte."
        onRefresh={() => void refresh()}
        refreshing={loading}
        action={
          unread.length > 0 ? (
            <Button size="sm" variant="outline" disabled={busy === "all"} onClick={() => void markAllAsRead()}>
              <Check className="mr-2 h-4 w-4" />
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && notifications.length === 0 ? (
        <ParentEmptyState
          title="Aucune notification"
          description="Vous serez informé ici lorsqu’un établissement vous enverra une information."
        />
      ) : (
        <section className="border-y border-terre/10 bg-papier">
          <div className="flex items-center justify-between border-b border-terre/10 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-pierre">
              {notifications.length} notification{notifications.length > 1 ? "s" : ""}
            </p>
            {unread.length > 0 && (
              <p className="text-xs font-medium text-terre">
                {unread.length} non lue{unread.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="divide-y divide-terre/10">
            {notifications.map((notification) => {
              const unreadItem = !notification.read_at

              return (
                <article
                  key={notification.id}
                  className={unreadItem ? "border-l-2 border-terre bg-terre-soft/15 px-5 py-5" : "px-5 py-5"}
                >
                  <div className="flex items-start gap-4">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-terre" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="flex items-center gap-2">
                          <h2 className="font-medium text-terre">{notification.title}</h2>
                          {unreadItem && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-terre" aria-label="Non lue" />}
                        </div>
                        <time className="shrink-0 text-xs text-pierre">
                          {new Date(notification.created_at).toLocaleString("fr-FR")}
                        </time>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-pierre">
                        {notification.body}
                      </p>

                      {unreadItem && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 px-0 text-terre"
                          disabled={busy === notification.id}
                          onClick={() => void markOneAsRead(notification.id)}
                        >
                          <Check className="mr-1.5 h-4 w-4" />
                          Marquer comme lue
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
