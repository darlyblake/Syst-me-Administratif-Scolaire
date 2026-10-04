"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, Clock3, FileText, Loader2, Send, Upload, XCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
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
  source_request_id?: string | null
}

type Request = {
  id: string
  document_type: string
  message: string | null
  status: string
  rejection_reason: string | null
  created_at: string
  submitted_document_id?: string | null
}

const requestStatus: Record<string, { label: string; className: string }> = {
  requested: { label: "À fournir", className: "text-[#9a6500]" },
  submitted: { label: "En vérification", className: "text-[#3152c8]" },
  approved: { label: "Validé", className: "text-[#277047]" },
  rejected: { label: "Refusé", className: "text-[#b42318]" },
}

const docStatus: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "text-[#9a6500]" },
  approved: { label: "Validé", className: "text-[#277047]" },
  rejected: { label: "Refusé", className: "text-[#b42318]" },
}

export default function EnseignantDocumentsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const establishmentId = params.id
  const { utilisateur, contexte, estEnCoursDeChargement } = useAuthentification()
  const establishment = contexte?.establishments?.find((item) => item.id === establishmentId)

  const [teacher, setTeacher] = useState<{ id: string; first_name: string; last_name: string } | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [documentType, setDocumentType] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [requestId, setRequestId] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError("")

    const { data: userData } = await supabaseBrowser.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      router.replace("/connexion?espace=enseignant")
      return
    }

    const { data: teacherRow, error: teacherError } = await supabaseBrowser
      .from("teachers")
      .select("id,first_name,last_name")
      .eq("profile_id", userId)
      .eq("active", true)
      .maybeSingle()

    if (teacherError || !teacherRow) {
      setError("Votre profil enseignant est introuvable.")
      setLoading(false)
      return
    }

    const { data: link, error: linkError } = await supabaseBrowser
      .from("teacher_establishments")
      .select("teacher_id")
      .eq("teacher_id", teacherRow.id)
      .eq("establishment_id", establishmentId)
      .eq("status", "active")
      .maybeSingle()

    if (linkError || !link) {
      setError("Vous n'êtes pas rattaché à cet établissement.")
      setLoading(false)
      return
    }

    const [docsResult, requestsResult] = await Promise.all([
      supabaseBrowser
        .from("documents")
        .select("id,name,document_type,storage_path,status,rejection_reason,created_at,source_request_id")
        .eq("establishment_id", establishmentId)
        .eq("owner_type", "teacher")
        .eq("owner_id", teacherRow.id)
        .order("created_at", { ascending: false }),
      supabaseBrowser
        .from("document_requests")
        .select("id,document_type,message,status,rejection_reason,created_at,submitted_document_id")
        .eq("establishment_id", establishmentId)
        .eq("target_type", "teacher")
        .eq("target_id", teacherRow.id)
        .order("created_at", { ascending: false }),
    ])

    if (docsResult.error) setError(docsResult.error.message)
    if (requestsResult.error) setError(requestsResult.error.message)
    setTeacher(teacherRow)
    setDocs((docsResult.data ?? []) as Doc[])
    setRequests((requestsResult.data ?? []) as Request[])
    setLoading(false)
  }

  useEffect(() => {
    if (!estEnCoursDeChargement && (!utilisateur || utilisateur.role !== "enseignant" || !establishment)) {
      router.replace("/enseignant")
      return
    }
    if (!estEnCoursDeChargement && establishment) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estEnCoursDeChargement, utilisateur, establishment, establishmentId])

  const pendingRequests = useMemo(
    () => requests.filter((item) => item.status === "requested" || item.status === "rejected"),
    [requests],
  )

  const uploadDocument = async () => {
    if (!teacher || !file || !documentType.trim() || !establishmentId) return

    if (file.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Le fichier ne doit pas dépasser 10 Mo.")
      return
    }

    setUploading(true)
    setError("")

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = establishmentId + "/teacher/" + teacher.id + "/" + crypto.randomUUID() + "-" + safeName

    const upload = await supabaseBrowser.storage.from("school-documents").upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    })

    if (upload.error) {
      setError(upload.error.message)
      setUploading(false)
      return
    }

    const user = (await supabaseBrowser.auth.getUser()).data.user
    const insert = await supabaseBrowser.from("documents").insert({
      establishment_id: establishmentId,
      owner_type: "teacher",
      owner_id: teacher.id,
      document_type: documentType.trim(),
      name: file.name,
      storage_path: path,
      mime_type: "application/pdf",
      size_bytes: file.size,
      created_by: user?.id ?? null,
      status: "pending",
      source_request_id: requestId || null,
    }).select("id").single()

    if (insert.error || !insert.data) {
      await supabaseBrowser.storage.from("school-documents").remove([path])
      setError(insert.error?.message ?? "Impossible d'enregistrer le document.")
      setUploading(false)
      return
    }

    if (requestId) {
      const update = await supabaseBrowser
        .from("document_requests")
        .update({ status: "submitted", submitted_document_id: insert.data.id, rejection_reason: null })
        .eq("id", requestId)

      if (update.error) {
        setError(update.error.message)
      }
    }

    setFile(null)
    setDocumentType("")
    setRequestId("")
    setShowUpload(false)
    await load()
    setUploading(false)
  }

  const openDocument = async (doc: Doc) => {
    const { data, error: signedUrlError } = await supabaseBrowser.storage
      .from("school-documents")
      .createSignedUrl(doc.storage_path, 300)
    if (signedUrlError) {
      setError(signedUrlError.message)
      return
    }
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  if (estEnCoursDeChargement || !utilisateur || !establishment) {
    return <main className="min-h-screen flex items-center justify-center bg-[#f8f8fc]"><Loader2 className="h-5 w-5 animate-spin" /></main>
  }

  const teacherName = teacher ? (teacher.first_name + " " + teacher.last_name).trim() : undefined

  return (
    <TeacherShell establishmentId={establishmentId} establishmentName={establishment.name} teacherName={teacherName} active="planning">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => router.push("/enseignant/etablissement/" + establishmentId)} className="mb-5 inline-flex items-center gap-2 text-sm text-[#6d7280] hover:text-[#172033]">
          <ArrowLeft className="h-4 w-4" /> Retour à l'établissement
        </button>

        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e4e6ef] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Administration · {establishment.name}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Mon dossier</h1>
            <p className="mt-1 text-sm text-[#6d7280]">Documents demandés par cet établissement, dépôts et validation.</p>
          </div>
          <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-md bg-[#0b2b83] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09236d]">
            <Upload className="h-4 w-4" /> Déposer un document
          </button>
        </header>

        {error && <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mt-6 border-b border-[#e2e4eb] pb-3">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold">Documents demandés</h2><p className="mt-1 text-sm text-[#6d7280]">Chaque demande appartient à l'établissement actuellement sélectionné.</p></div>
            <span className="text-xs text-[#6d7280]">{requests.length} demande{requests.length > 1 ? "s" : ""}</span>
          </div>
        </section>

        <div className="mt-3 overflow-x-auto border border-[#e1e3eb] bg-white">
          <table className="min-w-[850px] w-full text-sm">
            <thead className="border-b bg-[#f7f8fa] text-left text-[#555e73]">
              <tr><th className="px-4 py-3 font-medium">Document</th><th className="px-4 py-3 font-medium">Demande de l'établissement</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceef3]">
              {requests.map((request) => {
                const status = requestStatus[request.status] ?? { label: request.status, className: "text-[#555e73]" }
                return (
                  <tr key={request.id} className="hover:bg-[#fafbfc]">
                    <td className="px-4 py-3 font-semibold">{request.document_type}</td>
                    <td className="max-w-[360px] px-4 py-3 text-[#6d7280]">{request.message || "—"}{request.rejection_reason && <p className="mt-1 text-xs text-[#b42318]">Motif : {request.rejection_reason}</p>}</td>
                    <td className={"px-4 py-3 font-medium " + status.className}>
                      <span className="inline-flex items-center gap-1.5">
                        {request.status === "approved" && <CheckCircle2 className="h-4 w-4" />}
                        {request.status === "rejected" && <XCircle className="h-4 w-4" />}
                        {(request.status === "requested" || request.status === "submitted") && <Clock3 className="h-4 w-4" />}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#555e73]">{new Date(request.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right">
                      {(request.status === "requested" || request.status === "rejected") && (
                        <button type="button" onClick={() => { setRequestId(request.id); setDocumentType(request.document_type); setShowUpload(true) }} className="inline-flex items-center gap-2 rounded-md border border-[#cbd3ee] px-3 py-2 text-xs font-semibold text-[#2441a5] hover:bg-[#f5f7ff]">
                          <Upload className="h-3.5 w-3.5" /> {request.status === "rejected" ? "Renvoyer" : "Déposer"}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && requests.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#6d7280]">Aucun document n'est actuellement demandé par cet établissement.</td></tr>}
            </tbody>
          </table>
        </div>

        <section className="mt-8 border-b border-[#e2e4eb] pb-3">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold">Documents déposés</h2><p className="mt-1 text-sm text-[#6d7280]">Historique de vos fichiers transmis à cet établissement.</p></div>
            <span className="text-xs text-[#6d7280]">{docs.length} document{docs.length > 1 ? "s" : ""}</span>
          </div>
        </section>

        <div className="mt-3 overflow-x-auto border border-[#e1e3eb] bg-white">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="border-b bg-[#f7f8fa] text-left text-[#555e73]">
              <tr><th className="px-4 py-3 font-medium">Fichier</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Fichier</th></tr>
            </thead>
            <tbody className="divide-y divide-[#eceef3]">
              {docs.map((doc) => {
                const status = docStatus[doc.status] ?? { label: doc.status, className: "text-[#555e73]" }
                return (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-semibold">{doc.name}</td>
                    <td className="px-4 py-3 text-[#555e73]">{doc.document_type}</td>
                    <td className={"px-4 py-3 font-medium " + status.className}>{status.label}{doc.rejection_reason && <p className="mt-1 text-xs text-[#b42318]">Motif : {doc.rejection_reason}</p>}</td>
                    <td className="px-4 py-3 text-[#555e73]">{new Date(doc.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDocument(doc)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2441a5] hover:underline"><FileText className="h-4 w-4" /> Ouvrir</button></td>
                  </tr>
                )
              })}
              {!loading && docs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[#6d7280]">Aucun document déposé.</td></tr>}
            </tbody>
          </table>
        </div>

        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/50 p-4">
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden border border-[#dfe2ec] bg-white shadow-xl">
              <div className="flex items-start justify-between border-b bg-[#f7f8fa] px-5 py-4">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#3152c8]">Mon dossier</p><h2 className="mt-1 text-lg font-bold">{requestId ? "Répondre à une demande" : "Déposer un document"}</h2></div>
                <button type="button" onClick={() => setShowUpload(false)} className="border border-[#dfe2ec] px-2.5 py-1.5 text-sm hover:bg-white">Fermer</button>
              </div>
              <div className="overflow-y-auto p-5">
                <div className="border border-[#e1e3eb] bg-[#fafbfc] p-4 text-sm text-[#555e73]">
                  {requestId ? <>Vous répondez à la demande : <strong className="text-[#172033]">{documentType}</strong>.</> : <>Le fichier sera transmis uniquement à <strong className="text-[#172033]">{establishment.name}</strong>.</>}
                </div>
                <div className="mt-5 grid gap-4">
                  <label className="text-sm"><span className="font-semibold">Type de document</span><input value={documentType} disabled={Boolean(requestId)} onChange={(e) => setDocumentType(e.target.value)} placeholder="Ex. Diplôme de licence" className="mt-1 h-10 w-full border border-[#cfd4df] bg-white px-3 outline-none focus:border-[#3152c8] disabled:bg-[#f3f4f7]" /></label>
                  <label className="text-sm"><span className="font-semibold">Fichier PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full border border-[#dfe2ec] bg-white p-2 text-sm" /><span className="mt-1 block text-xs text-[#737887]">PDF uniquement · 10 Mo maximum.</span></label>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t bg-[#f7f8fa] px-5 py-3">
                <button type="button" onClick={() => setShowUpload(false)} className="border border-[#dfe2ec] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f3f4f8]">Annuler</button>
                <button type="button" disabled={uploading || !file || !documentType.trim()} onClick={() => void uploadDocument()} className="inline-flex items-center gap-2 bg-[#0b2b83] px-4 py-2 text-sm font-semibold text-white hover:bg-[#09236d] disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{uploading ? "Envoi…" : "Envoyer le PDF"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherShell>
  )
}
