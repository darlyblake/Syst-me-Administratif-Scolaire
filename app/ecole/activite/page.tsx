"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, History, RefreshCw, Search, UserRound } from "lucide-react"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useUserContext } from "@/hooks/useUserContext"

type ActivityRow = {
  id: string
  actor_id: string | null
  action: string | null
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, any> | null
  created_at: string
  actor_name?: string
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Libreville",
  })

export default function JournalActivitePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async (manual = false) => {
    if (!establishmentId) {
      setRows([])
      setLoading(false)
      return
    }
    if (manual) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const { data, error: queryError } = await supabaseBrowser
        .from("audit_logs")
        .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false })
        .limit(100)
      if (queryError) throw queryError

      const logs = (data ?? []) as ActivityRow[]
      const actorIds = Array.from(new Set(logs.map((row) => row.actor_id).filter((id): id is string => Boolean(id))))
      let names = new Map<string, string>()
      if (actorIds.length) {
        const { data: profiles, error: profileError } = await supabaseBrowser
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", actorIds)
        if (profileError) throw profileError
        names = new Map((profiles ?? []).map((profile: any) => [
          profile.id,
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim(),
        ]))
      }
      setRows(logs.map((row) => ({
        ...row,
        actor_name: row.actor_id
          ? (names.get(row.actor_id) || "Utilisateur sans nom de profil")
          : "Auteur non renseigné",
      })))
    } catch (e: any) {
      setError(e?.message || "Impossible de charger le journal d'activité.")
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [establishmentId])

  useEffect(() => { void load() }, [load])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr")
    if (!term) return rows
    return rows.filter((row) => [
      row.action, row.entity_type, row.entity_id, row.actor_name,
      JSON.stringify(row.metadata ?? {}),
    ].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(term))
  }, [rows, search])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#c5c5d3]/55 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/ecole/tableau-bord" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-[#515f74] hover:text-[#00236f]">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour au tableau de bord
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Administration · Traçabilité</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[#00236f]">
            <History className="h-6 w-6" /> Journal d’activité
          </h1>
          <p className="mt-1 text-sm text-[#515f74]">Historique des opérations enregistrées dans cet établissement.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#c5c5d3]/70 bg-white px-3 text-sm font-medium text-[#00236f] hover:bg-[#f2f3ff] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded border border-[#c5c5d3]/55 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une action, un utilisateur ou un élément…" className="h-10 w-full rounded border border-[#c5c5d3]/70 bg-white pl-9 pr-3 text-sm text-[#131b2e] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10" />
        </div>
        <p className="shrink-0 text-xs text-[#64748b]">{filteredRows.length} opération(s) affichée(s) · 100 dernières au maximum</p>
      </div>

      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
        <div className="border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#131b2e]">Opérations récentes</h2>
          <p className="mt-0.5 text-xs text-[#515f74]">Les informations proviennent de l’historique Supabase de l’établissement.</p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-[#64748b]">Chargement du journal…</div>
        ) : !establishmentId ? (
          <div className="px-4 py-12 text-center text-sm text-[#64748b]">Aucun établissement actif n’est sélectionné.</div>
        ) : filteredRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <History className="mx-auto h-8 w-8 text-[#94a3b8]" />
            <p className="mt-3 text-sm font-medium text-[#334155]">{search ? "Aucun résultat pour cette recherche." : "Aucune opération enregistrée."}</p>
            <p className="mt-1 text-xs text-[#64748b]">{search ? "Essayez avec un autre terme." : "Les nouvelles opérations suivies apparaîtront ici."}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {filteredRows.map((row) => (
              <article key={row.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#131b2e]">{(row.action || "Opération enregistrée").replace(/[._]/g, " ")}</p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {row.entity_type || "Élément"}{row.entity_id ? " · Référence : " + row.entity_id : ""}
                  </p>
                  {row.metadata && Object.keys(row.metadata).length > 0 && (
                    <p className="mt-1 break-words text-xs text-[#64748b]">
                      {Object.entries(row.metadata).filter(([, value]) => value !== null && value !== undefined && typeof value !== "object").map(([key, value]) => key.replace(/_/g, " ") + " : " + String(value)).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748b] sm:justify-end">
                  <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{row.actor_name}</span>
                  <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-[#64748b]">Certaines opérations anciennes ou non encore couvertes par le suivi automatique peuvent ne pas figurer dans ce journal. Les entrées sans auteur identifié sont signalées comme telles.</p>
    </div>
  )
}
