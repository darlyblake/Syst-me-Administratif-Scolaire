"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Clock3, Loader2, X } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { usePermissions } from "@/hooks/usePermissions"
import { useNotifications } from "@/hooks/useNotifications"
import {
  approveTeacherAttachmentRequest,
  listTeacherAttachmentRequests,
  rejectTeacherAttachmentRequest,
  type TeacherAttachmentRequest,
} from "@/services/teacher-establishment-requests.service"

type Filter = "pending" | "approved" | "rejected" | "all"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function DemandesRattachementPage() {
  const { etablissementActif } = useAuthentification()
  const { can } = usePermissions()
  const { success, error } = useNotifications()
  const [requests, setRequests] = useState<TeacherAttachmentRequest[]>([])
  const [filter, setFilter] = useState<Filter>("pending")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const establishmentId = etablissementActif?.id ?? ""
  const canManage = can("enseignants.edit")

  const load = useCallback(async () => {
    if (!establishmentId || !canManage) {
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRequests(await listTeacherAttachmentRequests(establishmentId))
    } catch (e) {
      console.error(e)
      error("Impossible de charger les demandes", {
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      })
    } finally {
      setLoading(false)
    }
  }, [canManage, establishmentId])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(
    () => filter === "all" ? requests : requests.filter(request => request.status === filter),
    [filter, requests],
  )

  async function handleDecision(request: TeacherAttachmentRequest, action: "approve" | "reject") {
    if (processing) return
    setProcessing(request.id)
    try {
      if (action === "approve") {
        await approveTeacherAttachmentRequest(request.id)
        success("Demande acceptée", {
          description: "L'enseignant est maintenant rattaché à cet établissement.",
        })
      } else {
        await rejectTeacherAttachmentRequest(request.id)
        success("Demande refusée")
      }
      await load()
    } catch (e) {
      console.error(e)
      error(action === "approve" ? "Impossible d'accepter la demande" : "Impossible de refuser la demande", {
        description: e instanceof Error ? e.message : "Une erreur est survenue.",
      })
    } finally {
      setProcessing(null)
    }
  }

  if (!canManage) {
    return (
      <main className="min-h-screen bg-white p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-semibold">Demandes de rattachement</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vous n'avez pas l'autorisation de gérer les demandes d'enseignants.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <header className="border-b pb-5">
          <p className="text-sm text-muted-foreground">Personnel / Enseignants</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Demandes de rattachement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les enseignants qui souhaitent rejoindre cet établissement apparaissent ici.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {([
            ["pending", "En attente"],
            ["approved", "Acceptées"],
            ["rejected", "Refusées"],
            ["all", "Toutes"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-md border px-3 py-2 text-sm ${filter === value ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Enseignant</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Spécialité</th>
                  <th className="px-4 py-3 font-medium">Demande</th>
                  <th className="px-4 py-3 font-medium">État</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map(request => {
                  const teacher = request.teacher
                  const pending = request.status === "pending"
                  return (
                    <tr key={request.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {teacher ? `${teacher.last_name} ${teacher.first_name}` : "Enseignant inconnu"}
                        </div>
                        {teacher?.employee_number && <div className="text-xs text-muted-foreground">Matricule : {teacher.employee_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{teacher?.email || "—"}</div>
                        {teacher?.phone && <div className="text-xs text-muted-foreground">{teacher.phone}</div>}
                      </td>
                      <td className="px-4 py-3">{teacher?.specialty || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(request.created_at)}</td>
                      <td className="px-4 py-3">
                        {request.status === "pending" && <span className="inline-flex items-center gap-1 text-amber-700"><Clock3 className="h-4 w-4" /> En attente</span>}
                        {request.status === "approved" && <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-4 w-4" /> Acceptée</span>}
                        {request.status === "rejected" && <span className="inline-flex items-center gap-1 text-red-700"><X className="h-4 w-4" /> Refusée</span>}
                        {request.status === "cancelled" && <span className="text-slate-500">Annulée</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pending ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              disabled={processing === request.id}
                              onClick={() => void handleDecision(request, "reject")}
                              className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                            >
                              Refuser
                            </button>
                            <button
                              type="button"
                              disabled={processing === request.id}
                              onClick={() => void handleDecision(request, "approve")}
                              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {processing === request.id && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                              Accepter
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{request.reviewed_at ? formatDate(request.reviewed_at) : "—"}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!visible.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Aucune demande dans cette catégorie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
