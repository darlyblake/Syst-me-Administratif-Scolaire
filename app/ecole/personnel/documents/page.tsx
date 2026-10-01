"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  FolderOpen,
  Plus,
  Search,
  Upload,
  XCircle,
} from "lucide-react"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type Employee = {
  id: string
  type: "staff" | "teacher"
  first_name: string
  last_name: string
  position: string
  profile_id: string | null
}

type Doc = {
  id: string
  owner_type: string
  owner_id: string | null
  document_type: string
  name: string
  storage_path: string
  mime_type: string | null
  status: string
  rejection_reason: string | null
  created_at: string
}

type Request = {
  id: string
  target_type: string
  target_id: string
  target_profile_id: string | null
  document_type: string
  message: string | null
  status: string
  submitted_document_id: string | null
  rejection_reason: string | null
  created_at: string
}

const statusLabel: Record<string, string> = {
  requested: "Demandé",
  submitted: "Document envoyé",
  approved: "Validé",
  rejected: "Rejeté",
  cancelled: "Annulé",
}

export default function PersonnelDocumentsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null

  const [employees, setEmployees] = useState<Employee[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showRequest, setShowRequest] = useState(false)
  const [documentName, setDocumentName] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [reviewing, setReviewing] = useState<Request | null>(null)
  const [reviewingDoc, setReviewingDoc] = useState<Doc | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)

    const [staffResult, teacherResult, docsResult, requestsResult] = await Promise.all([
      supabaseBrowser
        .from("staff_members")
        .select("id,first_name,last_name,position,profile_id")
        .eq("establishment_id", establishmentId)
        .order("last_name"),
      supabaseBrowser
        .from("teachers")
        .select("id,first_name,last_name,specialty,profile_id")
        .eq("establishment_id", establishmentId)
        .eq("active", true)
        .order("last_name"),
      supabaseBrowser
        .from("documents")
        .select("id,owner_type,owner_id,document_type,name,storage_path,mime_type,status,rejection_reason,created_at")
        .eq("establishment_id", establishmentId)
        .in("owner_type", ["staff", "teacher"])
        .order("created_at", { ascending: false }),
      supabaseBrowser
        .from("document_requests")
        .select("id,target_type,target_id,target_profile_id,document_type,message,status,submitted_document_id,rejection_reason,created_at")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false }),
    ])

    const staff: Employee[] = (staffResult.data ?? []).map((row: any) => ({
      id: row.id,
      type: "staff",
      first_name: row.first_name,
      last_name: row.last_name,
      position: row.position,
      profile_id: row.profile_id ?? null,
    }))

    const teachers: Employee[] = (teacherResult.data ?? []).map((row: any) => ({
      id: row.id,
      type: "teacher",
      first_name: row.first_name,
      last_name: row.last_name,
      position: row.specialty ? `Enseignant — ${row.specialty}` : "Enseignant",
      profile_id: row.profile_id ?? null,
    }))

    setEmployees([...staff, ...teachers].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr")
    ))
    setDocs((docsResult.data ?? []) as Doc[])
    setRequests((requestsResult.data ?? []) as Request[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [establishmentId])

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((employee) => {
      if (!q) return true
      return `${employee.first_name} ${employee.last_name} ${employee.position}`.toLowerCase().includes(q)
    })
  }, [employees, search])

  const employee = employees.find((item) => item.type + ":" + item.id === selectedEmployee)

  const employeeDocs = employee
    ? docs.filter((doc) => doc.owner_type === employee.type && doc.owner_id === employee.id)
    : []

  const employeeRequests = employee
    ? requests.filter((request) => request.target_type === employee.type && request.target_id === employee.id)
    : []

  const createRequest = async () => {
    if (!establishmentId || !employee || !documentName.trim()) return
    setSaving(true)
    const { error } = await supabaseBrowser.from("document_requests").insert({
      establishment_id: establishmentId,
      target_type: employee.type,
      target_id: employee.id,
      target_profile_id: employee.profile_id,
      document_type: documentName.trim(),
      message: message.trim() || null,
    })

    if (!error) {
      setShowRequest(false)
      setDocumentName("")
      setMessage("")
      await load()
    }
    setSaving(false)
  }

  const reviewRequest = async (request: Request, status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) return

    if (request.submitted_document_id) {
      const { error: documentError } = await supabaseBrowser
        .from("documents")
        .update({
          status,
          rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.submitted_document_id)

      if (documentError) return
    }

    const { error } = await supabaseBrowser
      .from("document_requests")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id)

    if (!error) {
      setReviewing(null)
      setRejectionReason("")
      await load()
    }
  }

  const reviewDocument = async (doc: Doc, status: "approved" | "rejected") => {
    if (status === "rejected" && !rejectionReason.trim()) return
    const { error } = await supabaseBrowser
      .from("documents")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", doc.id)

    if (!error) {
      if (status === "approved" || status === "rejected") {
        await supabaseBrowser
          .from("document_requests")
          .update({
            status,
            rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
            reviewed_at: new Date().toISOString(),
          })
          .eq("submitted_document_id", doc.id)
      }
      setReviewingDoc(null)
      setRejectionReason("")
      await load()
    }
  }

  const openDocument = async (doc: Doc) => {
    const { data, error } = await supabaseBrowser.storage
      .from("school-documents")
      .createSignedUrl(doc.storage_path, 300)

    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link href="/ecole/personnel" className="text-sm text-gray-500">← Personnel</Link>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Documents du personnel</h1>
              <p className="mt-1 text-sm text-gray-500">
                Chaque employé possède son propre dossier. Les documents envoyés peuvent être validés ou rejetés.
              </p>
            </div>
            {employee && (
              <button
                onClick={() => setShowRequest(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-terre px-4 py-2 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Demander un document
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="rounded-lg border bg-white">
            <div className="border-b p-4">
              <p className="font-semibold">Employés</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un employé..."
                  className="h-9 w-full rounded-md border pl-9 pr-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y">
              {filteredEmployees.map((item) => {
                const key = item.type + ":" + item.id
                const active = selectedEmployee === key
                const count = docs.filter((doc) => doc.owner_type === item.type && doc.owner_id === item.id).length
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedEmployee(key)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${active ? "bg-gray-50 border-l-2 border-terre" : ""}`}
                  >
                    <p className="font-medium">{item.first_name} {item.last_name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.position}</p>
                    <p className="mt-1 text-xs text-gray-400">{count} document{count > 1 ? "s" : ""}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-lg border bg-white">
            {!employee ? (
              <div className="flex min-h-[360px] items-center justify-center p-8 text-center">
                <div>
                  <FolderOpen className="mx-auto h-9 w-9 text-gray-300" />
                  <p className="mt-3 font-medium">Sélectionnez un employé</p>
                  <p className="mt-1 text-sm text-gray-500">Vous verrez ici ses documents et les demandes en cours.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b p-4">
                  <p className="text-lg font-semibold">{employee.first_name} {employee.last_name}</p>
                  <p className="text-sm text-gray-500">{employee.position}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[820px] w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Document</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">État</th>
                        <th className="px-4 py-3 text-right">Fichier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Chargement…</td></tr>
                      ) : employeeDocs.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucun document reçu.</td></tr>
                      ) : employeeDocs.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 font-medium">{doc.name}</td>
                          <td className="px-4 py-3">{doc.document_type}</td>
                          <td className="px-4 py-3">{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setReviewingDoc(doc)} className="mr-3 text-sm underline underline-offset-2">{doc.status === "approved" ? "Validé" : doc.status === "rejected" ? "Rejeté" : "À vérifier"}</button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => openDocument(doc)} className="inline-flex items-center gap-1 text-terre hover:underline">
                              <ExternalLink className="h-4 w-4" /> Ouvrir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold">Demandes de documents</p>
                      <p className="text-xs text-gray-500">CV, diplôme, CNI, certificat, etc.</p>
                    </div>
                    <button onClick={() => setShowRequest(true)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Plus className="h-4 w-4" /> Nouvelle demande
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                      <thead className="border-y bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">Document demandé</th>
                          <th className="px-4 py-3 text-left">Demandé le</th>
                          <th className="px-4 py-3 text-left">État</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {employeeRequests.length === 0 ? (
                          <tr><td colSpan={4} className="p-8 text-center text-gray-500">Aucune demande.</td></tr>
                        ) : employeeRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="px-4 py-3 font-medium">{request.document_type}</td>
                            <td className="px-4 py-3">{new Date(request.created_at).toLocaleDateString("fr-FR")}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1">
                                {request.status === "approved" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {request.status === "rejected" && <XCircle className="h-4 w-4 text-red-600" />}
                                {request.status === "requested" && <Clock3 className="h-4 w-4 text-gray-500" />}
                                {request.status === "submitted" && <Upload className="h-4 w-4 text-blue-600" />}
                                {statusLabel[request.status] ?? request.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {request.status === "submitted" && (
                                <button onClick={() => setReviewing(request)} className="rounded-md border px-3 py-1.5 text-sm">
                                  Vérifier
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {showRequest && employee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Demander un document</h2>
            <p className="mt-1 text-sm text-gray-500">{employee.first_name} {employee.last_name}</p>
            <label className="mt-5 block text-sm font-medium">Nom du document</label>
            <input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Ex. Diplôme, CV, CNI..."
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
            <label className="mt-4 block text-sm font-medium">Message (facultatif)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Précisez ce que vous attendez..."
              className="mt-1 min-h-24 w-full rounded-md border p-3 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowRequest(false)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
              <button disabled={saving || !documentName.trim()} onClick={createRequest} className="rounded-md bg-terre px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Vérifier le document</h2>
            <p className="mt-1 text-sm text-gray-500">{reviewingDoc.name}</p>
            <p className="mt-4 text-sm">Ce document a été envoyé par l’employé. Vous pouvez le valider ou le rejeter.</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motif si vous rejetez le document..." className="mt-4 min-h-24 w-full rounded-md border p-3 text-sm" />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setReviewingDoc(null)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
              <button onClick={() => reviewDocument(reviewingDoc, "rejected")} className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-700">Rejeter</button>
              <button onClick={() => reviewDocument(reviewingDoc, "approved")} className="rounded-md bg-terre px-4 py-2 text-sm font-medium text-white">Valider</button>
            </div>
          </div>
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Vérifier le document</h2>
            <p className="mt-1 text-sm text-gray-500">{reviewing.document_type}</p>
            <p className="mt-4 text-sm">Le document a été envoyé par l'employé. Vous pouvez le valider ou le rejeter.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motif si vous rejetez le document..."
              className="mt-4 min-h-24 w-full rounded-md border p-3 text-sm"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setReviewing(null)} className="rounded-md border px-4 py-2 text-sm">Annuler</button>
              <button onClick={() => reviewRequest(reviewing, "rejected")} className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-700">
                Rejeter
              </button>
              <button onClick={() => reviewRequest(reviewing, "approved")} className="rounded-md bg-terre px-4 py-2 text-sm font-medium text-white">
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
