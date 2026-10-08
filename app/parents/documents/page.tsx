"use client"
import { useMemo, useState } from "react"
import { Download, Search, Upload, FileUp, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { supabaseBrowser } from "@/lib/supabase/client"

export default function ParentDocuments() {
  const { loading, error, refresh, children, documents, schoolDocumentRequests } = useParentPortal()
  const allowed = useMemo(() => children.filter(c => c.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [query, setQuery] = useState("")
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const list = (documents || []).filter(d => (childId === "tous" || d.student_id === childId) && (d.title + " " + d.document_type).toLowerCase().includes(query.toLowerCase()))
  const requests = (schoolDocumentRequests || []).filter(r => (childId === "tous" || r.student_id === childId) && r.document_type.toLowerCase().includes(query.toLowerCase()))

  const handleUpload = async (reqId: string, studentId: string, establishmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) return toast.error("Le fichier dépasse 1 Mo.")
    
    setUploadingId(reqId)
    try {
      const ext = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
      const path = `school-requests/${establishmentId}/${studentId}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabaseBrowser.storage.from("parent-documents").upload(path, file)
      if (uploadError) throw uploadError

      const { error: updateError } = await supabaseBrowser.from("school_document_requests").update({
        status: "submitted",
        submitted_storage_path: path,
        submitted_file_name: file.name,
        submitted_mime_type: file.type,
        submitted_size_bytes: file.size,
        submitted_at: new Date().toISOString()
      }).eq("id", reqId)
      if (updateError) throw updateError
      
      toast.success("Document envoyé avec succès.")
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi.")
    } finally {
      setUploadingId(null)
      e.target.value = ""
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">À fournir</Badge>
      case "submitted": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En cours d'examen</Badge>
      case "completed": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Validé</Badge>
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Refusé</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-7">
      <ParentPageHeader eyebrow="Documents" title="Documents & bulletins" description="Bulletins, pièces réclamées et documents officiels." onRefresh={() => void refresh()} refreshing={loading} />
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      
      {!loading && allowed.length === 0 ? (
        <ParentEmptyState title="Documents non disponibles" description="Votre compte n'a pas actuellement l'autorisation de consulter les documents scolaires." />
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input value={query} onChange={e => setQuery(e.target.value)} className="pl-9" placeholder="Rechercher un document…" />
            </div>
          </div>

          {requests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-slate-900">Demandes de l'établissement</h2>
              <div className="overflow-hidden border border-slate-200 bg-white divide-y divide-slate-200 rounded-lg shadow-sm">
                {requests.map(r => {
                  const child = children.find(c => c.id === r.student_id)
                  return (
                    <div key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between bg-slate-50/50">
                      <div className="flex items-start gap-3">
                        <FileUp className="h-5 w-5 text-indigo-500 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{r.document_type}</p>
                            {statusBadge(r.status)}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{child?.first_name} {child?.last_name} · demandé le {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                          {r.message && <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded border border-slate-200 shadow-sm">{r.message}</p>}
                          {r.status === "rejected" && r.rejection_reason && (
                            <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100"><span className="font-semibold">Motif du refus :</span> {r.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end">
                        {(r.status === "pending" || r.status === "rejected") && (
                          <>
                            <input type="file" id={`upload-${r.id}`} className="hidden" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => handleUpload(r.id, r.student_id, r.establishment_id, e)} />
                            <Button size="sm" onClick={() => document.getElementById(`upload-${r.id}`)?.click()} disabled={uploadingId === r.id}>
                              {uploadingId === r.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} 
                              Envoyer (max 1 Mo)
                            </Button>
                          </>
                        )}
                        {r.status === "submitted" && (
                          <p className="text-xs text-slate-500 flex items-center mt-2"><Info className="h-3 w-3 mr-1" /> Document reçu, en attente de validation</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-medium text-slate-900">Documents publiés</h2>
            <div className="overflow-hidden border border-slate-200 bg-white divide-y divide-slate-200 rounded-lg shadow-sm">
              {list.map(d => {
                const child = children.find(c => c.id === d.student_id)
                return (
                  <div key={d.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{d.title}</p>
                      <p className="text-sm text-slate-500">{child?.first_name} {child?.last_name} · {d.document_type} · publié le {new Date(d.published_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    {d.download_url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={d.download_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Télécharger</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled><Download className="mr-2 h-4 w-4" />Indisponible</Button>
                    )}
                  </div>
                )
              })}
              {list.length === 0 && <ParentEmptyState title="Aucun document disponible" description="Les documents apparaîtront ici lorsqu'ils seront publiés pour vos enfants." />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
