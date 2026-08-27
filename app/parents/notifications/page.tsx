"use client"

import { useMemo } from "react"
import { Bell, AlertTriangle, Info, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { serviceParents } from "@/services/parents.service"

export default function ParentsNotificationsPage() {
  const notifications = useMemo(() => serviceParents.obtenirNotifications(), [])
  const nonLues = notifications.filter((n) => !n.lu).length

  const prioriteBadge = (p: string) => {
    if (p === "urgente") return "bg-rose-100 text-rose-700"
    if (p === "importante") return "bg-amber-100 text-amber-700"
    return "bg-slate-100 text-pierre"
  }

  const typeIcon = (t: string) => {
    if (t === "alerte") return AlertTriangle
    if (t === "rappel") return Clock
    return Info
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
            <Bell className="h-6 w-6 text-terre" />
            Notifications
          </h1>
          <p className="text-pierre">Messages et alertes de l&apos;école</p>
        </div>
        {nonLues > 0 && (
          <Badge className="bg-violet-600 text-white hover:bg-violet-600">
            {nonLues} non lue{nonLues > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = typeIcon(n.typeNotification)
          return (
            <Card
              key={n.id}
              className={`border-terre/10 transition ${!n.lu ? "bg-terre-soft/50 ring-1 ring-violet-200" : ""}`}
            >
              <CardContent className="flex gap-4 p-5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    n.priorite === "urgente"
                      ? "bg-rose-100 text-rose-600"
                      : n.priorite === "importante"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-terre-soft text-terre"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-terre">{n.titre}</h3>
                    {!n.lu && (
                      <span className="h-2 w-2 rounded-full bg-terre-soft0" title="Non lue" />
                    )}
                    <Badge className={prioriteBadge(n.priorite)} variant="secondary">
                      {n.priorite}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-pierre">{n.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(n.dateEnvoi || n.dateCreation).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {n.creePar}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
