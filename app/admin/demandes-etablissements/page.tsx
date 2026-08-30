"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, RefreshCw, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthentification } from "@/providers/authentification.provider"

type Request = { id: string; establishment_name: string; establishment_type: string | null; country: string; city: string | null; address: string | null; phone: string | null; establishment_email: string | null; requester_first_name: string; requester_last_name: string; requester_email: string; requester_phone: string | null; message: string | null; status: "pending" | "approved" | "rejected"; created_at: string }

export default function EstablishmentRequestsPage() {
  const { utilisateur } = useAuthentification()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    const { data, error: queryError } = await supabase.from("establishment_registration_requests").select("*").order("created_at", { ascending: false })
    if (queryError) setError("Impossible de charger les demandes.")
    else setRequests((data ?? []) as Request[])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const review = async (requestId: string, action: "approve" | "reject") => {
    setBusy(requestId); setError("")
    const { data, error: fnError } = await supabase.functions.invoke("approve-establishment-request", { body: { requestId, action } })
    if (fnError || data?.error) setError(data?.error ?? "Impossible de traiter la demande.")
    else await load()
    setBusy(null)
  }

  if (utilisateur?.role && utilisateur.role !== "platform_admin") return <main className="p-8"><h1 className="text-xl font-bold">Accès refusé</h1><p className="mt-2 text-slate-600">Cette page est réservée à l’administration générale.</p></main>

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl"><div className="flex items-center justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold">Demandes d’établissements</h1><p className="text-slate-600">Validez les établissements avant de créer leur espace.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm"><RefreshCw size={16} /> Actualiser</button></div>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="rounded-xl bg-white p-10 text-center"><Loader2 className="mx-auto animate-spin" /></div> : requests.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-slate-500">Aucune demande pour le moment.</div> : <div className="space-y-4">{requests.map(request => <article key={request.id} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{request.establishment_name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${request.status === "pending" ? "bg-amber-100 text-amber-800" : request.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{request.status === "pending" ? "En attente" : request.status === "approved" ? "Approuvée" : "Refusée"}</span></div><p className="mt-1 text-sm text-slate-500">{request.establishment_type || "Établissement"} · {request.city || "Ville non précisée"} · {request.country}</p><div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm"><p><strong>Responsable :</strong> {request.requester_first_name} {request.requester_last_name}</p><p><strong>Email :</strong> {request.requester_email}</p><p><strong>Téléphone :</strong> {request.requester_phone || "—"}</p><p><strong>Établissement :</strong> {request.establishment_email || request.phone || "—"}</p></div>{request.message && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{request.message}</p>}</div>{request.status === "pending" && <div className="flex shrink-0 gap-2"><button disabled={busy === request.id} onClick={() => review(request.id, "reject")} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50"><X size={16} /> Refuser</button><button disabled={busy === request.id} onClick={() => review(request.id, "approve")} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy === request.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Approuver</button></div>}</div></article>)}</div>}
  </div></main>
}
