"use client"

import { StateFundingSettingsCard } from "@/components/tuition/StateFundingSettingsCard"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useAuthentification } from "@/providers/authentification.provider"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { createTuitionPlan, updateTuitionPlan } from "@/lib/supabase/services/tuition.service"
import { useEstablishmentFees } from "@/hooks/useEstablishmentFees"
import { AcademicYearSelector } from "@/components/academic/AcademicYearSelector"
import { GeneralFeesSection } from "@/components/tuition/GeneralFeesSection"
import type { PaymentMode, TuitionPlanWithInstallments } from "@/lib/supabase/types"
import { AlertCircle, CheckCircle2, Plus, Trash2, Save, Pencil } from "lucide-react"

interface InstallmentState {
  id?: string
  label: string
  amount: number
  due_date: string | null
}

interface RegistrationFeeOverride {
  type: "cycle" | "level"
  id: string
  name: string
  fee: number
}

const MODE_LABELS: Record<PaymentMode, string> = {
  monthly: "Mensuel",
  installments: "Par tranches",
  single: "Paiement unique",
}

function formatFCFA(amount: number) {
  return amount.toLocaleString("fr-FR") + " FCFA"
}

// ─── Modal tarif ──────────────────────────────────────────────────────────────

interface TuitionModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => Promise<void>
  levelId: string
  levelLabel: string
  academicYearId: string
  establishmentId: string
  existingPlan: TuitionPlanWithInstallments | null
  defaultRegistrationFee: number
}

function TuitionModal({ open, onClose, onSaved, levelId, levelLabel, academicYearId, establishmentId, existingPlan, defaultRegistrationFee }: TuitionModalProps) {
  const [registrationFee, setRegistrationFee] = useState(existingPlan?.registration_fee ?? defaultRegistrationFee)
  const [annualAmount, setAnnualAmount] = useState(existingPlan?.annual_tuition ?? 0)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(existingPlan?.payment_mode ?? "monthly")
  const [installments, setInstallments] = useState<InstallmentState[]>(
    existingPlan?.installments?.map((i) => ({ id: i.id, label: i.label, amount: i.amount, due_date: i.due_date ? i.due_date.split("T")[0] : null })) ?? []
  )
  const [nbGenerate, setNbGenerate] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalInstallments = useMemo(() => installments.reduce((s, i) => s + (i.amount || 0), 0), [installments])
  const amountsMatch = paymentMode !== "installments" || annualAmount === totalInstallments

  const handleGenerate = () => {
    const n = parseInt(nbGenerate, 10)
    if (!n || n <= 0) return
    const base = Math.floor(annualAmount / n)
    const rem = annualAmount - base * n
    setInstallments(Array.from({ length: n }, (_, i) => ({ label: `Tranche ${i + 1}`, amount: i === n - 1 ? base + rem : base, due_date: null })))
  }

  const handleSave = async () => {
    if (!annualAmount || annualAmount <= 0) { setError("La scolarité annuelle doit être supérieure à 0."); return }
    if (paymentMode === "installments" && !amountsMatch) { setError("Le total des tranches doit correspondre au montant annuel."); return }
    setIsSaving(true); setError(null)
    try {
      const payload = {
        establishment_id: establishmentId,
        academic_year_id: academicYearId,
        grade_level_id: levelId,
        payment_mode: paymentMode,
        annual_tuition: annualAmount,
        registration_fee: registrationFee,
        installment_count: paymentMode === "installments" ? installments.length : null,
        installments: paymentMode === "installments" ? installments.map((inst, idx) => ({ ...inst, installment_number: idx + 1 })) : [],
      }
      if (existingPlan) { await updateTuitionPlan(existingPlan.id, payload) } else { await createTuitionPlan(payload) }
      toast.success("Tarif enregistré.")
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le tarif.")
    } finally { setIsSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Configuration — {levelLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="modal-reg-fee" className="text-sm">Frais d'inscription</Label>
              <div className="relative">
                <Input id="modal-reg-fee" type="number" min={0} value={registrationFee} onChange={(e) => setRegistrationFee(Number(e.target.value) || 0)} className="pr-14 text-sm" />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 pointer-events-none">FCFA</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-annual" className="text-sm">Scolarité annuelle</Label>
              <div className="relative">
                <Input id="modal-annual" type="number" min={0} value={annualAmount} onChange={(e) => setAnnualAmount(Number(e.target.value) || 0)} className="pr-14 text-sm" />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 pointer-events-none">FCFA</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Mode de paiement</Label>
            <RadioGroup value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)} className="flex gap-2">
              {(Object.entries(MODE_LABELS) as [PaymentMode, string][]).map(([mode, label]) => (
                <label key={mode} className={`flex-1 flex items-center justify-center cursor-pointer rounded border px-3 py-2.5 text-sm transition-colors ${paymentMode === mode ? "border-gray-800 bg-gray-50 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <RadioGroupItem value={mode} className="sr-only" />{label}
                </label>
              ))}
            </RadioGroup>
          </div>
          {paymentMode === "installments" && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="modal-nb" className="text-sm">Générer automatiquement</Label>
                  <Input id="modal-nb" type="number" min={1} placeholder="Ex : 3" value={nbGenerate} onChange={(e) => setNbGenerate(e.target.value)} className="text-sm" />
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate} className="shrink-0">Générer</Button>
              </div>
              {installments.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_2fr_2fr_auto] gap-2 text-xs text-gray-400 px-1">
                    <span>Libellé</span><span>Montant</span><span>Date (opt.)</span><span />
                  </div>
                  {installments.map((inst, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_2fr_2fr_auto] gap-2 items-center">
                      <Input value={inst.label} onChange={(e) => { const u=[...installments]; u[idx]={...u[idx],label:e.target.value}; setInstallments(u) }} className="h-8 text-sm" />
                      <Input type="number" min={0} value={inst.amount} onChange={(e) => { const u=[...installments]; u[idx]={...u[idx],amount:Number(e.target.value)||0}; setInstallments(u) }} className="h-8 text-sm" />
                      <Input type="date" value={inst.due_date||""} onChange={(e) => { const u=[...installments]; u[idx]={...u[idx],due_date:e.target.value||null}; setInstallments(u) }} className="h-8 text-sm" />
                      <button onClick={() => setInstallments(installments.filter((_,i)=>i!==idx))} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setInstallments([...installments,{label:`Tranche ${installments.length+1}`,amount:0,due_date:null}])} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    <Plus className="h-3 w-3" />Ajouter une tranche
                  </button>
                </div>
              )}
              <div className={`flex items-center gap-2 rounded px-3 py-2 text-xs ${amountsMatch?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>
                {amountsMatch ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                <span>Total tranches : <strong>{totalInstallments.toLocaleString("fr-FR")} FCFA</strong>{!amountsMatch && ` — attendu : ${annualAmount.toLocaleString("fr-FR")} FCFA`}</span>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving||!annualAmount||(paymentMode==="installments"&&!amountsMatch)}>
            <Save className="h-4 w-4 mr-1.5" />{isSaving?"Enregistrement…":"Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



// ─── Page principale ──────────────────────────────────────────────────────────

export default function ScolariteSettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId

  const { data: academicYears, activeYear, selectedYear, selectYear } = useAcademicYears(establishmentId ?? null)
  const { data: academicStructure, isLoading: isStructureLoading } = useAcademicStructure(establishmentId ?? null)
  const academicYearId = selectedYear?.id ?? activeYear?.id ?? academicYears[0]?.id ?? ""
  const { data: tuitionPlans, isLoading: isTuitionLoading, refresh } = useTuitionPlans(academicYearId)
  const { settings } = useEstablishmentFees(establishmentId ?? null)


  const [modalState, setModalState] = useState<{ open: boolean; levelId: string; levelLabel: string; existingPlan: TuitionPlanWithInstallments | null }>({ open: false, levelId: "", levelLabel: "", existingPlan: null })

  const tuitionMap = useMemo(() => {
    const m = new Map<string, TuitionPlanWithInstallments>()
    ;(tuitionPlans || []).forEach((p: any) => m.set(p.grade_level_id, p as TuitionPlanWithInstallments))
    return m
  }, [tuitionPlans])

  const openModal = (levelId: string, levelLabel: string) => {
    setModalState({ open: true, levelId, levelLabel, existingPlan: tuitionMap.get(levelId) ?? null })
  }



  if (!establishmentId) {
    return <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">Impossible de charger les données : établissement non identifié.</div>
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Scolarité</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configurez les tarifs par niveau pour chaque année scolaire.</p>
        </div>
        <div className="w-full sm:w-52">
          <AcademicYearSelector value={academicYearId} years={academicYears} onChange={selectYear} placeholder="Année scolaire" />
        </div>
      </div>

      {establishmentId !== "demo-establishment" ? <StateFundingSettingsCard establishmentId={establishmentId} /> : null}

      {/* Frais généraux */}
      <GeneralFeesSection establishmentId={establishmentId} academicStructure={academicStructure} />

      {/* Tarifs par niveau */}
      <div className="border rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Tarifs par niveau</h2>
          <p className="text-xs text-gray-400 mt-0.5">Le tarif est défini au niveau et s'applique à toutes les classes rattachées.</p>
        </div>
        {isStructureLoading || isTuitionLoading ? (
          <div className="px-4 py-4 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : academicStructure.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Aucun cycle ou niveau configuré dans la structure académique.</div>
        ) : (
          <div className="divide-y">
            {academicStructure.map((cycle) => (
              <div key={cycle.id}>
                <div className="px-4 py-2 bg-gray-50/70 border-b">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cycle.name}</span>
                </div>
                {!cycle.grade_levels || cycle.grade_levels.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400 italic">Aucun niveau dans ce cycle.</div>
                ) : cycle.grade_levels.map((level) => {
                  const plan = tuitionMap.get(level.id) ?? null
                  return (
                    <div key={level.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{level.name}</p>
                        {plan ? (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFCFA(plan.annual_tuition)} / an · {MODE_LABELS[plan.payment_mode]}
                            {plan.payment_mode === "installments" && plan.installment_count ? ` (${plan.installment_count} tranches)` : ""}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-0.5">Tarif non configuré</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs shrink-0 ml-4" onClick={() => openModal(level.id, `${cycle.name} — ${level.name}`)}>
                        <Pencil className="h-3 w-3 mr-1.5" />{plan ? "Modifier" : "Configurer"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalState.open && (
        <TuitionModal
          open={modalState.open}
          onClose={() => setModalState((s) => ({ ...s, open: false }))}
          onSaved={refresh}
          levelId={modalState.levelId}
          levelLabel={modalState.levelLabel}
          academicYearId={academicYearId}
          establishmentId={establishmentId}
          existingPlan={modalState.existingPlan}
          defaultRegistrationFee={settings?.registration_fee || 0}
        />
      )}
    </div>
  )
}
