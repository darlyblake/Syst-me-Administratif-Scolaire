"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { useAuthentification } from "@/providers/authentification.provider"
import { createTuitionPlan, updateTuitionPlan } from "@/lib/supabase/services/tuition.service"
import type { PaymentMode } from "@/lib/supabase/types"
import { AcademicYearSelector } from "@/components/academic/AcademicYearSelector"
import { StateFundingSettingsCard } from "@/components/tuition/StateFundingSettingsCard"
import { AlertCircle, CheckCircle2, Save, Plus, Trash2 } from "lucide-react"

const modeLabels: Record<PaymentMode, string> = {
  monthly: "Mensuel",
  installments: "Par tranches",
  single: "Paiement unique",
}

interface InstallmentState {
  id?: string
  label: string
  amount: number
  due_date: string | null
}

export default function ScolariteSettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId
  const { data: academicYears, activeYear, selectedYear, selectYear } = useAcademicYears(establishmentId ?? null)
  const { data: academicStructure, isLoading: isStructureLoading, error: structureError } = useAcademicStructure(establishmentId ?? null)
  const academicYearId = selectedYear?.id ?? activeYear?.id ?? academicYears[0]?.id ?? ""
  const { data: tuitionPlans, isLoading: isTuitionLoading, error: tuitionError, refresh } = useTuitionPlans(academicYearId)

  const [selectedLevelId, setSelectedLevelId] = useState<string>("")
  const [selectedLevelName, setSelectedLevelName] = useState<string>("")
  const [registrationFee, setRegistrationFee] = useState<number>(0)
  const [annualAmount, setAnnualAmount] = useState<number>(0)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("monthly")
  
  // Échéances state
  const [installments, setInstallments] = useState<InstallmentState[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const levelMap = useMemo(() => {
    const map = new Map<string, string>()
    academicStructure.forEach((cycle) => cycle.grade_levels?.forEach((level) => map.set(level.id, `${cycle.name} • ${level.name}`)))
    return map
  }, [academicStructure])

  const tuitionMap = useMemo(() => {
    const map = new Map<string, typeof tuitionPlans[number]>()
    tuitionPlans.forEach((plan) => map.set(plan.grade_level_id, plan))
    return map
  }, [tuitionPlans])

  const matchingPlan = selectedLevelId ? tuitionMap.get(selectedLevelId) ?? null : null

  // Total amount computed dynamically based on the mode
  const totalConfigured = useMemo(() => {
    if (paymentMode !== "installments") return annualAmount
    return installments.reduce((acc, inst) => acc + (inst.amount || 0), 0)
  }, [annualAmount, paymentMode, installments])

  const handleSelectLevel = (levelId: string) => {
    const level = academicStructure.flatMap((cycle) => cycle.grade_levels ?? []).find((item) => item.id === levelId)
    setSelectedLevelId(levelId)
    setSelectedLevelName(level?.name ?? "")
    
    setSaveError(null)
    setSaveSuccess(null)

    const plan = tuitionMap.get(levelId)
    if (plan) {
      setRegistrationFee(plan.registration_fee)
      setAnnualAmount(plan.annual_amount)
      setPaymentMode(plan.payment_mode)
      
      // Load installments if they exist, otherwise empty
      if (plan.installments && plan.installments.length > 0) {
        setInstallments(
          plan.installments.map(inst => ({
            id: inst.id,
            label: inst.label,
            amount: inst.amount,
            due_date: inst.due_date ? inst.due_date.split("T")[0] : null // Keep only YYYY-MM-DD
          }))
        )
      } else {
        setInstallments([])
      }
      return
    }
    
    // Reset if no plan
    setRegistrationFee(0)
    setAnnualAmount(0)
    setPaymentMode("monthly")
    setInstallments([])
  }

  const handleGenerateInstallments = (count: number) => {
    if (count <= 0) return
    const baseAmount = Math.floor(annualAmount / count)
    const remainder = annualAmount - (baseAmount * count)
    
    const newInstallments = Array.from({ length: count }).map((_, i) => ({
      label: `Tranche ${i + 1}`,
      amount: i === count - 1 ? baseAmount + remainder : baseAmount,
      due_date: null
    }))
    setInstallments(newInstallments)
  }

  const handleUpdateInstallment = (index: number, field: keyof InstallmentState, value: any) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    setInstallments(updated)
  }

  const handleRemoveInstallment = (index: number) => {
    const updated = [...installments]
    updated.splice(index, 1)
    setInstallments(updated)
  }
  
  const handleAddInstallment = () => {
    setInstallments([...installments, { label: `Tranche ${installments.length + 1}`, amount: 0, due_date: null }])
  }

  const handleSave = async () => {
    if (!selectedLevelId || !academicYearId) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const payload = {
        establishment_id: establishmentId,
        academic_year_id: academicYearId,
        grade_level_id: selectedLevelId,
        payment_mode: paymentMode,
        annual_amount: annualAmount,
        registration_fee: registrationFee,
        installment_count: paymentMode === "installments" ? installments.length : null,
        installments: paymentMode === "installments" ? installments : [],
      }
      if (matchingPlan) await updateTuitionPlan(matchingPlan.id, payload)
      else await createTuitionPlan(payload)
      await refresh()
      
      // Update UI matching the new data
      const newPlans = await refresh() // Make sure refresh has completed to get new IDs
      setSaveSuccess("La scolarité a bien été enregistrée.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Impossible d’enregistrer la scolarité.")
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = selectedLevelId && annualAmount > 0 && registrationFee >= 0

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scolarité</h1>
          <p className="text-sm text-slate-600 mt-1">Configurez les tarifs d'inscription et de scolarité par niveau.</p>
        </div>
        <div className="w-full md:w-64">
          <AcademicYearSelector 
            value={academicYearId} 
            years={academicYears} 
            onChange={selectYear} 
            placeholder="Année scolaire" 
          />
        </div>
      </div>

      {/* ERRORS */}
      {(structureError || tuitionError) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {structureError ?? tuitionError}
        </div>
      )}

      {establishmentId ? <StateFundingSettingsCard establishmentId={establishmentId} /> : null}

      {!establishmentId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Impossible de charger les données : établissement non identifié
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        
        {/* LISTE DES TARIFS */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Tarifs par niveau</CardTitle>
            <CardDescription>
              Le tarif est défini au niveau et s’applique à toutes les classes qui y sont rattachées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStructureLoading || isTuitionLoading ? (
              <div className="text-sm text-slate-500 py-4 text-center">Chargement de la structure...</div>
            ) : (
              <div className="space-y-6">
                {academicStructure.map((cycle) => (
                  <div key={cycle.id} className="rounded-lg border bg-white overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-xs">
                        {cycle.name}
                      </h3>
                    </div>
                    <div className="divide-y">
                      {cycle.grade_levels?.map((level) => { 
                        const plan = tuitionMap.get(level.id); 
                        return (
                          <div key={level.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{level.name}</div>
                              {plan ? (
                                <div className="text-sm text-slate-500">
                                  {plan.annual_amount.toLocaleString("fr-FR")} FCFA / {modeLabels[plan.payment_mode]}
                                  {plan.payment_mode === "installments" && plan.installment_count && ` (${plan.installment_count} tranches)`}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-400 italic">Tarif non défini</div>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleSelectLevel(level.id)}>
                              Modifier
                            </Button>
                          </div>
                        ) 
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* FORMULAIRE D'ÉDITION */}
        <Card className="shadow-sm sticky top-6">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg">Configuration de la scolarité</CardTitle>
            <CardDescription>
              {selectedLevelName ? `Niveau : ${selectedLevelName}` : "Sélectionnez un niveau dans la liste"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="space-y-3">
              <Label htmlFor="niveau-select">Niveau</Label>
              <Select value={selectedLevelId} onValueChange={handleSelectLevel}>
                <SelectTrigger id="niveau-select" className="bg-white">
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {academicStructure.flatMap((cycle) => 
                    cycle.grade_levels?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>{cycle.name} • {level.name}</SelectItem>
                    )) ?? []
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="frais-inscription">Frais d’inscription</Label>
                <div className="relative">
                  <Input id="frais-inscription" type="number" min={0} className="pr-12" value={registrationFee} onChange={(e) => setRegistrationFee(Number(e.target.value) || 0)} />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-slate-500">FCFA</div>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="scolarite-annuelle">Scolarité annuelle</Label>
                <div className="relative">
                  <Input id="scolarite-annuelle" type="number" min={0} className="pr-12" value={annualAmount} onChange={(e) => setAnnualAmount(Number(e.target.value) || 0)} />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-slate-500">FCFA</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Mode de paiement</Label>
              <RadioGroup value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)} className="grid gap-2 grid-cols-3">
                {(Object.keys(modeLabels) as PaymentMode[]).map((mode) => (
                  <label key={mode} className={`flex flex-col items-center justify-center text-center cursor-pointer gap-2 rounded-md border-2 p-3 hover:bg-slate-50 transition-colors ${paymentMode === mode ? 'border-primary bg-primary/5' : 'border-slate-100'}`}>
                    <RadioGroupItem value={mode} id={`mode-${mode}`} className="sr-only" />
                    <span className="text-sm font-medium">{modeLabels[mode]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* EDITEUR DE TRANCHES */}
            {paymentMode === "installments" && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-end gap-3">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="nombre-tranches">Générer les tranches automatiquement</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="nombre-tranches" 
                        type="number" 
                        min={1} 
                        placeholder="Ex: 3"
                        defaultValue={installments.length || ""}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateInstallments(Number(e.currentTarget.value))
                        }}
                      />
                      <Button variant="secondary" onClick={(e) => {
                        const input = e.currentTarget.previousSibling as HTMLInputElement
                        handleGenerateInstallments(Number(input.value))
                      }}>Générer</Button>
                    </div>
                  </div>
                </div>

                {installments.length > 0 && (
                  <div className="space-y-3">
                    <Label>Détail des échéances</Label>
                    <div className="space-y-2">
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-md border">
                          <div className="space-y-1 flex-[2]">
                            <Label className="text-xs text-slate-500">Libellé</Label>
                            <Input value={inst.label} onChange={(e) => handleUpdateInstallment(idx, "label", e.target.value)} className="h-8 text-sm" placeholder="Ex: 1ère tranche" />
                          </div>
                          <div className="space-y-1 flex-[2]">
                            <Label className="text-xs text-slate-500">Montant</Label>
                            <Input type="number" min={0} value={inst.amount} onChange={(e) => handleUpdateInstallment(idx, "amount", Number(e.target.value) || 0)} className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1 flex-[2]">
                            <Label className="text-xs text-slate-500">Date (Optionnelle)</Label>
                            <Input type="date" value={inst.due_date || ""} onChange={(e) => handleUpdateInstallment(idx, "due_date", e.target.value || null)} className="h-8 text-sm text-slate-600" />
                          </div>
                          <div className="space-y-1 pt-5">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleRemoveInstallment(idx)}>
                               <Trash2 className="h-4 w-4" />
                             </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-slate-500" onClick={handleAddInstallment}>
                      <Plus className="h-4 w-4 mr-1" /> Ajouter une tranche
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* RESUME ET VALIDATION */}
            <div className="rounded-md border bg-slate-50 p-4 text-sm mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Scolarité annuelle</span>
                <strong className="text-base">{annualAmount.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total configuré</span>
                <strong className="text-base">{totalConfigured.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              
              <div className={`mt-4 flex items-center gap-2 p-2 rounded-md ${annualAmount === totalConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {annualAmount === totalConfigured ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span className="font-medium">
                  {annualAmount === totalConfigured 
                    ? "Les montants correspondent." 
                    : `Le total des tranches (${totalConfigured}) doit correspondre au montant annuel (${annualAmount}).`}
                </span>
              </div>
            </div>

            {saveError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mt-2">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 mt-2">
                {saveSuccess}
              </div>
            )}

            <Button 
              className="w-full h-11 text-base mt-2" 
              onClick={handleSave} 
              disabled={!canSave || isSaving || annualAmount !== totalConfigured}
            >
              <Save className="mr-2 h-5 w-5" />
              {isSaving ? "Enregistrement..." : "Enregistrer la configuration"}
            </Button>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  )
}
