"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Download, FileCheck2, FileUp, Loader2, MapPin, Paperclip, RefreshCw, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"

type Request = { id: string; establishment_id: string; parent_user_id: string; student_id: string | null; document_type: string; message: string | null; response_message: string | null; delivery_method: string | null; response_document_id: string | null; status: string; created_at: string; updated_at: string }
type Student = { id: string; first_name: string; last_name: string; student_number: string | null }
type Attachment = { id: string; request_id: string; file_name: string; mime_type: string; size_bytes: number; storage_path: string }

type Filter = "all" | "pending" | "in_progress" | "ready" | "rejected" | "completed"
const MAX_FILE_SIZE = 1024 * 1024
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
const statusLabels: Record<string, string> = { pending: "En attente", in_progress: "En traitement", ready: "Prêt", rejected: "Refusée", cancelled: "Annulée", completed: "Terminée" }

export default function SchoolDemandesPage() {
  const { etablissementActif } = useAuthentification()
  const establishmentId = etablissementActif?.id ?? ""
  const [requests, setRequests] = useState<Request[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selected, setSelected] = useState<Request | null>(null)
  const [filter, setFilter] = useState<Filter>("pending")
  const [responseMessage, setResponseMessage] = useState("")
  const [deliveryMethod, setDeliveryMethod] = useState<"digital" | "pickup">("digital")
  const [responseFile, setResponseFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const load = async () => {
    if (!establishmentId) return
    setLoading(true); setError("")
    const { data, error: requestError } = await supabaseBrowser.from("parent_document_requests").select("id,establishment_id,parent_user_id,student_id,document_type,message,response_message,delivery_method,response_document_id,status,created_at,updated_at").eq("establishment_id", establishmentId).order("created_at", { ascending: false }).limit(100)
    if (requestError) { setError(requestError.message); setLoading(false); return }
    const rows = (data ?? []) as Request[]
    setRequests(rows)
    const studentIds = [...new Set(rows.map((r) => r.student_id).filter(Boolean))] as string[]
    if (studentIds.length) {
      const { data: studentData } = await supabaseBrowser.from("students").select("id,first_name,last_name,student_number").in("id", studentIds)
      setStudents((studentData ?? []) as Student[])
    } else setStudents([])
    const ids = rows.map((r) => r.id)
    if (ids.length) {
      const { data: attachmentData } = await supabaseBrowser.from("parent_document_request_attachments").select("id,request_id,file_name,mime_type,size_bytes,storage_path").in("request_id", ids).order("created_at")
      setAttachments((attachmentData ?? []) as Attachment[])
    } else setAttachments([])
    setLoading(false)
  }

  useEffect(() => { void load() }, [establishmentId])

  const filtered = useMemo(() => filter === "all" ? requests : requests.filter((r) => r.status === filter), [requests, filter])
  const getStudent = (id: string | null) => id ? students.find((s) => s.id === id) : undefined

  const openRequest = (request: Request) => {
    setSelected(request); setResponseMessage(request.response_message ?? ""); setDeliveryMethod((request.delivery_method as "digital" | "pickup") ?? "digital"); setResponseFile(null); setError(""); setSuccess("")
  }

  const validateResponseFile = (file: File | null) => {
    if (!file) return true
    if (!ACCEPTED_TYPES.includes(file.type)) { setError("La réponse doit être un PDF, JPG, PNG ou WebP."); return false }
    if (file.size > MAX_FILE_SIZE) { setError("Le document de réponse ne doit pas dépasser 1 Mo."); return false }
    return true
  }

  const updateStatus = async (status: string) => {
    if (!selected || !establishmentId) return
    if (status === "ready" && deliveryMethod === "digital" && !selected.response_document_id && !responseFile) { setError("Pour une remise numérique, joignez le document final. Si le document n’est pas à transmettre en ligne, choisissez Retrait sur place."); return }
    if (responseFile && !validateResponseFile(responseFile)) return
    setSaving(true); setError(""); setSuccess("")
    try {
      let responseDocumentId = selected.response_document_id
      if (responseFile) {
        const safeName = responseFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        const path = `responses/${establishmentId}/${selected.id}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabaseBrowser.storage.from("parent-documents").upload(path, responseFile, { contentType: responseFile.type, upsert: false })
        if (uploadError) throw uploadError
        const student = getStudent(selected.student_id)
        const { data: documentRow, error: documentError } = await supabaseBrowser.from("documents").insert({ establishment_id: establishmentId, owner_type: "student", owner_id: student?.id ?? null, document_type: selected.document_type, name: safeName, storage_path: path, mime_type: responseFile.type, size_bytes: responseFile.size }).select("id").single()
        if (documentError) { await supabaseBrowser.storage.from("parent-documents").remove([path]); throw documentError }
        responseDocumentId = documentRow.id
      }
      const patch: Record<string, unknown> = { status, response_message: responseMessage.trim() || null, delivery_method: status === "ready" || status === "completed" ? deliveryMethod : null, response_document_id: responseDocumentId, reviewed_by: (await supabaseBrowser.auth.getUser()).data.user?.id ?? null }
      const { error: updateError } = await supabaseBrowser.from("parent_document_requests").update(patch).eq("id", selected.id).eq("establishment_id", establishmentId)
      if (updateError) throw updateError
      setSuccess(status === "ready" ? (deliveryMethod === "digital" ? "Le document a été envoyé au parent." : "Le document est marqué comme prêt à retirer.") : "La demande a été mise à jour.")
      setResponseFile(null)
      await load()
      const updated = requests.find((r) => r.id === selected.id)
      setSelected(updated ? { ...updated, ...patch, status } as Request : null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de mettre à jour la demande.") } finally { setSaving(false) }
  }

  const openAttachment = async (path: string) => {
    const { data, error: urlError } = await supabaseBrowser.storage.from("parent-documents").createSignedUrl(path, 60)
    if (urlError || !data?.signedUrl) { setError("Impossible d'ouvrir la pièce jointe."); return }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  const studentName = (id: string | null) => { const s = getStudent(id); return s ? `${s.first_name} ${s.last_name}` : "Tous les enfants" }
  const counts = useMemo(() => requests.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {}), [requests])

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-terre">Administration</p><h1 className="text-3xl font-bold">Demandes des parents</h1><p className="mt-1 text-pierre">Traitez les demandes, ajoutez le document final et choisissez comment le parent le recevra.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button></div>
    {error && <div className="rounded-lg border border-rouge-terre/30 bg-rouge-terre/5 px-4 py-3 text-sm text-rouge-terre">{error}</div>}
    {success && <div className="rounded-lg border border-vert/30 bg-vert/5 px-4 py-3 text-sm text-vert">{success}</div>}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[['pending','En attente'],['in_progress','En traitement'],['ready','Prêtes'],['rejected','Refusées'],['completed','Terminées']].map(([value,label]) => <button key={value} type="button" onClick={() => setFilter(value as Filter)} className={`rounded-xl border p-3 text-left transition ${filter === value ? "border-terre bg-terre-soft" : "bg-papier hover:bg-terre-soft/40"}`}><p className="text-xs text-pierre">{label}</p><p className="mt-1 text-2xl font-bold">{counts[value] ?? 0}</p></button>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Demandes {filter === "all" ? "" : `— ${statusLabels[filter]}`}</CardTitle><button type="button" className="text-sm text-terre hover:underline" onClick={() => setFilter("all")}>Toutes</button></div></CardHeader><CardContent>{loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> : filtered.length === 0 ? <div className="py-12 text-center text-sm text-pierre"><FileCheck2 className="mx-auto mb-3 h-8 w-8" />Aucune demande dans cette catégorie.</div> : <div className="space-y-2">{filtered.map((request) => <button key={request.id} type="button" onClick={() => openRequest(request)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === request.id ? "border-terre bg-terre-soft/50" : "hover:bg-terre-soft/30"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold truncate">{request.document_type}</p><p className="text-sm text-pierre truncate">{studentName(request.student_id)} · {new Date(request.created_at).toLocaleDateString("fr-FR")}</p>{request.message && <p className="mt-1 line-clamp-1 text-xs text-pierre">{request.message}</p>}</div><span className="shrink-0 rounded-full bg-terre-soft px-2.5 py-1 text-xs font-medium text-terre">{statusLabels[request.status] ?? request.status}</span></div></button>)}</div>}</CardContent></Card>

      <Card>{selected ? <><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{selected.document_type}</CardTitle><p className="mt-1 text-sm text-pierre">{studentName(selected.student_id)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fermer"><XCircle className="h-5 w-5 text-pierre" /></button></div></CardHeader><CardContent className="space-y-5">
        <div className="rounded-xl bg-terre-soft/40 p-3 text-sm"><p className="font-medium">Demande reçue le {new Date(selected.created_at).toLocaleString("fr-FR")}</p>{selected.message && <p className="mt-2 text-pierre">{selected.message}</p>}</div>
        {attachments.filter((a) => a.request_id === selected.id).length > 0 && <div><p className="mb-2 text-sm font-semibold">Pièces jointes du parent</p><div className="space-y-2">{attachments.filter((a) => a.request_id === selected.id).map((a) => <button key={a.id} type="button" onClick={() => void openAttachment(a.storage_path)} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-terre-soft/30"><Paperclip className="h-4 w-4 shrink-0 text-terre" /><span className="min-w-0 flex-1 truncate">{a.file_name}</span><Download className="h-4 w-4 shrink-0 text-pierre" /></button>)}</div></div>}
        {selected.status !== "completed" && selected.status !== "rejected" && <div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Réponse au parent</label><textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" placeholder="Ex. Votre document est prêt…" /></div><div><p className="mb-2 text-sm font-semibold">Mode de remise</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setDeliveryMethod("digital")} className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === "digital" ? "border-terre bg-terre-soft" : "hover:bg-terre-soft/30"}`}><FileCheck2 className="mb-1 h-5 w-5 text-terre" /><span className="font-medium">Fichier numérique</span><span className="mt-1 block text-xs text-pierre">Envoyer au parent</span></button><button type="button" onClick={() => setDeliveryMethod("pickup")} className={`rounded-xl border p-3 text-left text-sm ${deliveryMethod === "pickup" ? "border-terre bg-terre-soft" : "hover:bg-terre-soft/30"}`}><MapPin className="mb-1 h-5 w-5 text-terre" /><span className="font-medium">Retrait sur place</span><span className="mt-1 block text-xs text-pierre">Le parent vient à l’école</span></button></div></div>{deliveryMethod === "digital" && <div><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-pierre hover:bg-terre-soft/30"><FileUp className="h-5 w-5" /><span className="min-w-0 flex-1">{responseFile ? responseFile.name : "Joindre le document final (PDF ou image, 1 Mo max)"}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (validateResponseFile(file)) setResponseFile(file) }} /></label><p className="mt-1 text-xs text-pierre">Si le document doit être tamponné : imprimez-le, apposez le cachet, numérisez-le puis joignez la version finale ici.</p></div>}
          <div className="flex flex-wrap gap-2"><Button onClick={() => void updateStatus("in_progress")} disabled={saving || selected.status === "in_progress"}><Clock3 className="mr-2 h-4 w-4" />Prendre en charge</Button><Button onClick={() => void updateStatus("ready")} disabled={saving}><CheckCircle2 className="mr-2 h-4 w-4" />Marquer prêt</Button><Button variant="outline" onClick={() => void updateStatus("rejected")} disabled={saving}><XCircle className="mr-2 h-4 w-4" />Refuser</Button></div>
        </div>}
        {selected.status === "ready" && <div className="rounded-xl border border-vert/30 bg-vert/5 p-3 text-sm"><p className="font-semibold">Demande prête</p><p className="mt-1 text-pierre">{selected.delivery_method === "pickup" ? "Le parent a été informé qu’il peut venir retirer le document." : "Le document numérique est disponible dans le portail parent."}</p><Button className="mt-3" size="sm" onClick={() => void updateStatus("completed")} disabled={saving}>Clôturer la demande</Button></div>}
        {selected.status === "rejected" && <div className="rounded-xl border border-rouge-terre/30 bg-rouge-terre/5 p-3 text-sm"><p className="font-semibold">Demande refusée</p>{selected.response_message && <p className="mt-1 text-pierre">{selected.response_message}</p>}</div>}
        {selected.response_document_id && <p className="text-xs text-pierre">Un document de réponse est associé à cette demande.</p>}
      </CardContent></> : <CardContent className="flex min-h-[360px] flex-col items-center justify-center text-center text-pierre"><FileCheck2 className="mb-3 h-10 w-10" /><p className="font-medium text-encre">Sélectionnez une demande</p><p className="mt-1 max-w-sm text-sm">Vous pourrez consulter les pièces jointes, traiter la demande et choisir entre envoi numérique et retrait sur place.</p></CardContent>}</Card>
    </div>
  </div>
}
