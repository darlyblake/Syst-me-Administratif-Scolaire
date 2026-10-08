const fs = require('fs');

const content = `"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, FileText, Loader2, Search, Upload, Eye, EyeOff, FileUp, XCircle, FilePlus, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"

type Student = { id: string; first_name: string; last_name: string; student_number: string | null }
type Document = { id: string; name: string; document_type: string; mime_type: string | null; storage_path: string; created_at: string }
type Publication = { id: string; document_id: string; active: boolean; published_at: string }
type SchoolRequest = { id: string; document_type: string; message: string | null; status: string; rejection_reason: string | null; submitted_storage_path: string | null; submitted_file_name: string | null; created_at: string; updated_at: string }

export default function DossiersPapierPage() {
  const { etablissementActif } = useAuthentification()
  const establishmentId = etablissementActif?.id ?? ""
  
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loadingStudents, setLoadingStudents] = useState(true)

  const [documents, setDocuments] = useState<Document[]>([])
  const [publications, setPublications] = useState<Publication[]>([])
  const [requests, setRequests] = useState<SchoolRequest[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState("")
  const [requestMessage, setRequestMessage] = useState("")
  const [creatingRequest, setCreatingRequest] = useState(false)

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingRequest, setReviewingRequest] = useState<SchoolRequest | null>(null)
  const [reviewReason, setReviewReason] = useState("")
  const [updatingRequest, setUpdatingRequest] = useState(false)

  useEffect(() => {
    if (!establishmentId) return
    const loadStudents = async () => {
      setLoadingStudents(true)
      const { data } = await supabaseBrowser.from("students").select("id,first_name,last_name,student_number").eq("establishment_id", establishmentId).order("last_name").limit(500)
      setStudents(data as Student[] ?? [])
      setLoadingStudents(false)
    }
    loadStudents()
  }, [establishmentId])

  useEffect(() => {
    if (!selectedStudent || !establishmentId) return
    loadStudentData()
  }, [selectedStudent, establishmentId])

  const loadStudentData = async () => {
    setLoadingData(true)
    const [docsR, pubsR, reqsR] = await Promise.all([
      supabaseBrowser.from("documents").select("id,name,document_type,mime_type,storage_path,created_at").eq("owner_type", "student").eq("owner_id", selectedStudent!.id).order("created_at", { ascending: false }),
      supabaseBrowser.from("parent_document_publications").select("id,document_id,active,published_at").eq("student_id", selectedStudent!.id),
      supabaseBrowser.from("school_document_requests").select("id,document_type,message,status,rejection_reason,submitted_storage_path,submitted_file_name,created_at,updated_at").eq("student_id", selectedStudent!.id).order("created_at", { ascending: false })
    ])
    setDocuments(docsR.data as Document[] ?? [])
    setPublications(pubsR.data as Publication[] ?? [])
    setRequests(reqsR.data as SchoolRequest[] ?? [])
    setLoadingData(false)
  }

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase()
      return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || (s.student_number || "").toLowerCase().includes(q)
    })
  }, [students, search])

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedStudent) return
    if (file.size > 2 * 1024 * 1024) return toast.error("Le fichier dépasse 2 Mo.")
    
    setUploadingDoc(true)
    try {
      const ext = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
      const path = \`\${establishmentId}/students/\${selectedStudent.id}/\${Date.now()}_\${safeName}\`
      const { error: uploadError } = await supabaseBrowser.storage.from("school-documents").upload(path, file)
      if (uploadError) throw uploadError

      const { error: insertError } = await supabaseBrowser.from("documents").insert({
        establishment_id: establishmentId,
        owner_type: "student",
        owner_id: selectedStudent.id,
        document_type: "Document externe",
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size
      })
      if (insertError) throw insertError
      
      toast.success("Document ajouté avec succès.")
      loadStudentData()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload.")
    } finally {
      setUploadingDoc(false)
      e.target.value = ""
    }
  }

  const togglePublication = async (docId: string, currentPub?: Publication) => {
    try {
      if (currentPub) {
        await supabaseBrowser.from("parent_document_publications").update({ active: !currentPub.active }).eq("id", currentPub.id)
      } else {
        await supabaseBrowser.from("parent_document_publications").insert({
          establishment_id: establishmentId,
          student_id: selectedStudent!.id,
          document_id: docId,
          active: true
        })
      }
      loadStudentData()
    } catch {
      toast.error("Erreur lors de la modification de la visibilité.")
    }
  }

  const handleCreateRequest = async () => {
    if (!requestType.trim()) return toast.error("Le type de document est requis.")
    setCreatingRequest(true)
    try {
      const { error } = await supabaseBrowser.from("school_document_requests").insert({
        establishment_id: establishmentId,
        student_id: selectedStudent!.id,
        document_type: requestType,
        message: requestMessage || null
      })
      if (error) throw error
      toast.success("Demande envoyée au parent.")
      setRequestDialogOpen(false)
      setRequestType(""); setRequestMessage("")
      loadStudentData()
    } catch (err: any) {
      toast.error(err.message || "Erreur de création.")
    } finally {
      setCreatingRequest(false)
    }
  }

  const handleReview = async (status: "completed" | "rejected") => {
    if (!reviewingRequest) return
    if (status === "rejected" && !reviewReason.trim()) return toast.error("Un motif est requis pour le refus.")
    setUpdatingRequest(true)
    try {
      const { error } = await supabaseBrowser.from("school_document_requests").update({
        status,
        rejection_reason: status === "rejected" ? reviewReason : null
      }).eq("id", reviewingRequest.id)
      if (error) throw error
      toast.success(status === "completed" ? "Document validé." : "Document refusé.")
      setReviewDialogOpen(false)
      loadStudentData()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour.")
    } finally {
      setUpdatingRequest(false)
    }
  }

  const viewFile = async (bucket: string, path: string) => {
    const { data } = await supabaseBrowser.storage.from(bucket).createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
    else toast.error("Fichier introuvable.")
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-50 text-amber-700">En attente</Badge>
      case "submitted": return <Badge variant="outline" className="bg-blue-50 text-blue-700">Soumis (à valider)</Badge>
      case "completed": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Validé</Badge>
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700">Refusé</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-slate-50/50">
      <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-900 mb-4">Dossiers élèves</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input className="pl-9 bg-slate-50" placeholder="Rechercher un élève..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingStudents ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center"><Loader2 className="h-6 w-6 animate-spin mb-2"/>Chargement...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Aucun élève trouvé.</div>
          ) : (
            <div className="space-y-1">
              {filteredStudents.map(s => (
                <button key={s.id} onClick={() => setSelectedStudent(s)} className={\`w-full text-left px-3 py-2 rounded-md text-sm transition-colors \${selectedStudent?.id === s.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-100"}\`}>
                  {s.first_name} {s.last_name}
                  {s.student_number && <span className="block text-xs text-slate-500 font-normal">{s.student_number}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {!selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-900">Sélectionnez un élève</p>
            <p className="text-sm mt-1">Gérez son dossier et ses documents</p>
          </div>
        ) : (
          <>
            <div className="px-8 py-6 border-b border-slate-200">
              <h1 className="text-2xl font-semibold text-slate-900">{selectedStudent.first_name} {selectedStudent.last_name}</h1>
              {selectedStudent.student_number && <p className="text-sm text-slate-500 mt-1">Matricule : {selectedStudent.student_number}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              {loadingData ? (
                 <div className="flex items-center justify-center h-32 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mr-2"/>Chargement du dossier...</div>
              ) : (
                <Tabs defaultValue="docs" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="docs">Documents existants</TabsTrigger>
                    <TabsTrigger value="requests">Demandes de pièces</TabsTrigger>
                  </TabsList>

                  <TabsContent value="docs" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">Fichiers de l'élève</h3>
                        <p className="text-sm text-slate-500">Gérez les documents et leur visibilité pour les parents.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="file" id="upload-doc" className="hidden" accept=".pdf,image/*" onChange={handleUploadDocument} />
                        <Button variant="outline" size="sm" onClick={() => document.getElementById("upload-doc")?.click()} disabled={uploadingDoc}>
                          {uploadingDoc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Ajouter
                        </Button>
                      </div>
                    </div>

                    {documents.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center text-slate-500">
                        <FileText className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-900">Aucun document</p>
                        <p className="text-sm mt-1">Ajoutez un document externe ou générez une attestation.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                        {documents.map(doc => {
                          const pub = publications.find(p => p.document_id === doc.id)
                          const isPub = pub?.active
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50">
                              <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{doc.document_type} · Ajouté le {new Date(doc.created_at).toLocaleDateString("fr-FR")}</p>
                                  <div className="mt-2">
                                    {isPub ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"><Eye className="h-3 w-3 mr-1"/> Visible parent</Badge> : <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[10px]"><EyeOff className="h-3 w-3 mr-1"/> Caché</Badge>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => togglePublication(doc.id, pub)}>
                                  {isPub ? "Masquer" : "Publier"}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => viewFile("school-documents", doc.storage_path)}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="requests" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">Pièces réclamées aux parents</h3>
                        <p className="text-sm text-slate-500">Demandez des documents officiels (actes, photos) aux responsables.</p>
                      </div>
                      <Button size="sm" onClick={() => setRequestDialogOpen(true)}><FilePlus className="h-4 w-4 mr-2" /> Nouvelle demande</Button>
                    </div>

                    {requests.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center text-slate-500">
                        <FileUp className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-900">Aucune demande</p>
                        <p className="text-sm mt-1">Vous n'avez réclamé aucune pièce pour cet élève.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                        {requests.map(req => (
                          <div key={req.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{statusBadge(req.status)}</div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{req.document_type}</p>
                                {req.message && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{req.message}</p>}
                                <p className="text-[10px] text-slate-400 mt-1.5">Créée le {new Date(req.created_at).toLocaleDateString("fr-FR")}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {req.status === "submitted" && (
                                <Button size="sm" onClick={() => { setReviewingRequest(req); setReviewDialogOpen(true); setReviewReason("") }}>
                                  Examiner
                                </Button>
                              )}
                              {req.submitted_storage_path && req.status !== "submitted" && (
                                <Button variant="outline" size="sm" onClick={() => viewFile("parent-documents", req.submitted_storage_path!)}>
                                  Voir pièce
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demander un document</DialogTitle><DialogDescription>Le parent recevra une notification pour soumettre ce document (1 Mo max).</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la pièce (ex: Acte de naissance)</Label>
              <Input value={requestType} onChange={e => setRequestType(e.target.value)} placeholder="Type de document" />
            </div>
            <div className="space-y-2">
              <Label>Instructions (optionnel)</Label>
              <Textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Précisez le format ou d'autres détails..." />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Annuler</Button><Button onClick={handleCreateRequest} disabled={creatingRequest}>{creatingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Envoyer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Examiner la pièce soumise</DialogTitle><DialogDescription>Vérifiez le document envoyé par le parent.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 line-clamp-1">{reviewingRequest?.submitted_file_name || "Document inconnu"}</span>
              <Button size="sm" variant="secondary" onClick={() => viewFile("parent-documents", reviewingRequest!.submitted_storage_path!)}><ExternalLink className="h-4 w-4 mr-2"/> Consulter</Button>
            </div>
            <div className="space-y-2">
              <Label>Motif de refus (uniquement si vous refusez la pièce)</Label>
              <Textarea value={reviewReason} onChange={e => setReviewReason(e.target.value)} placeholder="Pourquoi ce document n'est-il pas valide ?" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleReview("rejected")} disabled={updatingRequest} className="text-red-600 hover:text-red-700">Refuser la pièce</Button>
            <Button onClick={() => handleReview("completed")} disabled={updatingRequest} className="bg-emerald-600 hover:bg-emerald-700">Valider la pièce</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
`
fs.writeFileSync('app/ecole/dossiers-papier/page.tsx', content);
