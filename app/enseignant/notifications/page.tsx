"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherNotification } from "@/services/enseignant-portal.service"
import { TeacherShell } from "@/components/enseignant/teacher-shell"

export default function NotificationsEnseignantPage() {
  const router = useRouter()
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.[0]
  const [items, setItems] = useState<TeacherNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try { setItems(await enseignantPortalService.getNotifications()) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les notifications.") }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/")
    else if (!estEnCoursDeChargement) void load()
  }, [estEnCoursDeChargement, utilisateur, router])

  const unread = items.filter((item) => !item.read_at).length
  const markOne = async (id: string) => {
    try {
      const ok = await enseignantPortalService.markNotificationRead(id)
      if (ok) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item))
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de marquer la notification.") }
  }
  const markAll = async () => {
    try {
      await enseignantPortalService.markAllNotificationsRead()
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })))
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de marquer les notifications.") }
  }

  if (estEnCoursDeChargement || !utilisateur) return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>

  const content = (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e4e6ef] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Informations</p>
          <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-[#6d7280]">Les informations importantes de vos établissements.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center rounded-md border border-[#dfe2ec] bg-white px-3 py-2 text-sm font-medium">
            <RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />Actualiser
          </button>
          {unread > 0 && <button type="button" onClick={() => void markAll()} className="inline-flex items-center rounded-md border border-[#dfe2ec] bg-white px-3 py-2 text-sm font-medium"><CheckCheck className="mr-2 h-4 w-4" />Tout lire</button>}
        </div>
      </header>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="mt-5 overflow-hidden rounded-lg border border-[#e1e3eb] bg-white">
        {loading ? <div className="p-12 text-center text-sm text-[#6d7280]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Chargement des notifications…</p></div> :
        items.length === 0 ? <div className="p-12 text-center"><Bell className="mx-auto h-8 w-8 text-[#8a90a0]" /><p className="mt-3 font-semibold">Aucune notification</p><p className="mt-1 text-sm text-[#6d7280]">Vous êtes à jour.</p></div> :
        <div className="divide-y divide-[#eceef3]">{items.map((item) => <button type="button" key={item.id} onClick={() => !item.read_at && void markOne(item.id)} className={"block w-full px-4 py-4 text-left transition hover:bg-[#fafaff] " + (!item.read_at ? "bg-[#f7f8ff]" : "")}>
          <div className="flex gap-3"><span className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " + (item.read_at ? "bg-[#d7d9e1]" : "bg-[#3152c8]")} />
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">{item.title}</p><time className="text-xs text-[#858b99]">{new Date(item.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</time></div>{item.body && <p className="mt-1 text-sm text-[#6d7280]">{item.body}</p>}</div>
          </div>
        </button>)}</div>}
      </section>
    </div>
  )

  return establishment ? <TeacherShell establishmentId={establishment.id} establishmentName={establishment.name} active="today">{content}</TeacherShell> : <main className="min-h-screen bg-[#f8f8fc] p-4 sm:p-6">{content}</main>
}
