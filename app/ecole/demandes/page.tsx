"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Download, FileCheck2, FileUp, Loader2, MapPin, Paperclip, RefreshCw, XCircle } from "lucide-react"
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

  return <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8">
    <header className="border-b border-[#c5c5d3]/60 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Administration / Communication</p><h1 className="text-[26px] font-semibold tracking-[-0.02em]">Demandes des parents</h1><p className="mt-1 text-sm text-[#64748b]">Traitez les demandes de documents et préparez leur remise aux familles.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="h-10 rounded-md border-[#c5c5d3] bg-white shadow-none"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
      </div>
    </header>

    {error && <div className="mt-4 border border-[#b42318]/30 bg-[#fff7f5] px-4 py-3 text-sm text-[#b42318]">{error}</div>}
    {success && <div className="mt-4 border border-[#16803c]/30 bg-[#f0fdf4] px-4 py-3 text-sm text-[#16803c]">{success}</div>}

    <section className="border-b border-[#c5c5d3]/60 py-5">
      <div className="flex flex-wrap gap-2">
        {[['pending','En attente'],['in_progress','En traitement'],['ready','Prêtes'],['rejected','Refusées'],['completed','Terminées']].map(([value,label]) =>
          <button key={value} type="button" onClick={() => setFilter(value as Filter)} className={`border px-4 py-2 text-left text-sm ${filter === value ? "border-[#1e3a8a] bg-[#f2f3ff] text-[#1e3a8a]" : "border-[#c5c5d3] bg-white text-[#515f74] hover:bg-[#f7f8fa]"}`}>
            <span className="font-medium">{label}</span><span className="ml-2 font-semibold">{counts[value] ?? 0}</span>
          </button>
        )}
        <button type="button" onClick={() => setFilter("all")} className={`border px-4 py-2 text-sm ${filter === "all" ? "border-[#1e3a8a] bg-[#f2f3ff] text-[#1e3a8a]" : "border-[#c5c5d3] bg-white text-[#515f74]"}`}>Toutes</button>
      </div>
    </section>

    <section className="mt-5 border border-[#c5c5d3]/60">
      <div className="flex flex-col gap-3 border-b border-[#c5c5d3]/60 bg-[#f7f8fa] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div><h2 className="text-sm font-semibold">Demandes {filter === "all" ? "" : `— ${statusLabels[filter]}`}</h2><p className="mt-0.5 text-xs text-[#64748b]">{filtered.length} demande(s)</p></div>
      </div>
      {loading ? <div className="px-4 py-14 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> :
       filtered.length === 0 ? <div className="px-4 py-14 text-center text-sm text-[#64748b]"><FileCheck2 className="mx-auto mb-3 h-8 w-8" />Aucune demande dans cette catégorie.</div> :
       <div className="divide-y divide-[#e2e4ea]">{filtered.map((request) =>
         <button key={request.id} type="button" onClick={() => openRequest(request)} className={`w-full px-4 py-4 text-left hover:bg-[#f7f8fa] ${selected?.id === request.id ? "bg-[#f2f3ff]" : ""}`}>
           <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold">{request.document_type}</p><p className="mt-1 text-xs text-[#64748b]">{studentName(request.student_id)} · {new Date(request.created_at).toLocaleDateString("fr-FR")}</p>{request.message && <p className="mt-1 line-clamp-1 text-xs text-[#64748b]">{request.message}</p>}</div><span className="w-fit border border-[#c5c5d3] bg-white px-2 py-1 text-xs text-[#515f74]">{statusLabels[request.status] ?? request.status}</span></div>
         </button>
       )}</div>}
    </section>

    {selected && <div className="mt-5 border border-[#c5c5d3]/60 bg-white">
      <div className="flex items-start justify-between border-b border-[#c5c5d3]/60 bg-[#f7f8fa] px-4 py-3"><div><h2 className="text-sm font-semibold">{selected.document_type}</h2><p className="mt-1 text-xs text-[#64748b]">{studentName(selected.student_id)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fermer"><XCircle className="h-5 w-5 text-[#64748b]" /></button></div>
      <div className="space-y-5 px-4 py-5">
        <div className="border-l-2 border-[#1e3a8a] bg-[#f2f3ff] p-3 text-sm"><p className="font-medium">Demande reçue le {new Date(selected.created_at).toLocaleString("fr-FR")}</p>{selected.message && <p className="mt-2 text-[#64748b]">{selected.message}</p>}</div>
        {attachments.filter((a) => a.request_id === selected.id).length > 0 && <div><p className="mb-2 text-sm font-semibold">Pièces jointes du parent</p><div className="divide-y divide-[#e2e4ea] border border-[#c5c5d3]/60">{attachments.filter((a) => a.request_id === selected.id).map((a) => <button key={a.id} type="button" onClick={() => void openAttachment(a.storage_path)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f7f8fa]"><Paperclip className="h-4 w-4 shrink-0 text-[#1e3a8a]" /><span className="min-w-0 flex-1 truncate">{a.file_name}</span><Download className="h-4 w-4 shrink-0 text-[#64748b]" /></button>)}</div></div>}
        {selected.status !== "completed" && selected.status !== "rejected" && <div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Réponse au parent</label><textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} className="min-h-24 w-full border border-[#c5c5d3] bg-white p-3 text-sm outline-none focus:border-[#1e3a8a]" placeholder="Ex. Votre document est prêt…" /></div>
          <div><p className="mb-2 text-sm font-semibold">Mode de remise</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDeliveryMethod("digital")} className={`border px-4 py-3 text-left text-sm ${deliveryMethod === "digital" ? "border-[#1e3a8a] bg-[#f2f3ff]" : "border-[#c5c5d3] bg-white"}`}><FileCheck2 className="mb-1 h-5 w-5 text-[#1e3a8a]" /><span className="block font-medium">Fichier numérique</span><span className="text-xs text-[#64748b]">Envoyer au parent</span></button><button type="button" onClick={() => setDeliveryMethod("pickup")} className={`border px-4 py-3 text-left text-sm ${deliveryMethod === "pickup" ? "border-[#1e3a8a] bg-[#f2f3ff]" : "border-[#c5c5d3] bg-white"}`}><MapPin className="mb-1 h-5 w-5 text-[#1e3a8a]" /><span className="block font-medium">Retrait sur place</span><span className="text-xs text-[#64748b]">Le parent vient à l’école</span></button></div></div>
          {deliveryMethod === "digital" && <div><label className="flex cursor-pointer items-center gap-2 border border-dashed border-[#c5c5d3] p-4 text-sm text-[#64748b] hover:bg-[#f7f8fa]"><FileUp className="h-5 w-5" /><span className="min-w-0 flex-1">{responseFile ? responseFile.name : "Joindre le document final (PDF ou image, 1 Mo max)"}</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (validateResponseFile(file)) setResponseFile(file) }} /></label><p className="mt-1 text-xs text-[#64748b]">Si le document doit être tamponné : imprimez-le, apposez le cachet, numérisez-le puis joignez la version finale ici.</p></div>}
          <div className="flex flex-wrap gap-2"><Button onClick={() => void updateStatus("in_progress")} disabled={saving || selected.status === "in_progress"}><Clock3 className="mr-2 h-4 w-4" />Prendre en charge</Button><Button onClick={() => void updateStatus("ready")} disabled={saving}><CheckCircle2 className="mr-2 h-4 w-4" />Marquer prêt</Button><Button variant="outline" onClick={() => void updateStatus("rejected")} disabled={saving}><XCircle className="mr-2 h-4 w-4" />Refuser</Button></div>
        </div>}
        {selected.status === "ready" && <div className="border-l-2 border-[#16803c] bg-[#f0fdf4] p-3 text-sm"><p className="font-semibold">Demande prête</p><p className="mt-1 text-[#64748b]">{selected.delivery_method === "pickup" ? "Le parent a été informé qu’il peut venir retirer le document." : "Le document numérique est disponible dans le portail parent."}</p><Button className="mt-3" size="sm" onClick={() => void updateStatus("completed")} disabled={saving}>Clôturer la demande</Button></div>}
        {selected.status === "rejected" && <div className="border-l-2 border-[#b42318] bg-[#fff7f5] p-3 text-sm"><p className="font-semibold">Demande refusée</p>{selected.response_message && <p className="mt-1 text-[#64748b]">{selected.response_message}</p>}</div>}
        {selected.response_document_id && <p className="text-xs text-[#64748b]">Un document de réponse est associé à cette demande.</p>}
      </div>
    </div>}
  </div>
}
