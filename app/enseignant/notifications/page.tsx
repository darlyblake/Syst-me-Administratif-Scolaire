"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthentification } from "@/providers/authentification.provider"
import { enseignantPortalService, type TeacherNotification } from "@/services/enseignant-portal.service"

export default function NotificationsEnseignantPage() {
  const router = useRouter()
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()
  const [items, setItems] = useState<TeacherNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setItems(await enseignantPortalService.getNotifications()) }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les notifications.") }
    finally { setLoading(false) }
  }

  useEffect(() => { if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant")) router.replace("/"); else if (!estEnCoursDeChargement) void load() }, [estEnCoursDeChargement, utilisateur, router])

  const unread = items.filter((item) => !item.read_at).length
  const markOne = async (id: string) => { const ok = await enseignantPortalService.markNotificationRead(id); if (ok) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)) }
  const markAll = async () => { await enseignantPortalService.markAllNotificationsRead(); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))) }

  if (estEnCoursDeChargement || !utilisateur) return <main className="min-h-screen bg-creme flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></main>
  return <main className="min-h-screen bg-creme"><div className="mx-auto max-w-4xl px-4 py-6 sm:px-6"><header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-terre">Espace enseignant</p><h1 className="text-2xl font-semibold">Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Les informations importantes de vos établissements.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>{unread > 0 && <Button variant="outline" size="sm" onClick={() => void markAll()}><CheckCheck className="mr-2 h-4 w-4" />Tout lire</Button>}</div></header>
    {error && <div className="mb-4 rounded-lg border p-4 text-sm text-rouge-terre">{error}</div>}
    <Card><CardContent className="p-0">{loading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : items.length === 0 ? <div className="p-10 text-center"><Bell className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucune notification</p><p className="mt-1 text-sm text-muted-foreground">Vous êtes à jour.</p></div> : <div className="divide-y">{items.map((item) => <button type="button" key={item.id} onClick={() => !item.read_at && void markOne(item.id)} className={`block w-full px-5 py-4 text-left transition-colors hover:bg-muted/30 ${!item.read_at ? "bg-white" : "opacity-75"}`}><div className="flex gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-muted" : "bg-terre"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-medium">{item.title}</p><time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</time></div>{item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}</div></div></button>)}</div>}</CardContent></Card>
  </div></main>
}
