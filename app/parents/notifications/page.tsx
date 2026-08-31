"use client"

import { useMemo, useState } from "react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { AlertTriangle, Bell, Check, Clock, Info, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ParentsNotificationsPage() {
  const { loading, error, refresh, notifications, markNotificationRead } = useParentPortal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const unread = useMemo(() => notifications.filter((notification) => !notification.read_at).length, [notifications])

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      await markNotificationRead(id)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-pierre">Chargement des notifications...</div>

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-terre"><Bell className="h-6 w-6" />Notifications</h1>
          <p className="mt-1 text-sm text-pierre">Messages et alertes qui vous sont destinés.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </header>

      {unread > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-terre/10 bg-terre-soft/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-terre">{unread} notification{unread > 1 ? "s" : ""} non lue{unread > 1 ? "s" : ""}</p>
          <p className="text-xs text-pierre">Ouvrez une notification puis marquez-la comme lue.</p>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" onClick={() => void refresh()} className="border-red-200 bg-white text-red-700">Réessayer</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Bell className="mx-auto h-8 w-8 text-pierre/60" /><p className="mt-3 font-medium text-terre">Aucune notification</p><p className="mt-1 text-sm text-pierre">Vous serez informé ici lorsqu'un message vous sera envoyé.</p></CardContent></Card>
        ) : notifications.map((notification) => {
          const Icon = notification.type === "alerte" ? AlertTriangle : notification.type === "rappel" ? Clock : Info
          const unreadItem = !notification.read_at
          return (
            <Card key={notification.id} className={unreadItem ? "border-terre/20 bg-terre-soft/30 ring-1 ring-terre/10" : "border-terre/10"}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terre-soft text-terre"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-terre">{notification.title}</h3>
                    {unreadItem && <Badge variant="outline">Non lue</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-pierre">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">{new Date(notification.created_at).toLocaleString("fr-FR")}</p>
                    {unreadItem && (
                      <Button size="sm" variant="outline" disabled={busyId === notification.id} onClick={() => void markRead(notification.id)}>
                        <Check className="mr-1.5 h-4 w-4" />{busyId === notification.id ? "Enregistrement..." : "Marquer comme lue"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
