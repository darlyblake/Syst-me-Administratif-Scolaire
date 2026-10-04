"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, FileText, Send, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { TeacherShell } from "@/components/enseignant/teacher-shell"
import { useAuthentification } from "@/providers/authentification.provider"

type Doc = {
  id: string
  name: string
  document_type: string
  storage_path: string
  status: string
  rejection_reason: string | null
  created_at: string
}

type Request = {
  id: string
  document_type: string
  message: string | null
  status: string
  rejection_reason: string | null
  created_at: string
}

const statusLabel: Record<string, string> = {
  requested: "À fournir",
  submitted: "En vérification",
  approved: "Validé",
  rejected: "À renvoyer",
}

export default function EnseignantDocumentsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id

  const [teacher, setTeacher] = useState<{ id: string; first_name: string; last_name: string } | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [documentType, setDocumentType] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [requestId, setRequestId] = useState("")

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)

    const { data: userData } = await supabaseBrowser.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      router.replace("/")
      return
    }

    const { data: teacherRow } = await supabaseBrowser
      .from("teachers")
      .select("id,first_name,last_name")
      .eq("profile_id", userId)
      .eq("active", true)
      .maybeSingle()

    if (!teacherRow) {
      setLoading(false)
      return
    }

    const { data: link } = await supabaseBrowser
      .from("teacher_establishments")
      .select("teacher_id")
      .eq("teacher_id", teacherRow.id)
      .eq("establishment_id", establishmentId)
      .eq("status", "active")
      .maybeSingle()

    if (!link) {
      setLoading(false)
      return
    }

    const [docsResult, requestsResult] = await Promise.all([
      supabaseBrowser
        .from("documents")
        .select("id,name,document_type,storage_path,status,rejection_reason,created_at")
        .eq("establishment_id", establishmentId)
        .eq("owner_type", "teacher")
        .eq("owner_id", teacherRow.id)
        .order("created_at", { ascending: false }),
      supabaseBrowser
        .from("document_requests")
        .select("id,document_type,message,status,rejection_reason,created_at")
        .eq("establishment_id", establishmentId)
        .eq("target_type", "teacher")
        .eq("target_id", teacherRow.id)
        .order("created_at", { ascending: false }),
    ])

    setTeacher(teacherRow)
    setDocs((docsResult.data ?? []) as Doc[])
    setRequests((requestsResult.data ?? []) as Request[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [establishmentId])

  const uploadDocument = async () => {
    if (!teacher || !file || !documentType.trim() || !establishmentId) return

    if (file.type !== "application/pdf") {
      alert("Seuls les fichiers PDF sont acceptés.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier ne doit pas dépasser 10 Mo.")
      return
    }

    setUploading(true)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${establishmentId}/teacher/${teacher.id}/${crypto.randomUUID()}-${safeName}`

    const upload = await supabaseBrowser.storage.from("school-documents").upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    })

    if (upload.error) {
      alert(upload.error.message)
      setUploading(false)
      return
    }

    const insert = await supabaseBrowser.from("documents").insert({
      establishment_id: establishmentId,
      owner_type: "teacher",
      owner_id: teacher.id,
      document_type: documentType.trim(),
      name: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      created_by: (await supabaseBrowser.auth.getUser()).data.user?.id ?? null,
      status: "pending",
      source_request_id: requestId || null,
    }).select("id").single()

    if (insert.error || !insert.data) {
      await supabaseBrowser.storage.from("school-documents").remove([path])
      alert(insert.error?.message ?? "Impossible d'enregistrer le document.")
      setUploading(false)
      return
    }

    if (requestId) {
      const update = await supabaseBrowser
        .from("document_requests")
        .update({
          status: "submitted",
          submitted_document_id: insert.data.id,
          rejection_reason: null,
        })
        .eq("id", requestId)

      if (update.error) {
        alert(update.error.message)
      }
    }

    setFile(null)
    setDocumentType("")
    setRequestId("")
    await load()
    setUploading(false)
  }

  const openDocument = async (doc: Doc) => {
    const { data, error } = await supabaseBrowser.storage
      .from("school-documents")
      .createSignedUrl(doc.storage_path, 300)

    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <TeacherShell establishmentId={establishmentId} establishmentName={establishment?.name ?? "Établissement"} teacherName={teacher ? teacher.first_name + " " + teacher.last_name : undefined} active="planning">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <button onClick={() => router.push(`/enseignant/etablissement/${establishmentId}`)} className="mb-5 inline-flex items-center gap-2 text-sm text-[#6d7280] hover:text-[#172033]">
          <ArrowLeft className="h-4 w-4" /> Retour à l'établissement
        </button>

        <div className="border-b border-[#e4e6ef] pb-5">
          <p className="text-sm text-[#6d7280]">Mon dossier</p>
          <h1 className="mt-1 text-2xl font-semibold">Mes documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Envoyez vos documents à l'établissement et suivez leur validation.
          </p>
        </div>

        <section className="mt-6 rounded-md rounded-lg border border-[#e1e3eb] bg-white p-5">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="font-semibold">Envoyer un document</h2>
              <p className="text-sm text-slate-500">PDF uniquement, 10 Mo maximum.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              <span className="font-medium">Type de document</span>
              <select
                value={requestId}
                onChange={(e) => {
                  const id = e.target.value
                  setRequestId(id)
                  const request = requests.find((item) => item.id === id)
                  if (request) setDocumentType(request.document_type)
                }}
                className="mt-1 h-10 w-full rounded-md border border-[#dfe2ec] bg-white px-3"
              >
                <option value="">Document libre</option>
                {requests.filter((item) => item.status === "requested" || item.status === "rejected").map((request) => (
                  <option key={request.id} value={request.id}>
                    Répondre : {request.document_type}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-medium">Nom du document</span>
              <input
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder="Ex. Diplôme de licence"
                className="mt-1 h-10 w-full rounded-md border px-3"
              />
            </label>

            <label className="text-sm">
              <span className="font-medium">Fichier PDF</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <Button disabled={uploading || !file || !documentType.trim()} onClick={uploadDocument}>
              <Send className="mr-2 h-4 w-4" />
              {uploading ? "Envoi..." : "Envoyer à l'école"}
            </Button>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold">Mes demandes</h2>
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Document demandé</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">État</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 font-medium">{request.document_type}</td>
                    <td className="px-4 py-3 text-slate-500">{request.message || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        {request.status === "approved" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {request.status === "rejected" && <XCircle className="h-4 w-4 text-red-600" />}
                        {request.status === "requested" && <Clock3 className="h-4 w-4 text-slate-500" />}
                        {request.status === "submitted" && <Upload className="h-4 w-4 text-blue-600" />}
                        {statusLabel[request.status] ?? request.status}
                      </span>
                      {request.rejection_reason && <p className="mt-1 text-xs text-red-600">{request.rejection_reason}</p>}
                    </td>
                    <td className="px-4 py-3">{new Date(request.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
                {!loading && requests.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Aucune demande de document.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-semibold">Documents envoyés</h2>
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">État</th>
                  <th className="px-4 py-3 text-right font-medium">Fichier</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium">{doc.name}</td>
                    <td className="px-4 py-3">{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      {doc.status === "approved" ? "Validé" : doc.status === "rejected" ? "Rejeté" : "En attente de validation"}
                      {doc.rejection_reason && <p className="mt-1 text-xs text-red-600">{doc.rejection_reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDocument(doc)} className="inline-flex items-center gap-1 text-slate-700 hover:underline">
                        <FileText className="h-4 w-4" /> Ouvrir
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && docs.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Aucun document envoyé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TeacherShell>
  )
}
