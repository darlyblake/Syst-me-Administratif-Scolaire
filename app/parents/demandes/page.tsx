"use client"

import { useEffect, useState } from "react"
import { FileUp, Loader2, Paperclip, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabaseBrowser } from "@/lib/supabase/client"

type ChildLink = { student_id: string; establishment_id: string; student_name: string; student_number: string | null }
type Request = { id: string; establishment_id: string; student_id: string | null; document_type: string; message: string | null; status: string; created_at: string }
type Attachment = { id: string; request_id: string; file_name: string; mime_type: string; size_bytes: number; storage_path: string }

const MAX_FILE_SIZE = 1024 * 1024
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En traitement",
  ready: "Document disponible",
  rejected: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
}

export default function ParentDemandesPage() {
  const [links, setLinks] = useState<ChildLink[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [establishmentId, setEstablishmentId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [documentType, setDocumentType] = useState("Certificat de scolarité")
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    const { data: auth } = await supabaseBrowser.auth.getUser()
    if (!auth.user) { setError("Session parent introuvable."); setLoading(false); return }
    const { data: guardianLinks, error: linksError } = await supabaseBrowser
      .from("student_guardians")
      .select("student_id,establishment_id")
      .eq("guardian_user_id", auth.user.id)
      .eq("active", true)
    if (linksError) { setError(linksError.message); setLoading(false); return }
    const ids = (guardianLinks ?? []).map((l) => l.student_id)
    if (!ids.length) { setLinks([]); setRequests([]); setAttachments([]); setLoading(false); return }
    const { data: students, error: studentsError } = await supabaseBrowser
      .from("students").select("id,first_name,last_name,student_number,establishment_id")
      .in("id", ids).order("last_name")
    if (studentsError) { setError(studentsError.message); setLoading(false); return }
    const studentMap = new Map((students ?? []).map((s) => [s.id, s]))
    const safeLinks = (guardianLinks ?? []).flatMap((l) => {
      const s = studentMap.get(l.student_id)
      return s && s.establishment_id === l.establishment_id ? [{ student_id: s.id, establishment_id: l.establishment_id, student_name: `${s.first_name} ${s.last_name}`, student_number: s.student_number }] : []
    })
    setLinks(safeLinks)
    if (!establishmentId && safeLinks[0]) setEstablishmentId(safeLinks[0].establishment_id)
    if (!studentId && safeLinks[0]) setStudentId(safeLinks[0].student_id)
    const { data: requestData, error: requestError } = await supabaseBrowser
      .from("parent_document_requests").select("id,establishment_id,student_id,document_type,message,status,created_at")
      .eq("parent_user_id", auth.user.id).order("created_at", { ascending: false }).limit(50)
    if (requestError) { setError(requestError.message); setLoading(false); return }
    setRequests((requestData ?? []) as Request[])
    const requestIds = (requestData ?? []).map((r) => r.id)
    if (requestIds.length) {
      const { data: attachmentData, error: attachmentError } = await supabaseBrowser
        .from("parent_document_request_attachments").select("id,request_id,file_name,mime_type,size_bytes,storage_path")
        .in("request_id", requestIds).order("created_at")
      if (attachmentError) { setError(attachmentError.message); setLoading(false); return }
      setAttachments((attachmentData ?? []) as Attachment[])
    } else setAttachments([])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const onEstablishmentChange = (id: string) => {
    setEstablishmentId(id)
    const first = links.find((l) => l.establishment_id === id)
    setStudentId(first?.student_id ?? "")
  }

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setError("")
    const next = [...files]
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.includes(file.type)) { setError("Seuls les fichiers PDF, JPG, PNG ou WebP sont acceptés."); continue }
      if (file.size > MAX_FILE_SIZE) { setError(`Le fichier « ${file.name} » dépasse la limite de 1 Mo.`); continue }
      if (next.length >= 3) { setError("Vous pouvez joindre au maximum 3 fichiers par demande."); break }
      next.push(file)
    }
    setFiles(next)
  }

  const submit = async () => {
    if (!establishmentId || !documentType.trim()) return
    setSending(true); setError(""); setSuccess("")
    try {
      const { data, error: rpcError } = await supabaseBrowser.rpc("parent_create_document_request", {
        p_establishment_id: establishmentId,
        p_document_type: documentType.trim(),
        p_student_id: studentId || null,
        p_message: message.trim() || null,
      })
      if (rpcError) throw rpcError
      const requestId = data as string
      const { data: auth } = await supabaseBrowser.auth.getUser()
      if (!auth.user) throw new Error("Session parent introuvable.")
      for (const file of files) {
        const storagePath = `${auth.user.id}/${requestId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const { error: uploadError } = await supabaseBrowser.storage.from("parent-documents").upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
        const { error: attachmentError } = await supabaseBrowser.from("parent_document_request_attachments").insert({
          request_id: requestId, parent_user_id: auth.user.id, storage_path: storagePath,
          file_name: file.name, mime_type: file.type, size_bytes: file.size,
        })
        if (attachmentError) {
          await supabaseBrowser.storage.from("parent-documents").remove([storagePath])
          throw attachmentError
        }
      }
      setMessage(""); setFiles([]); setSuccess("Votre demande a été envoyée à l’établissement.")
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'envoyer la demande.")
    } finally { setSending(false) }
  }

  const download = async (attachment: Attachment) => {
    const { data, error: urlError } = await supabaseBrowser.storage.from("parent-documents").createSignedUrl(attachment.storage_path, 60)
    if (urlError || !data?.signedUrl) { setError("Impossible d'ouvrir le document."); return }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  const currentChildren = links.filter((l) => l.establishment_id === establishmentId)

  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-sm font-medium text-terre">Administration</p><h1 className="text-3xl font-bold">Mes demandes</h1><p className="mt-1 text-pierre">Demandez un document à l’établissement et joignez les justificatifs nécessaires.</p></div>
    {error && <div className="rounded-lg border border-rouge-terre/30 bg-rouge-terre/5 px-4 py-3 text-sm text-rouge-terre">{error}</div>}
    {success && <div className="rounded-lg border border-vert/30 bg-vert/5 px-4 py-3 text-sm text-vert">{success}</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card><CardHeader><CardTitle>Nouvelle demande</CardTitle></CardHeader><CardContent className="space-y-4">
        <label className="block text-sm font-medium">Établissement<select value={establishmentId} onChange={(e) => onEstablishmentChange(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Sélectionner</option>{[...new Map(links.map((l) => [l.establishment_id, l.establishment_id])).keys()].map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
        <label className="block text-sm font-medium">Enfant<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Tous les enfants concernés</option>{currentChildren.map((child) => <option key={child.student_id} value={child.student_id}>{child.student_name}{child.student_number ? ` — ${child.student_number}` : ""}</option>)}</select></label>
        <label className="block text-sm font-medium">Document demandé<Input value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="mt-1" placeholder="Ex. certificat de scolarité" /></label>
        <label className="block text-sm font-medium">Message (facultatif)<textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 min-h-24 w-full rounded-md border bg-background p-3 text-sm" placeholder="Précisez votre demande…" /></label>
        <div><p className="mb-2 text-sm font-medium">Pièces jointes</p><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-pierre hover:bg-terre-soft/30"><FileUp className="h-5 w-5" />PDF ou image — 1 Mo maximum par fichier<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} /></label>{files.length > 0 && <div className="mt-2 space-y-2">{files.map((file) => <div key={file.name} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Paperclip className="h-4 w-4"/><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-xs text-pierre">{(file.size / 1024 / 1024).toFixed(2)} Mo</span><button type="button" onClick={() => setFiles(files.filter((f) => f !== file))} aria-label={`Retirer ${file.name}`}><X className="h-4 w-4"/></button></div>)}</div>}</div>
        <Button className="w-full" onClick={() => void submit()} disabled={sending || !establishmentId || !documentType.trim()}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Envoyer la demande</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Historique</CardTitle></CardHeader><CardContent>{loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin"/> : requests.length === 0 ? <p className="py-8 text-center text-sm text-pierre">Aucune demande pour le moment.</p> : <div className="space-y-3">{requests.map((request) => <div key={request.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{request.document_type}</p><p className="text-xs text-pierre">{new Date(request.created_at).toLocaleDateString("fr-FR")}{request.student_id ? ` · ${links.find((l) => l.student_id === request.student_id)?.student_name ?? "Enfant"}` : ""}</p></div><span className="rounded-full bg-terre-soft px-2.5 py-1 text-xs font-medium text-terre">{statusLabels[request.status] ?? request.status}</span></div>{request.message && <p className="mt-2 text-sm text-pierre">{request.message}</p>}{attachments.filter((a) => a.request_id === request.id).map((a) => <button key={a.id} type="button" onClick={() => void download(a)} className="mt-2 flex max-w-full items-center gap-2 rounded-lg bg-terre-soft/50 px-3 py-2 text-left text-sm text-terre hover:bg-terre-soft"><Paperclip className="h-4 w-4 shrink-0"/><span className="truncate">{a.file_name}</span></button>)}</div>)}</div>}</CardContent></Card>
    </div>
  </div>
}
