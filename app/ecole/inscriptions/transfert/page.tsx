"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowRightLeft, Check, Clock3, RefreshCw, Search, Send, School, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getEstablishments } from "@/lib/supabase/services/establishment.service"
import { getAcademicStructure } from "@/lib/supabase/services/academic.service"
import {
  canFinalizeStudentTransfers,
  createStudentTransfer,
  finalizeStudentTransfer,
  getTransferDestinationOptions,
  listStudentTransfers,
  reviewStudentTransfer,
  type StudentTransfer,
  type TransferClass,
  type TransferTuitionPlan,
} from "@/lib/supabase/services/transfers.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import type { Establishment } from "@/lib/supabase/types"

type GradeOption = { id: string; name: string }

function statusLabel(status: StudentTransfer["status"]) {
  if (status === "pending") return "En attente"
  if (status === "accepted") return "Accepté"
  if (status === "rejected") return "Refusé"
  return "Annulé"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value))
}

export default function TransfertPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: students, isLoading: studentsLoading, refresh: refreshStudents } = useStudents(establishmentId, { page: 1, pageSize: 100, active: true })

  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [destinationLevels, setDestinationLevels] = useState<GradeOption[]>([])
  const [transfers, setTransfers] = useState<StudentTransfer[]>([])
  const [loadingTransfers, setLoadingTransfers] = useState(false)
  const [canFinalize, setCanFinalize] = useState(false)
  const [loadingLevels, setLoadingLevels] = useState(false)
  const [sending, setSending] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [tab, setTab] = useState<"send" | "receive">("send")

  const [studentSearch, setStudentSearch] = useState("")
  const [studentId, setStudentId] = useState("")
  const [destinationId, setDestinationId] = useState("")
  const [requestedGradeId, setRequestedGradeId] = useState("")
  const [reason, setReason] = useState("")
  const [createdTransfer, setCreatedTransfer] = useState<{ id: string; code: string } | null>(null)

  const [codeSearch, setCodeSearch] = useState("")
  const [selectedTransfer, setSelectedTransfer] = useState<StudentTransfer | null>(null)
  const [destinationClasses, setDestinationClasses] = useState<TransferClass[]>([])
  const [tuitionPlans, setTuitionPlans] = useState<TransferTuitionPlan[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  const loadTransfers = useCallback(async () => {
    if (!establishmentId) {
      setTransfers([])
      return
    }
    setLoadingTransfers(true)
    try {
      setTransfers(await listStudentTransfers(establishmentId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les transferts.")
    } finally {
      setLoadingTransfers(false)
    }
  }, [establishmentId])

  useEffect(() => {
    getEstablishments()
      .then((items) => setEstablishments(items.filter((item) => item.id !== establishmentId)))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Impossible de charger les établissements."))
  }, [establishmentId])

  useEffect(() => {
    void loadTransfers()
  }, [loadTransfers])

  useEffect(() => {
    let active = true
    if (!establishmentId) {
      setCanFinalize(false)
      return () => { active = false }
    }
    canFinalizeStudentTransfers(establishmentId)
      .then((allowed) => { if (active) setCanFinalize(allowed) })
      .catch(() => { if (active) setCanFinalize(false) })
    return () => { active = false }
  }, [establishmentId])

  useEffect(() => {
    let active = true
    if (!destinationId) {
      setDestinationLevels([])
      setRequestedGradeId("")
      return () => { active = false }
    }
    setLoadingLevels(true)
    getAcademicStructure(destinationId)
      .then((cycles) => {
        if (!active) return
        setDestinationLevels(cycles.flatMap((cycle) => (cycle.grade_levels ?? []).map((level) => ({ id: level.id, name: level.name }))))
        setRequestedGradeId("")
      })
      .catch((error) => {
        if (!active) return
        setDestinationLevels([])
        toast.error(error instanceof Error ? error.message : "Impossible de charger les niveaux de destination.")
      })
      .finally(() => {
        if (active) setLoadingLevels(false)
      })
    return () => { active = false }
  }, [destinationId])

  useEffect(() => {
    let active = true
    if (!selectedTransfer || selectedTransfer.status !== "accepted" || selectedTransfer.destination_enrollment_id || !canFinalize || !establishmentId) {
      setDestinationClasses([])
      setTuitionPlans([])
      setSelectedClassId("")
      setSelectedPlanId("")
      return () => { active = false }
    }
    setDestinationClasses([])
    setTuitionPlans([])
    setSelectedClassId("")
    setSelectedPlanId("")
    getTransferDestinationOptions(establishmentId, selectedTransfer.requested_grade_level_id)
      .then((options) => {
        if (!active) return
        setDestinationClasses(options.classes)
        setTuitionPlans(options.tuitionPlans)
        if (!options.academicYearId) toast.error("Configurez d’abord une année scolaire active dans cet établissement.")
        else if (options.tuitionPlans.length === 0) toast.error("Aucun plan de scolarité actif n’est configuré pour ce niveau.")
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Impossible de charger les classes et frais.")
      })
    return () => { active = false }
  }, [selectedTransfer, establishmentId, canFinalize])

  const activeStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase("fr")
    return (students ?? []).filter((student: any) => {
      if (student.active === false || student.status === "inactive" || student.merged_into_student_id) return false
      if (!query) return true
      return [student.first_name, student.last_name, student.student_number, student.id]
        .some((value) => String(value ?? "").toLocaleLowerCase("fr").includes(query))
    })
  }, [students, studentSearch])

  const outgoing = useMemo(
    () => transfers.filter((item) => item.source_establishment_id === establishmentId),
    [transfers, establishmentId],
  )
  const incoming = useMemo(() => {
    const query = codeSearch.trim().toLocaleLowerCase("fr")
    return transfers.filter((item) =>
      item.destination_establishment_id === establishmentId &&
      (item.status === "pending" || item.status === "accepted") &&
      (!query || item.code.toLocaleLowerCase("fr").includes(query) ||
        `${item.student_snapshot.first_name} ${item.student_snapshot.last_name}`.toLocaleLowerCase("fr").includes(query)),
    )
  }, [transfers, establishmentId, codeSearch])

  const handleSend = async () => {
    if (!establishmentId) return toast.error("Aucun établissement n’est associé à votre compte.")
    if (!studentId) return toast.error("Sélectionnez l’élève à transférer.")
    if (!destinationId) return toast.error("Sélectionnez l’établissement de destination.")
    if (!requestedGradeId) return toast.error("Sélectionnez le niveau demandé.")
    if (!reason.trim()) return toast.error("Indiquez le motif du transfert.")
    setSending(true)
    try {
      const result = await createStudentTransfer({
        sourceEstablishmentId: establishmentId,
        studentId,
        destinationEstablishmentId: destinationId,
        requestedGradeLevelId: requestedGradeId,
        reason: reason.trim(),
      })
      setCreatedTransfer({ id: result.id, code: result.code })
      toast.success("Le dossier a été enregistré et transmis à l’établissement de destination.")
      await loadTransfers()
      refreshStudents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le transfert.")
    } finally {
      setSending(false)
    }
  }

  const resetSendForm = () => {
    setCreatedTransfer(null)
    setStudentId("")
    setDestinationId("")
    setRequestedGradeId("")
    setReason("")
    setStudentSearch("")
  }

  const handleAccept = async () => {
    if (!selectedTransfer) return
    setProcessing(true)
    try {
      await reviewStudentTransfer({
        transferId: selectedTransfer.id,
        decision: "accept",
      })
      toast.success("Transfert accepté. L’inscription reste à effectuer par le service habilité.")
      setSelectedTransfer(null)
      setSelectedClassId("")
      setSelectedPlanId("")
      await loadTransfers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’accepter ce transfert.")
    } finally {
      setProcessing(false)
    }
  }

  const handleFinalize = async () => {
    if (!selectedTransfer || !canFinalize) return
    if (!selectedClassId) return toast.error("Choisissez une classe d’accueil.")
    if (!selectedPlanId) return toast.error("Choisissez le plan de scolarité.")
    setProcessing(true)
    try {
      const result = await finalizeStudentTransfer({
        transferId: selectedTransfer.id,
        classId: selectedClassId,
        tuitionPlanId: selectedPlanId,
      })
      toast.success(result.enrollment_status === "pending"
        ? "Dossier préparé. Les frais d’inscription restent à régler ; l’élève n’est pas encore inscrit définitivement."
        : "Inscription finalisée. Aucun frais d’inscription n’était dû.")
      setSelectedTransfer(null)
      setSelectedClassId("")
      setSelectedPlanId("")
      await loadTransfers()
      refreshStudents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de finaliser l’inscription.")
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedTransfer) return
    const note = rejectionReason.trim() || window.prompt("Motif du refus (facultatif) ?") || ""
    setProcessing(true)
    try {
      await reviewStudentTransfer({
        transferId: selectedTransfer.id,
        decision: "reject",
        rejectionReason: note,
      })
      toast.success("Le transfert a été refusé. L’établissement d’origine verra le statut.")
      setSelectedTransfer(null)
      setRejectionReason("")
      await loadTransfers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de refuser ce transfert.")
    } finally {
      setProcessing(false)
    }
  }

  const selectedStudent = (students ?? []).find((student: any) => student.id === studentId) as any
  const selectedLevel = destinationLevels.find((level) => level.id === requestedGradeId)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-encre">Transfert d’élèves</h1>
          <p className="mt-1 text-sm text-pierre">Transmettez un dossier à une autre école et suivez son traitement.</p>
        </div>
        <Button variant="outline" className="rounded-xl self-start" onClick={() => void loadTransfers()} disabled={loadingTransfers}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loadingTransfers ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-terre/10 pb-3">
        <button onClick={() => { setTab("send"); setSelectedTransfer(null) }} className={`rounded-xl px-4 py-2.5 text-sm font-medium ${tab === "send" ? "bg-terre text-white" : "bg-creme text-pierre"}`}>
          <Send className="mr-2 inline h-4 w-4" /> Envoyer un élève
        </button>
        <button onClick={() => { setTab("receive"); setSelectedTransfer(null) }} className={`rounded-xl px-4 py-2.5 text-sm font-medium ${tab === "receive" ? "bg-terre text-white" : "bg-creme text-pierre"}`}>
          <ArrowRightLeft className="mr-2 inline h-4 w-4" /> Réception et suivi
        </button>
      </div>

      {tab === "send" && (
        <section className="space-y-5">
          {!createdTransfer ? (
            <div className="max-w-3xl space-y-5 rounded-2xl border border-terre/10 bg-papier p-5 sm:p-6">
              <div>
                <Label>Rechercher un élève</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Nom, prénom ou matricule" className="rounded-xl pl-9" />
                </div>
              </div>
              <div>
                <Label>Élève à transférer</Label>
                <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-terre/15 bg-white px-3 py-2.5 text-sm">
                  <option value="">{studentsLoading ? "Chargement des élèves…" : "Sélectionner un élève"}</option>
                  {activeStudents.map((student: any) => <option key={student.id} value={student.id}>{student.last_name} {student.first_name} — {student.student_number || student.id.slice(0, 8)}</option>)}
                </select>
                {selectedStudent && <p className="mt-1.5 text-xs text-pierre">Matricule : {selectedStudent.student_number || "non renseigné"}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Établissement de destination</Label>
                  <div className="relative mt-1.5">
                    <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className="w-full rounded-xl border border-terre/15 bg-white py-2.5 pl-9 pr-3 text-sm">
                      <option value="">Choisir une école</option>
                      {establishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Niveau demandé</Label>
                  <select value={requestedGradeId} onChange={(event) => setRequestedGradeId(event.target.value)} disabled={!destinationId || loadingLevels} className="mt-1.5 w-full rounded-xl border border-terre/15 bg-white px-3 py-2.5 text-sm disabled:opacity-60">
                    <option value="">{loadingLevels ? "Chargement des niveaux…" : "Choisir un niveau"}</option>
                    {destinationLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Motif du transfert</Label>
                <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. : déménagement de la famille" className="mt-1.5 w-full resize-y rounded-xl border border-terre/15 bg-white px-3 py-2.5 text-sm" />
              </div>
              <Button onClick={() => void handleSend()} disabled={sending || studentsLoading} className="rounded-xl bg-terre hover:bg-terre-dark">
                <Send className="mr-2 h-4 w-4" /> {sending ? "Enregistrement…" : "Enregistrer et transmettre"}
              </Button>
            </div>
          ) : (
            <div className="max-w-3xl space-y-4 rounded-2xl border border-green-200 bg-papier p-5 sm:p-6">
              <p className="flex items-center gap-2 font-semibold text-jardin"><Check className="h-5 w-5" /> Dossier transmis à l’école de destination</p>
              <p className="text-sm text-pierre">Le dossier est enregistré dans la base scolaire. L’établissement destinataire le verra dans l’onglet « Réception et suivi ».</p>
              <div className="rounded-xl bg-creme p-4">
                <p className="text-xs text-pierre">Code de suivi</p>
                <p className="mt-1 font-mono text-xl font-bold text-encre">{createdTransfer.code}</p>
                <p className="mt-2 text-sm text-pierre">Élève : {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "Dossier créé"}</p>
                {selectedLevel && <p className="text-sm text-pierre">Niveau demandé : {selectedLevel.name}</p>}
              </div>
              <Button onClick={resetSendForm} className="rounded-xl bg-terre">Nouveau transfert</Button>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-encre">Dossiers envoyés par cet établissement</h2>
            {loadingTransfers ? <p className="text-sm text-pierre">Chargement…</p> : outgoing.length === 0 ? <p className="rounded-xl border border-dashed border-terre/20 p-4 text-sm text-pierre">Aucun transfert envoyé.</p> : (
              <div className="overflow-x-auto rounded-xl border border-terre/10 bg-papier">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-creme text-pierre"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Élève</th><th className="px-4 py-3">Destination</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th></tr></thead>
                  <tbody>{outgoing.map((item) => <tr key={item.id} className="border-t border-terre/10"><td className="px-4 py-3 font-mono">{item.code}</td><td className="px-4 py-3">{item.student_snapshot.first_name} {item.student_snapshot.last_name}</td><td className="px-4 py-3">{item.destination_establishment_name}</td><td className="px-4 py-3">{formatDate(item.created_at)}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{statusLabel(item.status)}</span>{item.rejection_reason && <p className="mt-1 text-xs text-rouge-terre">{item.rejection_reason}</p>}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "receive" && (
        <section className="space-y-4">
          <div className="max-w-xl">
            <Label>Rechercher un dossier reçu</Label>
            <Input value={codeSearch} onChange={(event) => setCodeSearch(event.target.value)} placeholder="Code de transfert ou nom de l’élève" className="mt-1.5 rounded-xl" />
          </div>
          {selectedTransfer ? (
            <div className="max-w-3xl space-y-5 rounded-2xl border border-terre/10 bg-papier p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs text-pierre">Dossier {selectedTransfer.code}</p><h2 className="mt-1 text-xl font-semibold text-encre">{selectedTransfer.student_snapshot.first_name} {selectedTransfer.student_snapshot.last_name}</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${selectedTransfer.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{selectedTransfer.status === "pending" ? "En attente de décision" : "Transfert accepté"}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs text-pierre">Date de naissance</p><p className="text-sm font-medium">{selectedTransfer.student_snapshot.birth_date || "Non renseignée"}</p></div>
                <div><p className="text-xs text-pierre">Matricule d’origine</p><p className="text-sm font-medium">{selectedTransfer.student_snapshot.source_student_number || "Non renseigné"}</p></div>
                <div><p className="text-xs text-pierre">École d’origine</p><p className="text-sm font-medium">{selectedTransfer.source_establishment_name}</p></div>
                <div><p className="text-xs text-pierre">Classe d’origine</p><p className="text-sm font-medium">{selectedTransfer.student_snapshot.source_class_name || selectedTransfer.student_snapshot.source_grade_name || "Non renseignée"}</p></div>
                <div><p className="text-xs text-pierre">Niveau demandé</p><p className="text-sm font-medium">{selectedTransfer.requested_grade_name}</p></div>
                <div><p className="text-xs text-pierre">Contact parent</p><p className="text-sm font-medium">{selectedTransfer.student_snapshot.guardian_phone || selectedTransfer.student_snapshot.phone || "Non renseigné"}</p></div>
              </div>
              <div><p className="text-xs text-pierre">Motif</p><p className="text-sm">{selectedTransfer.reason}</p></div>
              {selectedTransfer.status === "accepted" && !selectedTransfer.destination_enrollment_id && canFinalize && <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Classe d’accueil</Label><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-terre/15 bg-white px-3 py-2.5 text-sm"><option value="">Choisir une classe</option>{destinationClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div><Label>Plan de scolarité</Label><select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-terre/15 bg-white px-3 py-2.5 text-sm"><option value="">Choisir un plan</option>{tuitionPlans.map((item) => <option key={item.id} value={item.id}>{item.payment_mode} — {Number(item.annual_tuition).toLocaleString("fr-FR")} FCFA/an</option>)}</select></div>
              </div>}
              {selectedTransfer.status === "accepted" && !selectedTransfer.destination_enrollment_id && !canFinalize && <p className="border-l-4 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-900">Le directeur a accepté le transfert. L’inscription doit maintenant être finalisée par le secrétariat ou le personnel autorisé aux inscriptions.</p>}
              {selectedTransfer.status === "accepted" && selectedTransfer.destination_enrollment_id && <p className={`border-l-4 p-3 text-sm ${selectedTransfer.destination_enrollment_status === "active" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : selectedTransfer.destination_enrollment_status === "pending" ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-400 bg-slate-50 text-slate-800"}`}>{selectedTransfer.destination_enrollment_status === "active" ? "Inscription finalisée : l’inscription est active dans l’établissement de destination." : selectedTransfer.destination_enrollment_status === "pending" ? "Inscription préparée, mais en attente du règlement des frais d’inscription. L’élève n’est pas encore inscrit définitivement." : "Le dossier de transfert a été accepté et son traitement est en cours."}</p>}
              <div className="flex flex-wrap gap-2 border-t border-terre/10 pt-4">
                {selectedTransfer.status === "pending" && <Button onClick={() => void handleAccept()} disabled={processing} className="rounded-xl bg-jardin hover:bg-jardin/90"><Check className="mr-2 h-4 w-4" />{processing ? "Traitement…" : "Accepter le transfert"}</Button>}
                {selectedTransfer.status === "accepted" && !selectedTransfer.destination_enrollment_id && canFinalize && <Button onClick={() => void handleFinalize()} disabled={processing || destinationClasses.length === 0 || tuitionPlans.length === 0} className="rounded-xl bg-terre hover:bg-terre-dark"><Check className="mr-2 h-4 w-4" />{processing ? "Préparation…" : "Finaliser l’inscription"}</Button>}
                {selectedTransfer.status === "pending" && <Button variant="outline" onClick={() => void handleReject()} disabled={processing} className="rounded-xl border-rouge-terre/30 text-rouge-terre"><X className="mr-2 h-4 w-4" />Refuser le transfert</Button>}
                <Button variant="ghost" onClick={() => setSelectedTransfer(null)} disabled={processing} className="rounded-xl">Retour à la liste</Button>
              </div>
            </div>
          ) : (
            loadingTransfers ? <p className="text-sm text-pierre">Chargement des dossiers…</p> : incoming.length === 0 ? <p className="rounded-xl border border-dashed border-terre/20 p-4 text-sm text-pierre">Aucun dossier reçu ne correspond à la recherche.</p> : (
              <div className="overflow-x-auto rounded-xl border border-terre/10 bg-papier">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-creme text-pierre"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Élève</th><th className="px-4 py-3">École d’origine</th><th className="px-4 py-3">Niveau demandé</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">État</th><th className="px-4 py-3"></th></tr></thead>
                  <tbody>{incoming.map((item) => <tr key={item.id} className="border-t border-terre/10"><td className="px-4 py-3 font-mono">{item.code}</td><td className="px-4 py-3">{item.student_snapshot.first_name} {item.student_snapshot.last_name}</td><td className="px-4 py-3">{item.source_establishment_name}</td><td className="px-4 py-3">{item.requested_grade_name}</td><td className="px-4 py-3">{formatDate(item.created_at)}</td><td className="px-4 py-3 text-xs">{item.status === "pending" ? "À examiner" : item.destination_enrollment_status === "active" ? "Inscription finalisée" : item.destination_enrollment_status === "pending" ? "En attente de paiement" : item.destination_enrollment_id ? "Inscription créée" : "Accepté — à finaliser"}</td><td className="px-4 py-3"><Button size="sm" onClick={() => setSelectedTransfer(item)} className="rounded-lg bg-terre">{item.status === "pending" ? "Examiner" : item.destination_enrollment_id ? "Consulter" : canFinalize ? "Finaliser" : "Suivi"}</Button></td></tr>)}</tbody>
                </table>
              </div>
            )
          )}
        </section>
      )}
    </div>
  )
}
