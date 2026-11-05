"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabaseBrowser } from "@/lib/supabase/client"

type YearOption = { id: string; name: string; status: string }
type LevelOption = { id: string; name: string; active: boolean }
type Promotion = {
  id: string
  name: string
  promotion_type: "fixed_price" | "percentage"
  promotion_value: number
  grade_level_ids: string[]
  academic_year_id: string | null
  valid_from: string
  valid_until: string
  active: boolean
}
type Props = { establishmentId: string; academicYears: YearOption[]; gradeLevels: LevelOption[]; onChanged: () => Promise<void> }
const money = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"

export default function SchoolPromotionsPanel({ establishmentId, academicYears, gradeLevels, onChanged }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [promotionType, setPromotionType] = useState<"fixed_price" | "percentage">("fixed_price")
  const [value, setValue] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [academicYearId, setAcademicYearId] = useState(academicYears.find((y) => y.status === "active")?.id ?? "")
  const [gradeLevelIds, setGradeLevelIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBrowser.from("school_promotions")
        .select("id,name,promotion_type,promotion_value,grade_level_ids,academic_year_id,valid_from,valid_until,active")
        .eq("establishment_id", establishmentId).order("created_at", { ascending: false })
      if (error) throw error
      setPromotions((data ?? []) as Promotion[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les promotions.")
    } finally { setLoading(false) }
  }, [establishmentId])

  useEffect(() => { void load() }, [load])

  const resetForm = () => {
    setName(""); setPromotionType("fixed_price"); setValue(""); setValidFrom(""); setValidUntil("")
    setAcademicYearId(academicYears.find((y) => y.status === "active")?.id ?? "")
    setGradeLevelIds([])
  }

  const createPromotion = async () => {
    const amount = Number(value)
    if (!name.trim()) return toast.error("Donnez un nom à la promotion.")
    if (!validFrom || !validUntil || validUntil < validFrom) return toast.error("Définissez une période valide.")
    if (!Number.isFinite(amount) || amount <= 0 || (promotionType === "percentage" && amount > 100)) return toast.error("Vérifiez la valeur de la promotion.")
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("school_promotions").insert({
        establishment_id: establishmentId, name: name.trim(), promotion_type: promotionType,
        promotion_value: amount, grade_level_ids: gradeLevelIds, academic_year_id: academicYearId || null,
        valid_from: validFrom, valid_until: validUntil, active: true,
      })
      if (error) throw error
      toast.success("Promotion scolaire créée.")
      setOpen(false); resetForm(); await load(); await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la promotion.")
    } finally { setSaving(false) }
  }

  const togglePromotion = async (promotion: Promotion) => {
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("school_promotions")
        .update({ active: !promotion.active, updated_at: new Date().toISOString() })
        .eq("id", promotion.id).eq("establishment_id", establishmentId)
      if (error) throw error
      toast.success(promotion.active ? "Promotion désactivée." : "Promotion réactivée.")
      await load(); await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier la promotion.")
    } finally { setSaving(false) }
  }

  const today = new Date()
  const todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0")
  const status = (p: Promotion) => !p.active ? "Désactivée" : todayKey < p.valid_from ? "À venir" : todayKey > p.valid_until ? "Terminée" : "En cours"

  return <section className="space-y-4">
    <div className="flex flex-col gap-3 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-semibold">Promotions sur les frais d’inscription</h2><p className="mt-1 max-w-2xl text-xs text-slate-500">Offres temporaires pour tous les niveaux ou pour des niveaux sélectionnés. Le tarif normal du forfait scolaire reste inchangé.</p></div>
      <Button onClick={() => { resetForm(); setOpen(true) }}><Plus className="mr-2 h-4 w-4" />Nouvelle promotion</Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Créer une promotion scolaire</DialogTitle><DialogDescription>Elle sera appliquée automatiquement aux nouvelles inscriptions pendant la période définie.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Nom de la promotion *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Offre spéciale rentrée" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Type de promotion</Label><select value={promotionType} onChange={(e) => setPromotionType(e.target.value as "fixed_price" | "percentage")} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="fixed_price">Prix promotionnel fixe</option><option value="percentage">Remise en pourcentage</option></select></div>
            <div className="space-y-1"><Label>{promotionType === "fixed_price" ? "Nouveau prix (FCFA) *" : "Remise (%) *"}</Label><Input type="number" min="1" max={promotionType === "percentage" ? "100" : undefined} step="1" value={value} onChange={(e) => setValue(e.target.value)} placeholder={promotionType === "fixed_price" ? "35000" : "20"} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Date de début *</Label><Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>Date de fin *</Label><Input type="date" min={validFrom || undefined} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Année scolaire</Label><select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Toutes les années</option>{academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}{y.status === "active" ? " (active)" : ""}</option>)}</select></div>
          <div className="space-y-2"><Label>Niveaux concernés</Label><p className="text-xs text-slate-500">Aucun niveau sélectionné = tous les niveaux.</p><div className="grid max-h-40 gap-2 overflow-y-auto border border-slate-200 p-3 sm:grid-cols-2">{gradeLevels.map((level) => <label key={level.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gradeLevelIds.includes(level.id)} onChange={(e) => setGradeLevelIds((current) => e.target.checked ? [...current, level.id] : current.filter((id) => id !== level.id))} />{level.name}</label>)}</div></div>
          {value && Number(value) > 0 && <p className="border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">{promotionType === "fixed_price" ? "Le prix des frais sera plafonné à " + money(Number(value)) + "." : "Une remise de " + Number(value) + " % sera calculée sur le tarif normal."}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button disabled={saving} onClick={createPromotion}>{saving ? "Enregistrement…" : "Créer la promotion"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Promotion</th><th className="px-4 py-3">Offre</th><th className="px-4 py-3">Période</th><th className="px-4 py-3">Niveaux</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Action</th></tr></thead>
        <tbody className="divide-y">{promotions.map((p) => <tr key={p.id}><td className="px-4 py-3 font-medium">{p.name}<span className="block text-xs font-normal text-slate-500">{academicYears.find((y) => y.id === p.academic_year_id)?.name ?? "Toutes les années"}</span></td><td className="px-4 py-3">{p.promotion_type === "fixed_price" ? "Prix : " + money(Number(p.promotion_value)) : "-" + Number(p.promotion_value) + " %"}</td><td className="px-4 py-3 text-xs">{p.valid_from} → {p.valid_until}</td><td className="px-4 py-3">{p.grade_level_ids?.length ? p.grade_level_ids.map((id) => gradeLevels.find((l) => l.id === id)?.name ?? "Niveau").join(", ") : "Tous les niveaux"}</td><td className="px-4 py-3">{status(p)}</td><td className="px-4 py-3"><Button size="sm" variant="outline" disabled={saving} onClick={() => togglePromotion(p)}>{p.active ? "Désactiver" : "Activer"}</Button></td></tr>)}
        {!loading && promotions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucune promotion configurée.</td></tr>}
        {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Chargement…</td></tr>}</tbody>
      </table>
    </div>
  </section>
}
