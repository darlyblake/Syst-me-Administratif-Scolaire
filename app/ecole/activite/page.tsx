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


const ACTION_LABELS: Record<string, string> = {
  create: "Création", created: "Création", insert: "Ajout", insert_one: "Ajout",
  update: "Modification", updated: "Modification", edit: "Modification",
  delete: "Suppression", deleted: "Suppression", remove: "Suppression",
  restore: "Restauration", restored: "Restauration",
  login: "Connexion", logout: "Déconnexion",
  payment: "Paiement enregistré", payment_created: "Paiement enregistré",
  enrollment: "Inscription", enrollment_created: "Inscription créée",
  student: "Fiche élève", student_created: "Élève ajouté",
  student_updated: "Fiche élève modifiée", attendance: "Registre d’appel",
  grade: "Notes", document: "Document", export: "Exportation",
  import: "Importation", validate: "Validation", validated: "Validation",
  cancel: "Annulation", cancelled: "Annulation",
}
const ENTITY_LABELS: Record<string, string> = {
  student: "Élève", students: "Élèves", enrollment: "Inscription",
  enrollments: "Inscriptions", payment: "Paiement", payments: "Paiements",
  class: "Classe", classes: "Classes", school_class: "Classe",
  grade: "Note", grades: "Notes", attendance: "Présence",
  user: "Utilisateur", profile: "Profil", teacher: "Enseignant",
  parent: "Parent / responsable", document: "Document",
  establishment: "Établissement", school_year: "Année scolaire",
  invoice: "Facture", expense: "Dépense", settings: "Paramètres",
}
const FIELD_LABELS: Record<string, string> = {
  first_name: "Prénom", last_name: "Nom", student_name: "Élève",
  student_number: "Matricule", class_name: "Classe", grade_level: "Niveau",
  amount: "Montant", total: "Total", status: "Statut", old_status: "Ancien statut",
  new_status: "Nouveau statut", payment_method: "Mode de paiement",
  reference: "Référence", phone: "Téléphone", email: "E-mail",
  date: "Date", reason: "Motif", description: "Description",
  academic_year: "Année scolaire", actor: "Utilisateur",
}
const VALUE_LABELS: Record<string, string> = {
  active: "Actif", inactive: "Inactif", pending: "En attente",
  paid: "Payé", partial: "Partiellement payé", unpaid: "Impayé",
  cancelled: "Annulé", canceled: "Annulé", completed: "Terminé",
  approved: "Approuvé", rejected: "Refusé", true: "Oui", false: "Non",
}
const humanize = (value: string) => value.replace(/[._-]+/g, " ").replace(/\\s+/g, " ").trim()
const translateAction = (value: string | null) => {
  if (!value) return "Opération enregistrée"
  const key = value.toLowerCase().trim()
  if (ACTION_LABELS[key]) return ACTION_LABELS[key]
  const words = key.split(/[._-]+/)
  const translated = words.map((word) => ACTION_LABELS[word] || word).join(" ")
  return translated.charAt(0).toUpperCase() + translated.slice(1)
}
const translateEntity = (value: string | null) => {
  if (!value) return "Élément concerné"
  const key = value.toLowerCase().trim()
  return ENTITY_LABELS[key] || humanize(value).replace(/^\\w/, (letter) => letter.toUpperCase())
}
const translateField = (value: string) => FIELD_LABELS[value.toLowerCase()] || humanize(value).replace(/^\\w/, (letter) => letter.toUpperCase())
const translateValue = (value: unknown) => {
  if (typeof value === "boolean") return value ? "Oui" : "Non"
  const raw = String(value)
  return VALUE_LABELS[raw.toLowerCase()] || raw
}
\nexport default function JournalActivitePage() {
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Administration · Historique</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[#00236f]">
            <History className="h-6 w-6" /> Journal d’activité
          </h1>
          <p className="mt-1 text-sm text-[#515f74]">Consultez les actions effectuées dans votre établissement : inscriptions, paiements et modifications.</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#c5c5d3]/70 bg-white px-3 text-sm font-medium text-[#00236f] hover:bg-[#f2f3ff] disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded border border-[#c5c5d3]/55 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par action, utilisateur ou nom…" className="h-10 w-full rounded border border-[#c5c5d3]/70 bg-white pl-9 pr-3 text-sm text-[#131b2e] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10" />
        </div>
        <p className="shrink-0 text-xs text-[#64748b]">{filteredRows.length} activité(s) affichée(s) · 100 dernières</p>
      </div>

      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded border border-[#c5c5d3]/55 bg-white">
        <div className="border-b border-[#c5c5d3]/55 bg-[#f2f3ff] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#131b2e]">Activités récentes</h2>
          <p className="mt-0.5 text-xs text-[#515f74]">Chaque ligne indique l’action réalisée, la personne concernée et la date.</p>
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
                  <p className="text-sm font-semibold text-[#131b2e]">{translateAction(row.action)}</p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {translateEntity(row.entity_type)}
                  </p>
                  {row.metadata && Object.keys(row.metadata).length > 0 && (
                    <p className="mt-1 break-words text-xs text-[#64748b]">
                      {Object.entries(row.metadata).filter(([, value]) => value !== null && value !== undefined && typeof value !== "object").map(([key, value]) => translateField(key) + " : " + translateValue(value)).join(" · ")}
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
      <p className="text-xs leading-5 text-[#64748b]">Ce journal affiche les 100 activités les plus récentes disponibles. Une activité sans nom d’utilisateur est indiquée « Auteur non renseigné ».</p>
    </div>
  )
}
