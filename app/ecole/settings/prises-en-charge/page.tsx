"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Building2, Users, Percent, Plus, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"

type Tab = "organismes" | "couverture" | "familles" | "reductions"
type Organization = { id: string; name: string; organization_type: string; reference: string | null; contact_name: string | null; phone: string | null; email: string | null; active: boolean; is_state: boolean }
type CoverageRule = { id: string; organization_id: string; category: string; option_type: string | null; coverage_percent: number; active: boolean; grade_level_id: string | null; academic_year_id: string | null; valid_from: string | null; valid_until: string | null }
type DiscountRule = { id: string; name: string; min_children: number; max_children: number | null; discount_type: "percentage" | "fixed"; discount_value: number; applies_to_categories: string[]; option_type: string | null; active: boolean; stackable: boolean; academic_year_id: string | null; valid_from: string | null; valid_until: string | null }
type AcademicYearOption = { id: string; name: string; status: string; start_date: string }
type GradeLevelOption = { id: string; name: string; active: boolean; display_order: number }
type FamilyRow = { id: string; family_code: string; display_name: string | null; members?: Array<{ id: string; relationship: string | null; active: boolean; student?: { first_name: string; last_name: string; student_number: string | null } | null }> }
const CATEGORIES = [
  { value: "registration", label: "Frais d'inscription" }, { value: "tuition", label: "Scolarité" },
  { value: "option", label: "Options scolaires" }, { value: "caution", label: "Caution" }, { value: "other", label: "Autres frais" },
]
const TYPES = [
  { value: "ngo", label: "ONG" }, { value: "association", label: "Association" },
  { value: "company", label: "Entreprise" }, { value: "institution", label: "Institution" }, { value: "other", label: "Autre organisme" },
]
const money = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"
const OPTION_TYPE_LABELS: Record<string, string> = { tenue: "Tenue / uniforme", transport: "Transport", cantine: "Cantine", assurance: "Assurance", cooperative: "Coopérative", activite_parascolaire: "Activité parascolaire" }
const optionTypeLabel = (value: string) => OPTION_TYPE_LABELS[value] || value.replaceAll("_", " ")

export default function PrisesEnChargeSettingsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [tab, setTab] = useState<Tab>("organismes")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [rules, setRules] = useState<CoverageRule[]>([])
  const [optionTypes, setOptionTypes] = useState<string[]>([])
  const [discounts, setDiscounts] = useState<DiscountRule[]>([])
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([])
  const [orgName, setOrgName] = useState("")
  const [orgType, setOrgType] = useState("ngo")
  const [orgReference, setOrgReference] = useState("")
  const [orgContact, setOrgContact] = useState("")
  const [orgPhone, setOrgPhone] = useState("")
  const [orgEmail, setOrgEmail] = useState("")
  const [ruleOrgId, setRuleOrgId] = useState("")
  const [ruleCategory, setRuleCategory] = useState("tuition")
  const [rulePercent, setRulePercent] = useState("50")
  const [ruleOptionType, setRuleOptionType] = useState("all")
  const [ruleAcademicYearId, setRuleAcademicYearId] = useState("")
  const [ruleGradeLevelId, setRuleGradeLevelId] = useState("")
  const [ruleValidFrom, setRuleValidFrom] = useState("")
  const [ruleValidUntil, setRuleValidUntil] = useState("")
  const [discountName, setDiscountName] = useState("")
  const [minChildren, setMinChildren] = useState("2")
  const [maxChildren, setMaxChildren] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("5")
  const [discountCategory, setDiscountCategory] = useState("tuition")
  const [discountOptionType, setDiscountOptionType] = useState("all")
  const [discountAcademicYearId, setDiscountAcademicYearId] = useState("")
  const [discountValidFrom, setDiscountValidFrom] = useState("")
  const [discountValidUntil, setDiscountValidUntil] = useState("")

  const load = useCallback(async () => {
    if (!establishmentId) return
    setLoading(true)
    try {
      const results = await Promise.all([
        supabaseBrowser.from("sponsoring_organizations").select("id,name,organization_type,reference,contact_name,phone,email,active,is_state").eq("establishment_id", establishmentId).order("name"),
        supabaseBrowser.from("organization_coverage_rules").select("id,organization_id,category,option_type,coverage_percent,active,grade_level_id,academic_year_id,valid_from,valid_until").eq("establishment_id", establishmentId).order("category"),
        supabaseBrowser.from("family_discount_rules").select("id,name,min_children,max_children,discount_type,discount_value,applies_to_categories,option_type,active,stackable,academic_year_id,valid_from,valid_until").eq("establishment_id", establishmentId).order("min_children"),
        supabaseBrowser.from("school_families").select("id,family_code,display_name,members:student_family_members(id,relationship,active,student:students(first_name,last_name,student_number))").eq("establishment_id", establishmentId).order("created_at", { ascending: false }).limit(100),
        supabaseBrowser.from("student_options").select("option_type").eq("establishment_id", establishmentId).eq("active", true),
        supabaseBrowser.from("academic_years").select("id,name,status,start_date").eq("establishment_id", establishmentId).order("start_date", { ascending: false }),
        supabaseBrowser.from("grade_levels").select("id,name,active,display_order").eq("active", true).order("display_order"),
      ])
      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
      setOrganizations((results[0].data ?? []) as Organization[])
      setRules((results[1].data ?? []) as CoverageRule[])
      setDiscounts((results[2].data ?? []) as DiscountRule[])
      setFamilies((results[3].data ?? []) as FamilyRow[])
      setOptionTypes(Array.from(new Set((results[4].data ?? []).map((row: any) => String(row.option_type || "")).filter(Boolean))))
      setAcademicYears((results[5].data ?? []) as AcademicYearOption[])
      setGradeLevels((results[6].data ?? []) as GradeLevelOption[])
      if (!ruleOrgId && results[0].data?.[0]?.id) setRuleOrgId(results[0].data[0].id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les paramètres.")
    } finally { setLoading(false) }
  }, [establishmentId, ruleOrgId])
  useEffect(() => { void load() }, [load])

  const activeOrganizations = useMemo(() => organizations.filter((item) => item.active && !item.is_state), [organizations])

  const createOrganization = async () => {
    if (!establishmentId || !orgName.trim()) { toast.error("Le nom de l'organisme est obligatoire."); return }
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("sponsoring_organizations").insert({
        establishment_id: establishmentId, name: orgName.trim(), organization_type: orgType,
        reference: orgReference.trim() || null, contact_name: orgContact.trim() || null,
        phone: orgPhone.trim() || null, email: orgEmail.trim() || null, active: true, is_state: false,
      })
      if (error) throw error
      setOrgName(""); setOrgReference(""); setOrgContact(""); setOrgPhone(""); setOrgEmail("")
      toast.success("Organisme ajouté."); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d'ajouter l'organisme.") }
    finally { setSaving(false) }
  }

  const saveCoverageRule = async () => {
    if (!establishmentId || !ruleOrgId) { toast.error("Choisissez un organisme."); return }
    const percent = Number(rulePercent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) { toast.error("Le taux doit être compris entre 0 et 100 %."); return }
    setSaving(true)
    try {
      const selectedOptionType = ruleCategory === "option" && ruleOptionType !== "all" ? ruleOptionType : null
      if (ruleValidFrom && ruleValidUntil && ruleValidUntil < ruleValidFrom) { toast.error("La date de fin doit être postérieure ou égale à la date de début."); return }
      const existing = rules.find((r) => r.organization_id === ruleOrgId && r.category === ruleCategory && (r.option_type ?? null) === selectedOptionType && (r.grade_level_id ?? "") === ruleGradeLevelId && (r.academic_year_id ?? "") === ruleAcademicYearId)
      const payload = { establishment_id: establishmentId, organization_id: ruleOrgId, category: ruleCategory, option_type: selectedOptionType, coverage_percent: percent, active: true, grade_level_id: ruleGradeLevelId || null, academic_year_id: ruleAcademicYearId || null, valid_from: ruleValidFrom || null, valid_until: ruleValidUntil || null }
      const result = existing
        ? await supabaseBrowser.from("organization_coverage_rules").update(payload).eq("id", existing.id)
        : await supabaseBrowser.from("organization_coverage_rules").insert(payload)
      if (result.error) throw result.error
      toast.success("Règle de prise en charge enregistrée."); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer la règle.") }
    finally { setSaving(false) }
  }

  const createDiscount = async () => {
    if (!establishmentId || !discountName.trim()) { toast.error("Donnez un nom à la réduction."); return }
    const min = Number(minChildren); const max = maxChildren ? Number(maxChildren) : null; const value = Number(discountValue)
    if (!Number.isInteger(min) || min < 2 || (max !== null && (!Number.isInteger(max) || max < min))) { toast.error("Vérifiez le nombre minimum et maximum d'enfants."); return }
    if (!Number.isFinite(value) || value <= 0 || (discountType === "percentage" && value > 100)) { toast.error("Valeur de réduction invalide."); return }
    if (discountValidFrom && discountValidUntil && discountValidUntil < discountValidFrom) { toast.error("La date de fin doit être postérieure ou égale à la date de début."); return }
    setSaving(true)
    try {
      const { error } = await supabaseBrowser.from("family_discount_rules").insert({
        establishment_id: establishmentId, name: discountName.trim(), min_children: min, max_children: max,
        discount_type: discountType, discount_value: value, applies_to_categories: [discountCategory], option_type: discountCategory === "option" && discountOptionType !== "all" ? discountOptionType : null, active: true, stackable: false, academic_year_id: discountAcademicYearId || null, valid_from: discountValidFrom || null, valid_until: discountValidUntil || null,
      })
      if (error) throw error
      setDiscountName(""); setDiscountAcademicYearId(""); setDiscountValidFrom(""); setDiscountValidUntil(""); toast.success("Réduction familiale créée."); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de créer la réduction.") }
    finally { setSaving(false) }
  }

  const toggleOrganization = async (item: Organization) => {
    const { error } = await supabaseBrowser.from("sponsoring_organizations").update({ active: !item.active }).eq("id", item.id).eq("establishment_id", establishmentId)
    if (error) toast.error("Impossible de modifier cet organisme.")
    else { toast.success(item.active ? "Organisme désactivé." : "Organisme réactivé."); await load() }
  }
  const toggleDiscount = async (item: DiscountRule) => {
    const { error } = await supabaseBrowser.from("family_discount_rules").update({ active: !item.active }).eq("id", item.id).eq("establishment_id", establishmentId)
    if (error) toast.error("Impossible de modifier cette réduction.")
    else { toast.success(item.active ? "Réduction désactivée." : "Réduction réactivée."); await load() }
  }

  if (!establishmentId) return <main className="p-6"><p className="text-sm text-slate-600">Sélectionnez un établissement pour gérer les prises en charge.</p></main>
  const tabs: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
    { id: "organismes", label: "Organismes", icon: Building2 }, { id: "couverture", label: "Taux de couverture", icon: Percent },
    { id: "familles", label: "Familles", icon: Users }, { id: "reductions", label: "Réductions familiales", icon: Percent },
  ]

  return <main className="space-y-5 p-4 md:p-6">
    <header className="border-b border-slate-200 pb-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border bg-white"><Building2 className="h-5 w-5" /></div><div><h1 className="text-xl font-semibold text-slate-900">Prises en charge et réductions</h1><p className="mt-1 text-sm text-slate-500">Organismes financeurs, taux par catégorie et réductions selon le nombre d'enfants d'une même famille.</p></div></div></header>
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" aria-label="Sections des prises en charge">
      {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={"inline-flex items-center gap-2 border px-3 py-2 text-sm " + (tab === item.id ? "border-[#00236f] bg-[#00236f] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}><Icon className="h-4 w-4" />{item.label}</button> })}
    </nav>
    {loading && <p className="text-sm text-slate-500">Actualisation des données…</p>}

    {tab === "organismes" && <section className="space-y-4">
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Ajouter un organisme</h2><p className="mt-1 text-xs text-slate-500">Ex. ONG, association, entreprise ou institution partenaire.</p></div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <div className="space-y-1"><Label>Nom de l'organisme *</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Ex. Association Solidarité Éducation" /></div>
          <div className="space-y-1"><Label>Type</Label><select value={orgType} onChange={(e) => setOrgType(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="space-y-1"><Label>Référence de convention</Label><Input value={orgReference} onChange={(e) => setOrgReference(e.target.value)} placeholder="Facultatif" /></div>
          <div className="space-y-1"><Label>Personne à contacter</Label><Input value={orgContact} onChange={(e) => setOrgContact(e.target.value)} /></div>
          <div className="space-y-1"><Label>Téléphone</Label><Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} /></div>
          <div className="md:col-span-2"><Button onClick={createOrganization} disabled={saving}><Plus className="mr-2 h-4 w-4" />Ajouter l'organisme</Button></div>
        </div>
      </div>
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Organismes enregistrés ({organizations.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Organisme</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Référence</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{organizations.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{TYPES.find((t) => t.value === item.organization_type)?.label ?? item.organization_type}</td><td className="px-4 py-3">{item.reference || "—"}</td><td className="px-4 py-3">{item.contact_name || item.phone || item.email || "—"}</td><td className="px-4 py-3">{item.active ? "Actif" : "Inactif"}</td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => void toggleOrganization(item)}>{item.active ? "Désactiver" : "Réactiver"}</Button></td></tr>)}{organizations.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun organisme enregistré.</td></tr>}</tbody></table></div></div>
    </section>}

    {tab === "couverture" && <section className="space-y-4">
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Définir une part prise en charge</h2><p className="mt-1 text-xs text-slate-500">100 % signifie que l'organisme couvre toute la catégorie; le solde reste à la charge de la famille.</p></div>
        <div className="grid gap-3 p-4 md:grid-cols-3"><div className="space-y-1"><Label>Organisme</Label><select value={ruleOrgId} onChange={(e) => setRuleOrgId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Sélectionner</option>{activeOrganizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div><div className="space-y-1"><Label>Catégorie de frais</Label><select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>{ruleCategory === "option" && <div className="space-y-1"><Label>Type d'option</Label><select value={ruleOptionType} onChange={(e) => setRuleOptionType(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="all">Toutes les options scolaires</option>{optionTypes.map((type) => <option key={type} value={type}>{optionTypeLabel(type)}</option>)}</select></div>}<div className="space-y-1"><Label>Année scolaire</Label><select value={ruleAcademicYearId} onChange={(e) => setRuleAcademicYearId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Toutes les années</option>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div><div className="space-y-1"><Label>Niveau (facultatif)</Label><select value={ruleGradeLevelId} onChange={(e) => setRuleGradeLevelId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Tous les niveaux</option>{gradeLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}</select></div><div className="space-y-1"><Label>Valable à partir du</Label><Input type="date" value={ruleValidFrom} onChange={(e) => setRuleValidFrom(e.target.value)} /></div><div className="space-y-1"><Label>Valable jusqu’au</Label><Input type="date" value={ruleValidUntil} onChange={(e) => setRuleValidUntil(e.target.value)} /></div><div className="space-y-1"><Label>Taux de couverture (%)</Label><Input type="number" min={0} max={100} step={1} value={rulePercent} onChange={(e) => setRulePercent(e.target.value)} /></div><div className="md:col-span-3"><Button onClick={saveCoverageRule} disabled={saving || !activeOrganizations.length}><Save className="mr-2 h-4 w-4" />Enregistrer la règle</Button></div></div>
      </div>
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Règles de couverture ({rules.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Organisme</th><th className="px-4 py-3">Frais concernés</th><th className="px-4 py-3">Couverture</th><th className="px-4 py-3">Statut</th></tr></thead><tbody className="divide-y">{rules.map((r) => <tr key={r.id}><td className="px-4 py-3">{organizations.find((o) => o.id === r.organization_id)?.name || "Organisme inconnu"}</td><td className="px-4 py-3">{CATEGORIES.find((c) => c.value === r.category)?.label || r.category}{r.option_type ? " — " + optionTypeLabel(r.option_type) : ""}<span className="block text-xs text-slate-500">{[academicYears.find((y) => y.id === r.academic_year_id)?.name, gradeLevels.find((g) => g.id === r.grade_level_id)?.name].filter(Boolean).join(" · ") || "Toutes les années / tous les niveaux"}{r.valid_from || r.valid_until ? " · " + (r.valid_from || "début libre") + " → " + (r.valid_until || "sans fin") : ""}</span></td><td className="px-4 py-3 font-semibold">{r.coverage_percent}%</td><td className="px-4 py-3">{r.active ? "Active" : "Inactive"}</td></tr>)}{rules.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucune règle de couverture configurée.</td></tr>}</tbody></table></div></div>
    </section>}

    {tab === "familles" && <section className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Familles reconnues ({families.length})</h2><p className="mt-1 text-xs text-slate-500">Une famille est créée lorsqu'un enfant est explicitement associé à un frère, une sœur ou un autre enfant depuis la modal d'inscription.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Code famille</th><th className="px-4 py-3">Enfants rattachés</th><th className="px-4 py-3">Effectif</th></tr></thead><tbody className="divide-y">{families.map((family) => { const children = (family.members ?? []).filter((m) => m.active && m.student); return <tr key={family.id}><td className="px-4 py-3 font-medium">{family.family_code}</td><td className="px-4 py-3">{children.map((m) => (m.student?.first_name || "") + " " + (m.student?.last_name || "")).join(", ") || "Aucun enfant associé"}</td><td className="px-4 py-3">{children.length}</td></tr> })}{families.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Aucune famille rattachée pour le moment.</td></tr>}</tbody></table></div></section>}

    {tab === "reductions" && <section className="space-y-4">
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Créer un barème familial</h2><p className="mt-1 text-xs text-slate-500">Le barème s'applique à l'enfant inscrit lorsque sa famille atteint le nombre d'enfants éligibles. Pour un même frais, un seul barème familial est retenu. La règle appliquée est conservée dans l'historique financier.</p></div>
        <div className="grid gap-3 p-4 md:grid-cols-2"><div className="space-y-1"><Label>Nom de la réduction *</Label><Input value={discountName} onChange={(e) => setDiscountName(e.target.value)} placeholder="Ex. Famille de 3 enfants" /></div><div className="space-y-1"><Label>Catégorie concernée</Label><select value={discountCategory} onChange={(e) => setDiscountCategory(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{CATEGORIES.filter((c) => c.value !== "caution").map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>{discountCategory === "option" && <div className="space-y-1"><Label>Type d'option</Label><select value={discountOptionType} onChange={(e) => setDiscountOptionType(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="all">Toutes les options scolaires</option>{optionTypes.map((type) => <option key={type} value={type}>{optionTypeLabel(type)}</option>)}</select></div>}<div className="space-y-1"><Label>Nombre minimum d'enfants</Label><Input type="number" min={2} step={1} value={minChildren} onChange={(e) => setMinChildren(e.target.value)} /></div><div className="space-y-1"><Label>Nombre maximum (facultatif)</Label><Input type="number" min={2} step={1} value={maxChildren} onChange={(e) => setMaxChildren(e.target.value)} placeholder="Sans limite" /></div><div className="space-y-1"><Label>Type</Label><select value={discountType} onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="percentage">Pourcentage (%)</option><option value="fixed">Montant fixe par échéance (FCFA)</option></select></div><div className="space-y-1"><Label>Valeur</Label><Input type="number" min={0} step={discountType === "percentage" ? 1 : 100} max={discountType === "percentage" ? 100 : undefined} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} /></div><div className="space-y-1"><Label>Année scolaire</Label><select value={discountAcademicYearId} onChange={(e) => setDiscountAcademicYearId(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="">Toutes les années</option>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div><div className="space-y-1"><Label>Valable à partir du</Label><Input type="date" value={discountValidFrom} onChange={(e) => setDiscountValidFrom(e.target.value)} /></div><div className="space-y-1"><Label>Valable jusqu’au</Label><Input type="date" value={discountValidUntil} onChange={(e) => setDiscountValidUntil(e.target.value)} /></div><div className="md:col-span-2"><Button onClick={createDiscount} disabled={saving}><Plus className="mr-2 h-4 w-4" />Créer le barème</Button></div></div>
      </div>
      <div className="border border-slate-200 bg-white"><div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Barèmes configurés ({discounts.length})</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Barème</th><th className="px-4 py-3">Enfants requis</th><th className="px-4 py-3">Réduction</th><th className="px-4 py-3">Frais</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y">{discounts.map((d) => <tr key={d.id}><td className="px-4 py-3 font-medium">{d.name}</td><td className="px-4 py-3">{d.min_children}{d.max_children ? " à " + d.max_children : " et plus"}</td><td className="px-4 py-3">{d.discount_type === "percentage" ? d.discount_value + "%" : money(d.discount_value)}</td><td className="px-4 py-3">{(d.applies_to_categories ?? []).map((c) => CATEGORIES.find((x) => x.value === c)?.label || c).join(", ")}{d.option_type ? " — " + optionTypeLabel(d.option_type) : ""}<span className="block text-xs text-slate-500">{academicYears.find((y) => y.id === d.academic_year_id)?.name || "Toutes les années"}{d.valid_from || d.valid_until ? " · " + (d.valid_from || "début libre") + " → " + (d.valid_until || "sans fin") : ""}</span></td><td className="px-4 py-3">{d.active ? "Actif" : "Inactif"}</td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => void toggleDiscount(d)}>{d.active ? "Désactiver" : "Réactiver"}</Button></td></tr>)}{discounts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucune réduction configurée.</td></tr>}</tbody></table></div></div>
    </section>}
    <div className="flex justify-end"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button></div>
  </main>
}
