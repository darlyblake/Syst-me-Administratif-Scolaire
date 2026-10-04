"use client"

import { useMemo, useState } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

export default function ParentNotifications() {
  const {loading,error,refresh,notifications,markNotificationRead,markAllNotificationsRead}=useParentPortal()
  const unread=useMemo(()=>notifications.filter(n=>!n.read_at),[notifications])
  const [busy,setBusy]=useState<string|null>(null)
  return <div className="space-y-6">
    <ParentPageHeader eyebrow="Communication" title="Notifications" description="Les informations importantes envoyées à votre compte." onRefresh={()=>void refresh()} refreshing={loading} action={unread.length?<Button size="sm" variant="outline" disabled={busy==="all"} onClick={()=>{setBusy("all");void markAllNotificationsRead().finally(()=>setBusy(null))}}><Check className="mr-2 h-4 w-4"/>Tout marquer comme lu</Button>:undefined}/>
    {error&&<div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading&&notifications.length===0?<ParentEmptyState title="Aucune notification" description="Vous serez informé ici lorsqu’un établissement vous enverra une information."/>:<div className="border border-terre/10 bg-papier divide-y divide-terre/10">
      {notifications.map(n=><div key={n.id} className={n.read_at?"px-5 py-4":"border-l-2 border-terre bg-terre-soft/20 px-5 py-4"}><div className="flex items-start gap-4"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-terre"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium text-terre">{n.title}</h2><time className="text-xs text-pierre">{new Date(n.created_at).toLocaleString("fr-FR")}</time></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-pierre">{n.body}</p>{!n.read_at&&<Button size="sm" variant="ghost" className="mt-2 px-0 text-terre" disabled={busy===n.id} onClick={()=>{setBusy(n.id);void markNotificationRead(n.id).finally(()=>setBusy(null))}}><Check className="mr-1.5 h-4 w-4"/>Marquer comme lue</Button>}</div></div></div>)}
    </div>}
  </div>
}
