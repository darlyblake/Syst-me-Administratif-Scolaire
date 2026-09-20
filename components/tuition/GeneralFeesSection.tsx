"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Save, Plus } from "lucide-react"

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

import { useEstablishmentFees } from "@/hooks/useEstablishmentFees"
import { 
  upsertEstablishmentFeeSettings, 
  upsertEstablishmentFeeOverride, 
  deleteEstablishmentFeeOverride 
} from "@/lib/supabase/services/establishment-fees.service"
import type { EstablishmentFeeOverride } from "@/lib/supabase/types/tuition"

function formatFCFA(amount: number) {
  return amount.toLocaleString("fr-FR") + " FCFA"
}

interface GeneralFeesSectionProps {
  establishmentId: string
  academicStructure: Array<{ id: string; name: string; grade_levels?: Array<{ id: string; name: string }> }>
}

export function GeneralFeesSection({ establishmentId, academicStructure }: GeneralFeesSectionProps) {
  const { settings, overrides, isLoading, refresh } = useEstablishmentFees(establishmentId)
  
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false)
  const [generalRegInput, setGeneralRegInput] = useState(0)
  const [generalRenewInput, setGeneralRenewInput] = useState(0)
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [overrideIdInput, setOverrideIdInput] = useState("")
  const [overrideRegInput, setOverrideRegInput] = useState(0)
  const [overrideRenewInput, setOverrideRenewInput] = useState(0)
  const [isSavingOverride, setIsSavingOverride] = useState(false)

  const openGeneralModal = () => {
    setGeneralRegInput(settings?.registration_fee || 0)
    setGeneralRenewInput(settings?.re_registration_fee || 0)
    setIsGeneralModalOpen(true)
  }

  const saveGeneralFees = async () => {
    setIsSavingGeneral(true)
    try {
      await upsertEstablishmentFeeSettings(establishmentId, {
        registration_fee: generalRegInput,
        re_registration_fee: generalRenewInput
      })
      toast.success("Frais généraux enregistrés.")
      await refresh()
      setIsGeneralModalOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.")
    } finally {
      setIsSavingGeneral(false)
    }
  }

  const allItems = useMemo(() => {
    const items: { type: "cycle" | "level"; id: string; name: string }[] = []
    academicStructure.forEach((c) => {
      items.push({ type: "cycle", id: c.id, name: `Cycle : ${c.name}` })
      c.grade_levels?.forEach((l) => items.push({ type: "level", id: l.id, name: `Niveau : ${l.name} (${c.name})` }))
    })
    return items
  }, [academicStructure])

  const addOverride = async () => {
    if (!overrideIdInput) return
    const item = allItems.find((i) => i.id === overrideIdInput)
    if (!item) return

    setIsSavingOverride(true)
    try {
      await upsertEstablishmentFeeOverride({
        establishment_id: establishmentId,
        scope_type: item.type,
        scope_id: item.id,
        registration_fee: overrideRegInput,
        re_registration_fee: overrideRenewInput
      })
      toast.success("Frais ciblé ajouté.")
      await refresh()
      setOverrideIdInput("")
      setOverrideRegInput(0)
      setOverrideRenewInput(0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout.")
    } finally {
      setIsSavingOverride(false)
    }
  }

  const deleteOverride = async (overrideId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce frais spécifique ?")) return
    try {
      await deleteEstablishmentFeeOverride(overrideId)
      toast.success("Frais ciblé supprimé.")
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression.")
    }
  }

  if (isLoading) {
    return <div className="border rounded-md overflow-hidden p-4"><Skeleton className="h-20 w-full" /></div>
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">Frais d'inscription et réinscription</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOverrideModalOpen(true)} className="text-xs text-blue-600 hover:underline">
            Frais spécifiques{overrides.length > 0 ? ` (${overrides.length})` : ""}
          </button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700" onClick={openGeneralModal}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Modifier
          </Button>
        </div>
      </div>
      
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-gray-500">Frais d'inscription</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{formatFCFA(settings?.registration_fee || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Appliqués à tous les niveaux par défaut</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Frais de réinscription</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{formatFCFA(settings?.re_registration_fee || 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Pour les élèves déjà inscrits</p>
          </div>
        </div>

        {overrides.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Frais d'inscription spécifiques (Exceptions)</p>
              {overrides.map((o) => {
                const item = allItems.find(i => i.id === o.scope_id)
                return (
                  <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-700 bg-gray-50 p-2 rounded">
                    <span className="font-medium">{item?.name || o.scope_id}</span>
                    <span className="flex items-center gap-4 mt-1 sm:mt-0">
                      <span>Insc: {formatFCFA(o.registration_fee || 0)}</span>
                      <span>Réinsc: {formatFCFA(o.re_registration_fee || 0)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Frais Généraux */}
      <Dialog open={isGeneralModalOpen} onOpenChange={setIsGeneralModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Modifier les frais généraux</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gen-reg" className="text-sm">Frais d'inscription</Label>
              <div className="relative">
                <Input id="gen-reg" type="number" min={0} value={generalRegInput} onChange={(e) => setGeneralRegInput(Number(e.target.value)||0)} className="pr-14 text-sm" />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 pointer-events-none">FCFA</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-renew" className="text-sm">Frais de réinscription</Label>
              <div className="relative">
                <Input id="gen-renew" type="number" min={0} value={generalRenewInput} onChange={(e) => setGeneralRenewInput(Number(e.target.value)||0)} className="pr-14 text-sm" />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400 pointer-events-none">FCFA</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsGeneralModalOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={saveGeneralFees} disabled={isSavingGeneral}>
              <Save className="h-4 w-4 mr-1.5" />{isSavingGeneral ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Frais Spécifiques */}
      <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Frais spécifiques par Cycle / Niveau</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Ces frais remplacent les frais généraux pour le cycle ou niveau sélectionné.</p>
          <div className="space-y-4 py-2">
            <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-md border">
              <div className="space-y-1.5">
                <Label className="text-xs">Cycle ou Niveau</Label>
                <select value={overrideIdInput} onChange={(e) => setOverrideIdInput(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Sélectionner un cycle ou niveau...</option>
                  {allItems.filter(i => !overrides.find(o => o.scope_id === i.id)).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Inscription (FCFA)</Label>
                  <Input type="number" min={0} value={overrideRegInput} onChange={(e)=>setOverrideRegInput(Number(e.target.value)||0)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Réinscription (FCFA)</Label>
                  <Input type="number" min={0} value={overrideRenewInput} onChange={(e)=>setOverrideRenewInput(Number(e.target.value)||0)} className="h-9 text-sm" />
                </div>
              </div>
              <Button size="sm" onClick={addOverride} disabled={!overrideIdInput || isSavingOverride} className="w-full mt-1">
                <Plus className="h-4 w-4 mr-1.5" /> Ajouter l'exception
              </Button>
            </div>

            {overrides.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucun frais spécifique configuré.</p>
            ) : (
              <div className="divide-y border rounded-md max-h-[40vh] overflow-y-auto">
                {overrides.map((o) => {
                  const item = allItems.find(i => i.id === o.scope_id)
                  return (
                    <div key={o.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{item?.name || o.scope_id}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex gap-3">
                          <span>Insc: {formatFCFA(o.registration_fee || 0)}</span>
                          <span>Réinsc: {formatFCFA(o.re_registration_fee || 0)}</span>
                        </p>
                      </div>
                      <button onClick={() => deleteOverride(o.id)} className="text-gray-400 hover:text-red-500 ml-3 shrink-0 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsOverrideModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
