"use client"

import { useMemo, useState } from "react"
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
import { AlertCircle, CheckCircle2, Save } from "lucide-react"

const modeLabels: Record<PaymentMode, string> = {
  monthly: "Mensuel",
  installments: "Par tranches",
  single: "Paiement unique",
}

export default function ScolariteSettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? "demo-establishment"
  const { data: academicYears, activeYear } = useAcademicYears(establishmentId)
  const { data: academicStructure, isLoading: isStructureLoading, error: structureError } = useAcademicStructure(establishmentId)

  const academicYearId = activeYear?.id ?? academicYears[0]?.id ?? ""
  const { data: tuitionPlans, isLoading: isTuitionLoading, error: tuitionError, refresh } = useTuitionPlans(academicYearId)

  const [selectedLevelId, setSelectedLevelId] = useState<string>("")
  const [selectedLevelName, setSelectedLevelName] = useState<string>("")
  const [registrationFee, setRegistrationFee] = useState<number>(0)
  const [annualAmount, setAnnualAmount] = useState<number>(0)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("monthly")
  const [installmentCount, setInstallmentCount] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const levelMap = useMemo(() => {
    const map = new Map<string, string>()
    academicStructure.forEach((cycle) => {
      cycle.grade_levels?.forEach((level) => {
        map.set(level.id, `${cycle.name} • ${level.name}`)
      })
    })
    return map
  }, [academicStructure])

  const tuitionMap = useMemo(() => {
    const map = new Map<string, typeof tuitionPlans[number]>()
    tuitionPlans.forEach((plan) => map.set(plan.grade_level_id, plan))
    return map
  }, [tuitionPlans])

  const totalConfigured = useMemo(() => {
    if (paymentMode !== "installments") return annualAmount
    return annualAmount
  }, [annualAmount, paymentMode])

  const matchingPlan = selectedLevelId ? tuitionMap.get(selectedLevelId) ?? null : null

  const handleSelectLevel = (levelId: string) => {
    const level = academicStructure
      .flatMap((cycle) => cycle.grade_levels ?? [])
      .find((item) => item.id === levelId)

    setSelectedLevelId(levelId)
    setSelectedLevelName(level?.name ?? "")

    const plan = tuitionMap.get(levelId)
    if (plan) {
      setRegistrationFee(plan.registration_fee)
      setAnnualAmount(plan.annual_amount)
      setPaymentMode(plan.payment_mode)
      setInstallmentCount(plan.installment_count ?? 0)
      return
    }

    setRegistrationFee(0)
    setAnnualAmount(0)
    setPaymentMode("monthly")
    setInstallmentCount(0)
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
        installment_count: paymentMode === "installments" ? installmentCount : null,
      }

      if (matchingPlan) {
        await updateTuitionPlan(matchingPlan.id, payload)
      } else {
        await createTuitionPlan(payload)
      }

      await refresh()
      setSaveSuccess("La scolarité a bien été enregistrée.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Impossible d’enregistrer la scolarité.")
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = selectedLevelId && annualAmount > 0 && registrationFee >= 0 && (!matchingPlan || true)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scolarité</h1>
          <p className="text-sm text-slate-600">Année scolaire : {activeYear?.name ?? academicYears[0]?.name ?? "—"}</p>
        </div>
      </div>

      {structureError || tuitionError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {structureError ?? tuitionError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tarifs par niveau</CardTitle>
            <CardDescription>Le tarif est défini au niveau et s’applique à toutes les classes du niveau.</CardDescription>
          </CardHeader>
          <CardContent>
            {isStructureLoading || isTuitionLoading ? (
              <div className="text-sm text-slate-500">Chargement de la structure...</div>
            ) : (
              <div className="space-y-4">
                {academicStructure.map((cycle) => (
                  <div key={cycle.id} className="rounded-lg border p-3">
                    <div className="mb-3 font-semibold text-slate-800">{cycle.name}</div>
                    <div className="space-y-3">
                      {cycle.grade_levels?.map((level) => {
                        const plan = tuitionMap.get(level.id)
                        return (
                          <div key={level.id} className="flex flex-col gap-3 rounded-md bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{level.name}</div>
                              <div className="text-sm text-slate-600">
                                {plan ? `${plan.annual_amount.toLocaleString("fr-FR")} FCFA` : "Tarif non défini"}
                              </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Configuration de la scolarité</CardTitle>
            <CardDescription>{selectedLevelName ? `Niveau : ${selectedLevelName}` : "Sélectionnez un niveau"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="niveau-select">Niveau</Label>
              <Select value={selectedLevelId} onValueChange={handleSelectLevel}>
                <SelectTrigger id="niveau-select">
                  <SelectValue placeholder="Choisir un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {academicStructure.flatMap((cycle) =>
                    cycle.grade_levels?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {cycle.name} • {level.name}
                      </SelectItem>
                    )) ?? []
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frais-inscription">Frais d’inscription</Label>
              <Input
                id="frais-inscription"
                type="number"
                min={0}
                value={registrationFee}
                onChange={(e) => setRegistrationFee(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scolarite-annuelle">Scolarité annuelle</Label>
              <Input
                id="scolarite-annuelle"
                type="number"
                min={0}
                value={annualAmount}
                onChange={(e) => setAnnualAmount(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-3">
              <Label>Mode de paiement</Label>
              <RadioGroup value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)} className="space-y-2">
                {(Object.keys(modeLabels) as PaymentMode[]).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 rounded-md border p-2">
                    <RadioGroupItem value={mode} id={`mode-${mode}`} />
                    <span>{modeLabels[mode]}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {paymentMode === "installments" && (
              <div className="space-y-2">
                <Label htmlFor="nombre-tranches">Nombre de tranches</Label>
                <Input
                  id="nombre-tranches"
                  type="number"
                  min={1}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(Number(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="rounded-md border bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Total configuré</span>
                <strong>{totalConfigured.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Scolarité</span>
                <strong>{annualAmount.toLocaleString("fr-FR")} FCFA</strong>
              </div>
              <div className="mt-3 flex items-center gap-2 text-green-700">
                {annualAmount === totalConfigured ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{annualAmount === totalConfigured ? "Les montants correspondent" : "Le total doit correspondre au montant annuel."}</span>
              </div>
            </div>

            {saveError ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div> : null}
            {saveSuccess ? <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{saveSuccess}</div> : null}

            <Button className="w-full" onClick={handleSave} disabled={!canSave || isSaving || annualAmount !== totalConfigured}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
