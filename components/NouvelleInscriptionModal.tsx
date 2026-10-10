"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { genererCodeUnique } from "@/utils/codeGenerator"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { findDuplicateStudentForEnrollment, type DuplicateStudentCandidate } from "@/lib/supabase/services/student.service"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { useEnrollment } from "@/hooks/useEnrollment"
import { supabaseBrowser } from "@/lib/supabase/client"
import { financeService } from "@/lib/supabase/services/finance.service"
import { saveStudentGuardianContact } from "@/lib/supabase/services/enrollment.service"
import { getStateFinanceSettings, type StateFinanceSettings } from "@/lib/supabase/services/state-financing.service"
import type { TuitionPlanInstallment, TuitionPlanWithInstallments } from "@/lib/supabase/types"

interface StudentOption {
  id: string
  name: string
  amount: number
}

interface NouvelleInscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  typeInscription?: "inscription" | "reinscription"
  studentId?: string
}

const STEPS = [
  { id: 1, label: "Élève" },
  { id: 2, label: "Parents" },
  { id: 3, label: "Scolarité" },
  { id: 4, label: "Paiement" },
  { id: 5, label: "Documents" },
  { id: 6, label: "Validation" },
]

function fmt(amount: number) {
  return amount.toLocaleString("fr-FR") + " FCFA"
}

export default function NouvelleInscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  typeInscription = "inscription",
  studentId,
}: NouvelleInscriptionModalProps) {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null

  // ─── Hooks de données ───────────────────────────────────────────────────────
  const { data: students } = useStudents(establishmentId, { search: "", pageSize: 200 })
  const { data: academicStructure, isLoading: isStructureLoading } = useAcademicStructure(establishmentId)
  const { activeYear, isLoading: isYearLoading } = useAcademicYears(establishmentId)
  const { data: tuitionPlans, isLoading: isPlansLoading } = useTuitionPlans(activeYear?.id ?? null)
  const { createStudentEnrollment, isSubmitting, error: submissionError } = useEnrollment(null)

  // ─── État navigation ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [newEnrollmentId, setNewEnrollmentId] = useState("")
  const [existingStudentId, setExistingStudentId] = useState<string | null>(null)
  const [duplicateStudents, setDuplicateStudents] = useState<DuplicateStudentCandidate[]>([])
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const [fundingSource, setFundingSource] = useState<"family" | "state" | "other">("family")
  const [waiveRegistration, setWaiveRegistration] = useState(false)
  const [waiveTuition, setWaiveTuition] = useState(false)
  const [stateFinanceSettings, setStateFinanceSettings] = useState<StateFinanceSettings | null>(null)
  const [stateSettingsError, setStateSettingsError] = useState<string | null>(null)

  // ─── Données élève ──────────────────────────────────────────────────────────
  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [birthPlace, setBirthPlace] = useState("")
  const [sex, setSex] = useState("")
  const [studentNumber, setStudentNumber] = useState("")

  // ─── Données parent ─────────────────────────────────────────────────────────
  const [parentLastName, setParentLastName] = useState("")
  const [parentFirstName, setParentFirstName] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [parentAddress, setParentAddress] = useState("")

  // ─── Sélection académique ───────────────────────────────────────────────────
  const [selectedCycleId, setSelectedCycleId] = useState("")
  const [selectedLevelId, setSelectedLevelId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")

  // ─── Paiement ───────────────────────────────────────────────────────────────
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<Set<string>>(new Set())
  const [paySingleTuitionNow, setPaySingleTuitionNow] = useState(false)
  const [previousYearDebts, setPreviousYearDebts] = useState<any[]>([])
  const [loadingPreviousYearDebts, setLoadingPreviousYearDebts] = useState(false)

  // ─── Options ────────────────────────────────────────────────────────────────
  const [availableOptions, setAvailableOptions] = useState<StudentOption[]>([])
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set())
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  // ─── Documents ──────────────────────────────────────────────────────────────
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null)
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null)

  // ─── Données calculées ──────────────────────────────────────────────────────
  const selectedCycle = academicStructure.find((c) => c.id === selectedCycleId)
  const levels = selectedCycle?.grade_levels ?? []
  const selectedLevel = levels.find((l) => l.id === selectedLevelId)
  const classes = selectedLevel?.school_classes ?? []
  const selectedClass = classes.find((c) => c.id === selectedClassId)

  const selectedPlan: TuitionPlanWithInstallments | undefined = tuitionPlans.find(
    (p) => p.grade_level_id === selectedLevelId
  )
  const installments: TuitionPlanInstallment[] = selectedPlan?.installments ?? []

  const registrationFee =
    typeInscription === "reinscription"
      ? (selectedPlan?.re_registration_fee ?? selectedPlan?.registration_fee ?? 0)
      : (selectedPlan?.registration_fee ?? 0)

  // Total en temps réel
  const installmentTotal = selectedPlan?.payment_mode === "single"
    ? (paySingleTuitionNow ? selectedPlan.annual_tuition : 0)
    : installments
        .filter((i) => selectedInstallmentIds.has(i.id))
        .reduce((sum, i) => sum + i.amount, 0)

  const optionTotal = availableOptions
    .filter((o) => selectedOptionIds.has(o.id))
    .reduce((sum, o) => sum + o.amount, 0)

  // Seules les sommes réellement prévues pour un encaissement immédiat familial
  // apparaissent ici. Une exonération/prise en charge ne doit pas être réclamée au parent.
  // Calculer uniquement les montants réellement dus par la famille.
  // Une exonération partielle ne doit pas effacer les autres frais encore dus.
  const registrationDue = fundingSource === "family" && !waiveRegistration ? registrationFee : 0
  const tuitionDue = fundingSource === "family" && !waiveTuition ? installmentTotal : 0
  // Les options choisies restent à la charge de la famille, même si la scolarité
  // ou les frais d'inscription sont exonérés / pris en charge par un organisme.
  const optionsDue = optionTotal
  const totalNow = registrationDue + tuitionDue + optionsDue

  // ─── Chargement options depuis Supabase ─────────────────────────────────────
  const loadOptions = useCallback(async () => {
    if (!establishmentId) return
    setIsLoadingOptions(true)
    try {
      const { data } = await supabaseBrowser
        .from("student_options")
        .select("id, name, default_amount")
        .eq("establishment_id", establishmentId)
        .eq("active", true)
        .order("name")
      setAvailableOptions(
        (data ?? []).map((x: any) => ({ id: x.id, name: x.name, amount: Number(x.default_amount) || 0 }))
      )
    } finally {
      setIsLoadingOptions(false)
    }
  }, [establishmentId])

  useEffect(() => {
    if (isOpen) loadOptions()
  }, [isOpen, loadOptions])

  useEffect(() => {
    if (!isOpen || !establishmentId) return
    let cancelled = false
    getStateFinanceSettings(establishmentId)
      .then((settings) => { if (!cancelled) { setStateFinanceSettings(settings); setStateSettingsError(null) } })
      .catch(() => { if (!cancelled) { setStateFinanceSettings(null); setStateSettingsError("Les règles de prise en charge ne sont pas disponibles. Vérifiez Paramètres → Scolarité.") } })
    return () => { cancelled = true }
  }, [isOpen, establishmentId])

  // ─── Vérification des impayés des années précédentes ─────────────────────────
  useEffect(() => {
    if (!isOpen || typeInscription !== "reinscription" || !studentId || !establishmentId) {
      setPreviousYearDebts([])
      return
    }

    let cancelled = false
    setLoadingPreviousYearDebts(true)
    financeService
      .getLegacyDebts(establishmentId, activeYear?.id)
      .then((rows) => {
        if (cancelled) return
        setPreviousYearDebts(rows.filter((row: any) => row.student_id === studentId))
      })
      .catch(() => {
        if (!cancelled) setPreviousYearDebts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingPreviousYearDebts(false)
      })

    return () => { cancelled = true }
  }, [isOpen, typeInscription, studentId, establishmentId, activeYear?.id])

  // ─── Pré-remplissage réinscription ──────────────────────────────────────────
  useEffect(() => {
    if (typeInscription === "reinscription" && studentId && students.length > 0) {
      const s = students.find((st) => st.id === studentId)
      if (s) {
        setLastName(s.last_name ?? "")
        setFirstName(s.first_name ?? "")
        setBirthDate(s.birth_date ?? "")
        setSex(s.sex ?? "")
        setStudentNumber(s.student_number ?? "")
      }
    }
  }, [typeInscription, studentId, students])

  // ─── Réinitialiser cascade sélection académique ─────────────────────────────
  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId)
    setSelectedLevelId("")
    setSelectedClassId("")
    setSelectedInstallmentIds(new Set())
    setPaySingleTuitionNow(false)
  }

  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId)
    setSelectedClassId("")
    setSelectedInstallmentIds(new Set())
    setPaySingleTuitionNow(false)
  }

  // ─── Validation par étape ────────────────────────────────────────────────────
  const validateStep = (s: number): { ok: boolean; message?: string } => {
    switch (s) {
      case 1:
        if (!lastName.trim()) return { ok: false, message: "Le nom est obligatoire." }
        if (!firstName.trim()) return { ok: false, message: "Le prénom est obligatoire." }
        if (!birthDate) return { ok: false, message: "La date de naissance est obligatoire." }
        if (!sex) return { ok: false, message: "Le sexe est obligatoire." }
        return { ok: true }
      case 2:
        if (!parentLastName.trim()) return { ok: false, message: "Le nom du parent est obligatoire." }
        if (!parentPhone.trim()) return { ok: false, message: "Le téléphone est obligatoire." }
        return { ok: true }
      case 3:
        if (!selectedCycleId) return { ok: false, message: "Sélectionnez un cycle." }
        if (!selectedLevelId) return { ok: false, message: "Sélectionnez un niveau." }
        if (!selectedClassId) return { ok: false, message: "Sélectionnez une classe." }
        if (!selectedPlan) return { ok: false, message: `Aucun forfait configuré pour ce niveau pour ${activeYear?.name ?? "l'année active"}.` }
        return { ok: true }
      case 4:
        // Le paiement est facultatif lors de l'inscription.
        // Un parent peut inscrire son enfant sans payer immédiatement une
        // échéance, une tranche ou la scolarité annuelle.
        return { ok: true }
      default:
        return { ok: true }
    }
  }

  const handleNext = () => {
    const { ok, message } = validateStep(step)
    if (!ok) { toast.error(message); return }
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  // ─── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = async (studentIdOverride?: string) => {
    // Un clic React transmet un événement ; ne jamais le traiter comme un identifiant
    // ni laisser un objet DOM atteindre les données envoyées à Supabase.
    const safeStudentIdOverride = typeof studentIdOverride === "string" ? studentIdOverride : undefined
    if (!activeYear) {
      toast.error("Aucune année scolaire active. Configurez l'année dans Paramètres → Années académiques.")
      return
    }
    if (!selectedClass || !selectedPlan || !establishmentId) {
      toast.error("Informations académiques incomplètes.")
      return
    }

    // Une réinscription sélectionnée depuis la page dédiée utilise déjà
    // le dossier existant. Pour une nouvelle inscription, on vérifie
    // l'identité avant de créer un nouvel élève.
    if (typeInscription === "inscription" && !studentId && !safeStudentIdOverride && !existingStudentId) {
      setCheckingDuplicate(true)
      try {
        const duplicate = await findDuplicateStudentForEnrollment({
          establishmentId,
          firstName,
          lastName,
          birthDate,
        })

        if (duplicate.found) {
          setDuplicateStudents(duplicate.students)
          setCheckingDuplicate(false)
          return
        }
      } catch (err) {
        setCheckingDuplicate(false)
        toast.error(err instanceof Error ? err.message : "Impossible de vérifier l'existence de l'élève.")
        return
      }
      setCheckingDuplicate(false)
    }

    try {
      // La RPC crée l'élève et l'inscription dans la même transaction.
      // Le contrôle SQL empêche également un doublon en cas de validation
      // simultanée depuis plusieurs postes.
      const finalStudentId = safeStudentIdOverride ?? existingStudentId ?? studentId ?? null

      const result = await createStudentEnrollment({
        establishmentId,
        studentId: finalStudentId,
        studentNumber: studentNumber || genererCodeUnique(),
        academicYearId: activeYear.id,
        classId: selectedClass.id,
        tuitionPlanId: selectedPlan.id,
        enrollmentDate: new Date().toISOString().slice(0, 10),
        firstName,
        lastName,
        birthDate,
        sex,
        phone: parentPhone,
        email: parentEmail,
        optionIds: Array.from(selectedOptionIds),
        paidInstallmentIds:
          selectedPlan.payment_mode === "single"
            ? (paySingleTuitionNow && installments[0] ? [installments[0].id] : [])
            : Array.from(selectedInstallmentIds),
        payOptions: fundingSource === "family" && !waiveRegistration && !waiveTuition && selectedOptionIds.size > 0,
        fundingSource,
        waiveRegistration,
        waiveTuition,
      })

      if (!result) {
        toast.error(submissionError || "Impossible de créer l'inscription.")
        return
      }

      setDuplicateStudents([])
      setExistingStudentId(null)
      await saveStudentGuardianContact({
        establishmentId,
        studentId: result.student_id,
        firstName: parentFirstName,
        lastName: parentLastName,
        phone: parentPhone,
        email: parentEmail,
        address: parentAddress,
      })
      setNewEnrollmentId(result.enrollment_id)
      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'inscription.")
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const resetAndClose = () => {
    setStep(1); setSubmitted(false); setNewEnrollmentId("")
    setExistingStudentId(null); setDuplicateStudents([]); setCheckingDuplicate(false)
    setLastName(""); setFirstName(""); setBirthDate(""); setBirthPlace(""); setSex(""); setStudentNumber("")
    setParentLastName(""); setParentFirstName(""); setParentPhone(""); setParentEmail(""); setParentAddress("")
    setSelectedCycleId(""); setSelectedLevelId(""); setSelectedClassId("")
    setSelectedInstallmentIds(new Set()); setSelectedOptionIds(new Set())
    setPaySingleTuitionNow(false)
    setFundingSource("family"); setWaiveRegistration(false); setWaiveTuition(false)
    setBirthCertificate(null); setMedicalCertificate(null)
    onClose()
  }

  if (!isOpen) return null

  if (duplicateStudents.length > 0) {
    const hasMultiple = duplicateStudents.length > 1
    const currentYearEnrollment = duplicateStudents[0]?.current_enrollment ?? null

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#131b2e]/45 p-4">
        <div className="w-full max-w-lg border border-[#c5c5d3] bg-white shadow-xl">
          <div className="border-b border-[#c5c5d3] px-5 py-4">
            <p className="text-sm font-semibold text-[#131b2e]">Élève déjà enregistré</p>
            <p className="mt-1 text-xs text-[#515f74]">
              Un dossier correspondant au nom, prénom et à la date de naissance existe déjà dans cet établissement.
            </p>
          </div>

          <div className="space-y-3 px-5 py-4">
            {duplicateStudents.map((candidate) => (
              <div key={candidate.id} className="border border-[#d9dce5] px-4 py-3">
                <p className="text-sm font-semibold text-[#131b2e]">
                  {candidate.first_name} {candidate.last_name}
                </p>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#515f74]">
                  <span>Date de naissance : {candidate.birth_date ? new Date(candidate.birth_date + "T00:00:00").toLocaleDateString("fr-FR") : "—"}</span>
                  <span>Matricule : {candidate.student_number || "—"}</span>
                  <span>Dossier : {candidate.active ? "Actif" : "Inactif"}</span>
                  <span>Classe : {candidate.current_enrollment?.class_name || "Aucune pour l'année active"}</span>
                </div>
                {candidate.current_enrollment && (
                  <p className="mt-2 text-xs text-amber-700">
                    Déjà inscrit(e) en {candidate.current_enrollment.class_name || "classe non renseignée"} pour {candidate.current_enrollment.academic_year_name || "l'année active"}.
                  </p>
                )}
              </div>
            ))}

            {hasMultiple ? (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                Plusieurs dossiers correspondent à cette identité. La réinscription automatique est désactivée pour éviter de choisir le mauvais dossier. Les dossiers existants doivent être vérifiés avant de continuer.
              </div>
            ) : currentYearEnrollment ? (
              <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Cet élève possède déjà une inscription pour l'année scolaire active. Il n'est pas nécessaire de créer une nouvelle inscription.
              </div>
            ) : (
              <div className="border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                Le dossier existe, mais aucune inscription n'a encore été trouvée pour l'année scolaire active. Vous pouvez réinscrire cet élève sans créer un nouveau dossier.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[#c5c5d3] px-5 py-4">
            <Button variant="outline" onClick={() => setDuplicateStudents([])}>
              Retour au formulaire
            </Button>
            {!hasMultiple && !currentYearEnrollment && duplicateStudents[0] && (
              <Button
                disabled={checkingDuplicate || isSubmitting}
                onClick={() => {
                  const candidate = duplicateStudents[0]
                  setExistingStudentId(candidate.id)
                  setDuplicateStudents([])
                  void handleSubmit(candidate.id)
                }}
              >
                Réinscrire cet élève
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Écran succès ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-end">
        <div className="fixed inset-0 bg-[#131b2e]/20" onClick={resetAndClose} />
        <div className="relative z-50 bg-white rounded border max-w-lg w-full p-8 text-center space-y-5">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
          <h3 className="text-lg font-semibold">
            {typeInscription === "reinscription" ? "Réinscription enregistrée" : "Inscription enregistrée"}
          </h3>
          <p className="text-sm text-slate-600">
            {firstName} {lastName} a bien été {typeInscription === "reinscription" ? "réinscrit(e)" : "inscrit(e)"} en {selectedLevel?.name} pour {activeYear?.name}.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onSuccess}>Voir les inscriptions</Button>
            <Button variant="outline" onClick={resetAndClose}>Fermer</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={resetAndClose} />
      <div className="relative z-50 flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-[#c5c5d3] bg-white shadow-[-8px_0_24px_rgba(19,27,46,0.08)]">

        {/* En-tête */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#c5c5d3]/60 bg-white px-3 py-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#131b2e]">
              {typeInscription === "reinscription" ? "Réinscription" : "Nouvelle inscription"}
            </h2>
            {isYearLoading ? (
              <p className="text-[11px] text-[#515f74]">Chargement de l'année…</p>
            ) : activeYear ? (
              <p className="text-[11px] text-[#515f74]">Année scolaire : {activeYear.name}</p>
            ) : (
              <p className="text-[11px] text-[#ba1a1a]">
                Aucune année scolaire active — Paramètres → Années académiques
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={resetAndClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Fil d'étapes */}
        <div className="sticky top-[57px] z-10 flex gap-1 border-b border-[#c5c5d3]/45 bg-white px-3 pt-3">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 text-center">
              <div className={`mb-1 h-1 ${s.id <= step ? "bg-[#00236f]" : "bg-[#dce1ff]"}`} />
              <span className={`text-[10px] ${s.id === step ? "font-medium text-[#131b2e]" : "text-[#68758a]"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 space-y-5 p-3 pb-20">

          {/* ── Étape 1 : Élève ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm border-b pb-2">Informations de l'élève</h3>
              {typeInscription === "reinscription" && (
                <p className="text-xs bg-slate-50 border rounded px-3 py-2 text-slate-600">
                  Réinscription — les informations ci-dessous sont pré-remplies depuis le dossier existant.
                </p>
              )}
              {typeInscription === "reinscription" && loadingPreviousYearDebts && (
                <p className="text-xs bg-slate-50 border rounded px-3 py-2 text-slate-500">
                  Vérification de la situation financière des années précédentes…
                </p>
              )}
              {typeInscription === "reinscription" && !loadingPreviousYearDebts && previousYearDebts.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-amber-700">⚠</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-amber-900">Impayé d'une année précédente</p>
                      <p className="mt-1 text-xs text-amber-800">
                        Cet élève a encore un solde à payer avant l'année {activeYear?.name || "actuelle"}.
                      </p>
                      <div className="mt-2 space-y-1">
                        {Array.from(
                          previousYearDebts.reduce((map: Map<string, { name: string; amount: number }>, row: any) => {
                            const key = row.academic_year_id
                            const current = map.get(key) ?? { name: row.academic_year?.name || "Année précédente", amount: 0 }
                            current.amount += Number(row.remaining_amount || 0)
                            map.set(key, current)
                            return map
                          }, new Map()).entries(),
                        ).map(([key, item]) => (
                          <div key={key} className="flex justify-between gap-3 text-xs text-amber-900">
                            <span>{item.name}</span>
                            <span className="font-semibold">{fmt(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs font-medium text-amber-900">
                        Total restant : {fmt(previousYearDebts.reduce((sum, row) => sum + Number(row.remaining_amount || 0), 0))}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-700">
                        La réinscription peut continuer. Cette dette reste rattachée à son année d'origine et pourra être encaissée depuis Finance → Scolarité → Dettes antérieures.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={typeInscription === "reinscription"} />
                </div>
                <div>
                  <Label>Prénom *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={typeInscription === "reinscription"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de naissance *</Label>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} disabled={typeInscription === "reinscription"} />
                </div>
                <div>
                  <Label>Lieu de naissance</Label>
                  <Input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} disabled={typeInscription === "reinscription"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sexe *</Label>
                  <Select value={sex} onValueChange={setSex} disabled={typeInscription === "reinscription"}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>N° matricule</Label>
                  <Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="Généré automatiquement si vide" />
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 2 : Parents ────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm border-b pb-2">Informations du parent / tuteur</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom *</Label>
                  <Input value={parentLastName} onChange={(e) => setParentLastName(e.target.value)} />
                </div>
                <div>
                  <Label>Prénom</Label>
                  <Input value={parentFirstName} onChange={(e) => setParentFirstName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone *</Label>
                  <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} type="tel" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} type="email" />
                </div>
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Étape 3 : Scolarité ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-medium text-sm border-b pb-2">Scolarité et prise en charge</h3>

              <div className="space-y-3 border border-[#d7dae3] p-3">
                <div>
                  <Label>Qui prend en charge les frais de l'élève ?</Label>
                  <Select value={fundingSource} onValueChange={(value) => setFundingSource(value as "family" | "state" | "other")}>
                    <SelectTrigger><SelectValue placeholder="Choisir la prise en charge" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Famille — paiement normal</SelectItem>
                      {stateFinanceSettings?.state_students_enabled && <SelectItem value="state">Élève envoyé / pris en charge par l'État</SelectItem>}
                      <SelectItem value="other">Exonération ou autre organisme</SelectItem>
                    </SelectContent>
                  </Select>
                  {stateSettingsError && <p className="mt-1 text-xs text-amber-700">{stateSettingsError}</p>}
                  {fundingSource === "state" && stateFinanceSettings && (
                    <p className="mt-2 text-xs text-slate-600">
                      Selon les paramètres de l'établissement, l'État couvre {[
                        stateFinanceSettings.state_covers_registration ? "les frais d'inscription" : null,
                        stateFinanceSettings.state_covers_tuition ? "la scolarité" : null,
                      ].filter(Boolean).join(" et ") || "aucun de ces deux frais"}. Les autres frais restent à la charge de la famille.
                    </p>
                  )}
                </div>
                {fundingSource !== "other" && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium text-slate-700">Exonérations particulières pour cet élève</p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={waiveRegistration} onCheckedChange={(checked) => setWaiveRegistration(!!checked)} />
                      Exonérer les frais d'inscription / réinscription
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={waiveTuition} onCheckedChange={(checked) => setWaiveTuition(!!checked)} />
                      Exonérer la scolarité
                    </label>
                  </div>
                )}
                {(fundingSource !== "family" || waiveRegistration || waiveTuition) && (
                  <p className="text-xs text-slate-600">
                    Les échéances seront créées avec leur responsable de paiement. Les paiements immédiats se feront ensuite dans Finance afin de ne pas enregistrer par erreur un paiement non encaissé.
                  </p>
                )}
              </div>

              <section className="space-y-2 border border-[#d7dae3] p-3">
                <div>
                  <h4 className="text-sm font-medium">Options scolaires</h4>
                  <p className="text-xs text-slate-500">Sélectionnez ici les options à associer à l'élève. Elles restent distinctes des frais d'inscription et de scolarité.</p>
                </div>
                {isLoadingOptions ? (
                  <p className="text-sm text-slate-500">Chargement des options…</p>
                ) : availableOptions.length > 0 ? (
                  <div className="divide-y border text-sm">
                    {availableOptions.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <Checkbox
                          checked={selectedOptionIds.has(opt.id)}
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true
                            setSelectedOptionIds((prev) => {
                              const next = new Set(prev)
                              if (isChecked) next.add(opt.id)
                              else next.delete(opt.id)
                              return next
                            })
                          }}
                        />
                        <span className="flex-1">{opt.name}</span>
                        <span className="font-medium">{fmt(opt.amount)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Aucune option active n'est configurée dans cet établissement. Vérifiez Paramètres → Scolarité.</p>
                )}
                {selectedOptionIds.size > 0 && (
                  <p className="text-xs font-medium text-slate-700">
                    {selectedOptionIds.size} option(s) sélectionnée(s) — {fmt(optionTotal)}
                  </p>
                )}
              </section>

              {!activeYear && !isYearLoading && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  Aucune année scolaire active. Définissez l'année actuelle dans Paramètres → Années académiques.
                </p>
              )}

              {isStructureLoading ? (
                <p className="text-sm text-slate-500">Chargement des cycles…</p>
              ) : academicStructure.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun cycle pédagogique configuré.</p>
              ) : (
                <>
                  {/* Cycle */}
                  <div>
                    <Label>Cycle *</Label>
                    <Select value={selectedCycleId} onValueChange={handleCycleChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un cycle" /></SelectTrigger>
                      <SelectContent>
                        {academicStructure.map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id}>{cycle.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Niveau */}
                  {selectedCycleId && (
                    <div>
                      <Label>Niveau *</Label>
                      {levels.length === 0 ? (
                        <p className="text-xs text-slate-500 mt-1">Aucun niveau configuré pour ce cycle.</p>
                      ) : (
                        <Select value={selectedLevelId} onValueChange={handleLevelChange}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
                          <SelectContent>
                            {levels.map((l) => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Classe */}
                  {selectedLevelId && (
                    <div>
                      <Label>Classe *</Label>
                      {classes.length === 0 ? (
                        <p className="text-xs text-slate-500 mt-1">Aucune classe configurée pour ce niveau.</p>
                      ) : (
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                          <SelectContent>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Forfait auto */}
                  {selectedLevelId && (
                    <div className="mt-2 border rounded p-4 bg-slate-50">
                      {isPlansLoading ? (
                        <p className="text-sm text-slate-500">Chargement du forfait…</p>
                      ) : selectedPlan ? (
                        <>
                          <p className="text-sm font-medium mb-1">Forfait de scolarité — {selectedLevel?.name}</p>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr>
                                <td className="py-0.5 text-slate-600">Scolarité annuelle</td>
                                <td className="py-0.5 text-right font-medium">{fmt(selectedPlan.annual_tuition)}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-600">
                                  {typeInscription === "reinscription" ? "Frais de réinscription" : "Frais d'inscription"}
                                </td>
                                <td className="py-0.5 text-right font-medium">{fmt(registrationFee)}</td>
                              </tr>
                              <tr>
                                <td className="py-0.5 text-slate-600">Mode de paiement</td>
                                <td className="py-0.5 text-right">
                                  {selectedPlan.payment_mode === "monthly" && "Mensuel"}
                                  {selectedPlan.payment_mode === "installments" && `${selectedPlan.installment_count ?? installments.length} tranche(s)`}
                                  {selectedPlan.payment_mode === "single" && "Paiement unique"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <p className="text-sm text-amber-700">
                          Aucun forfait configuré pour ce niveau pour {activeYear?.name ?? "l'année active"}.<br />
                          <span className="text-xs text-slate-500">Configurez-en un dans Paramètres → Scolarité.</span>
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Étape 4 : Paiement ───────────────────────────────────────────── */}
          {step === 4 && selectedPlan && (fundingSource !== "family" || waiveRegistration || waiveTuition) && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm border-b pb-2">Prise en charge financière</h3>
              <p className="text-sm text-slate-700">L'inscription sera enregistrée sans simuler un encaissement. Les frais couverts ne seront pas réclamés à la famille. Les options scolaires restent consultables et seront suivies séparément dans Finance.</p>
              <div className="divide-y border-y border-slate-200">
                <div className="flex justify-between gap-4 py-3 text-sm"><span>Frais d'inscription</span><span className="font-medium">{waiveRegistration || fundingSource === "other" ? "Exonérés" : fundingSource === "state" && stateFinanceSettings?.state_covers_registration ? "Pris en charge par l'État" : "À la charge de la famille"}</span></div>
                <div className="flex justify-between gap-4 py-3 text-sm"><span>Scolarité</span><span className="font-medium">{waiveTuition || fundingSource === "other" ? "Exonérée" : fundingSource === "state" && stateFinanceSettings?.state_covers_tuition ? "Prise en charge par l'État" : "À la charge de la famille"}</span></div>
                {selectedOptionIds.size > 0 && (
                  <div className="py-3 text-sm">
                    <div className="flex justify-between gap-4 font-medium">
                      <span>Options scolaires à payer par la famille</span><span>{fmt(optionsDue)}</span>
                    </div>
                    {availableOptions.filter((o) => selectedOptionIds.has(o.id)).map((o) => (
                      <div key={o.id} className="mt-1 flex justify-between gap-3 pl-2 text-xs text-slate-600">
                        <span>{o.name}</span><span>{fmt(o.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedOptionIds.size > 0 && (
                <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <div className="flex justify-between gap-3 font-semibold">
                    <span>Total des options à payer</span><span>{fmt(optionsDue)}</span>
                  </div>
                  <p className="mt-1 text-xs">L'exonération de la scolarité ne couvre pas les options sélectionnées. Leur montant reste dû par la famille et sera suivi dans Finance.</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Options scolaires</p>
                {isLoadingOptions ? (
                  <p className="text-sm text-slate-500">Chargement des options…</p>
                ) : availableOptions.length > 0 ? (
                  <div className="border rounded divide-y text-sm">
                    {availableOptions.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <Checkbox
                          checked={selectedOptionIds.has(opt.id)}
                          className="bg-white border-slate-400 data-[state=unchecked]:bg-white data-[state=unchecked]:border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          onCheckedChange={(checked) => {
                            const isChecked = checked === true
                            setSelectedOptionIds((prev) => {
                              const next = new Set(prev)
                              if (isChecked) next.add(opt.id)
                              else next.delete(opt.id)
                              return next
                            })
                          }}
                        />
                        <span className="flex-1">{opt.name}</span>
                        <span className="font-medium">{fmt(opt.amount)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Aucune option supplémentaire configurée pour cet établissement.</p>
                )}
              </div>
            </div>
          )}
          {step === 4 && selectedPlan && fundingSource === "family" && !waiveRegistration && !waiveTuition && (
            <div className="space-y-5">
              <h3 className="font-medium text-sm border-b pb-2">Paiement</h3>

              {/* Résumé contexte */}
              <div className="text-xs text-slate-500 flex gap-4">
                <span><span className="font-medium text-slate-700">{selectedCycle?.name}</span></span>
                <span>›</span>
                <span><span className="font-medium text-slate-700">{selectedLevel?.name}</span></span>
                <span>›</span>
                <span><span className="font-medium text-slate-700">{selectedClass?.name}</span></span>
              </div>

              {/* Frais inscription (toujours inclus) */}
              <div>
                <p className="text-sm font-medium mb-2">
                  {typeInscription === "reinscription" ? "Frais de réinscription" : "Frais d'inscription"}
                </p>
                <div className="flex justify-between text-sm border rounded px-3 py-2 bg-slate-50">
                  <span>{typeInscription === "reinscription" ? "Réinscription" : "Inscription"}</span>
                  <span className="font-medium">{fmt(registrationFee)}</span>
                </div>
              </div>

              {/* Scolarité selon mode */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Scolarité — {selectedPlan.payment_mode === "monthly" ? "Mensuel" : selectedPlan.payment_mode === "installments" ? "Par tranches" : "Paiement unique"}
                </p>

                {selectedPlan.payment_mode === "single" && (
                  <label className="flex items-center gap-3 px-3 py-2 border rounded cursor-pointer hover:bg-slate-50">
                    <Checkbox
                      checked={paySingleTuitionNow}
                      onCheckedChange={(checked) => setPaySingleTuitionNow(!!checked)}
                    />
                    <span className="flex-1">Scolarité annuelle complète</span>
                    <span className="font-medium">{fmt(selectedPlan.annual_tuition)}</span>
                  </label>
                )}

                {(selectedPlan.payment_mode === "monthly" || selectedPlan.payment_mode === "installments") && (
                  <>
                    {installments.length === 0 ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        {selectedPlan.payment_mode === "monthly"
                          ? "Ce plan mensuel n'a pas encore d'échéances générées. Les échéances sont créées automatiquement lors de l'inscription."
                          : "Aucune échéance configurée pour ce plan. Configurez les tranches dans Paramètres → Scolarité."}
                      </p>
                    ) : (
                      <div className="border rounded divide-y text-sm">
                        {installments.map((inst) => (
                          <label key={inst.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                            <Checkbox
                              checked={selectedInstallmentIds.has(inst.id)}
                              onCheckedChange={(checked) => {
                                setSelectedInstallmentIds((prev) => {
                                  const next = new Set(prev)
                                  if (checked) next.add(inst.id)
                                  else next.delete(inst.id)
                                  return next
                                })
                              }}
                            />
                            <span className="flex-1">
                              {inst.label}
                              {inst.due_date && (
                                <span className="text-slate-400 ml-2 text-xs">
                                  {new Date(inst.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                              )}
                            </span>
                            <span className="font-medium">{fmt(inst.amount)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Scolarité annuelle totale : {fmt(selectedPlan.annual_tuition)}
                    </p>
                  </>
                )}
              </div>

              {/* Options dynamiques */}
              <div>
                <p className="text-sm font-medium mb-2">Options</p>
                {isLoadingOptions ? (
                  <p className="text-sm text-slate-500">Chargement des options…</p>
                ) : availableOptions.length > 0 ? (
                  <div className="border rounded divide-y text-sm">
                    {availableOptions.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <Checkbox
                          checked={selectedOptionIds.has(opt.id)}
                          onCheckedChange={(checked) => {
                            setSelectedOptionIds((prev) => {
                              const next = new Set(prev)
                              if (checked) next.add(opt.id)
                              else next.delete(opt.id)
                              return next
                            })
                          }}
                        />
                        <span className="flex-1">{opt.name}</span>
                        <span className="font-medium">{fmt(opt.amount)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Aucune option supplémentaire configurée.</p>
                )}
              </div>

              {/* Récapitulatif total */}
              <div className="border rounded bg-slate-50">
                <p className="text-xs font-medium text-slate-500 px-3 pt-2 pb-1 uppercase tracking-wide">Récapitulatif — à payer maintenant</p>
                <div className="divide-y px-3">
                  <div className="flex justify-between py-1.5 text-sm">
                    <span>{typeInscription === "reinscription" ? "Frais de réinscription" : "Frais d'inscription"}</span>
                    <span>{fmt(registrationFee)}</span>
                  </div>
                  {selectedPlan?.payment_mode === "single" && paySingleTuitionNow && (
                    <div className="flex justify-between py-1.5 text-sm">
                      <span>Scolarité annuelle complète</span>
                      <span>{fmt(selectedPlan.annual_tuition)}</span>
                    </div>
                  )}
                  {installments.filter((i) => selectedInstallmentIds.has(i.id)).map((i) => (
                    <div key={i.id} className="flex justify-between py-1.5 text-sm">
                      <span>{i.label}</span>
                      <span>{fmt(i.amount)}</span>
                    </div>
                  ))}
                  {availableOptions.filter((o) => selectedOptionIds.has(o.id)).map((o) => (
                    <div key={o.id} className="flex justify-between py-1.5 text-sm">
                      <span>{o.name}</span>
                      <span>{fmt(o.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between px-3 py-2 border-t font-semibold text-sm">
                  <span>Total</span>
                  <span>{fmt(totalNow)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && !selectedPlan && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm border-b pb-2">Paiement</h3>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Aucun forfait configuré pour ce niveau. Retournez à l'étape précédente ou configurez un forfait dans Paramètres → Scolarité.
              </p>
            </div>
          )}

          {/* ── Étape 5 : Documents ──────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm border-b pb-2">Documents (facultatif)</h3>
              <div>
                <Label>Acte de naissance</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setBirthCertificate(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label>Certificat médical</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setMedicalCertificate(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          )}

          {/* ── Étape 6 : Validation ─────────────────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm border-b pb-2">Validation — Récapitulatif</h3>

              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 text-slate-500 w-40">Élève</td>
                    <td className="py-2 font-medium">{firstName} {lastName}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Année scolaire</td>
                    <td className="py-2">{activeYear?.name ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Cycle</td>
                    <td className="py-2">{selectedCycle?.name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Niveau</td>
                    <td className="py-2">{selectedLevel?.name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Classe</td>
                    <td className="py-2">{selectedClass?.name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Scolarité annuelle</td>
                    <td className="py-2">{selectedPlan ? fmt(selectedPlan.annual_tuition) : "—"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">Parent</td>
                    <td className="py-2">{parentFirstName} {parentLastName} — {parentPhone}</td>
                  </tr>
                </tbody>
              </table>

              {totalNow > 0 ? (
                <div className="border rounded bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">À payer maintenant</p>
                  <div className="space-y-1 text-sm">
                    {registrationFee > 0 && (
                      <div className="flex justify-between">
                        <span>{typeInscription === "reinscription" ? "Frais de réinscription" : "Frais d'inscription"}</span>
                        <span>{fmt(registrationFee)}</span>
                      </div>
                    )}
                    {selectedPlan?.payment_mode === "single" && paySingleTuitionNow && (
                      <div className="flex justify-between">
                        <span>Scolarité annuelle complète</span>
                        <span>{fmt(selectedPlan.annual_tuition)}</span>
                      </div>
                    )}
                    {installments.filter((i) => selectedInstallmentIds.has(i.id)).map((i) => (
                      <div key={i.id} className="flex justify-between">
                        <span>{i.label}</span>
                        <span>{fmt(i.amount)}</span>
                      </div>
                    ))}
                    {availableOptions.filter((o) => selectedOptionIds.has(o.id)).map((o) => (
                      <div key={o.id} className="flex justify-between">
                        <span>{o.name}</span>
                        <span>{fmt(o.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                      <span>Total</span>
                      <span>{fmt(totalNow)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-medium">Aucun paiement à encaisser maintenant</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {fundingSource === "other"
                      ? "Les frais d'inscription et de scolarité sont affectés à l'exonération / à l'autre organisme."
                      : fundingSource === "state"
                        ? "La prise en charge et les éventuels frais restant à la famille seront enregistrés dans les échéances financières."
                        : "Les frais exonérés ne seront pas réclamés maintenant."}
                    {" "}Aucun paiement ne sera enregistré automatiquement.
                  </p>
                  {selectedOptionIds.size > 0 && (
                    <div className="mt-3 border-t pt-2">
                      <p className="text-xs font-medium">Options scolaires sélectionnées</p>
                      {availableOptions.filter((o) => selectedOptionIds.has(o.id)).map((o) => (
                        <div key={o.id} className="mt-1 flex justify-between gap-3 text-xs">
                          <span>{o.name}</span><span>{fmt(o.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t px-6 py-4 flex justify-between items-center">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <span className="text-xs text-slate-400">{step} / {STEPS.length}</span>
          {step < STEPS.length ? (
            <Button onClick={handleNext}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !activeYear}>
              {isSubmitting ? "Enregistrement…" : typeInscription === "reinscription" ? "Confirmer la réinscription" : "Confirmer l'inscription"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
