"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Plus, Shield, Trash2, Utensils, Bus, Shirt, Coffee } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { serviceOptions, type OptionScolaire } from "@/services/options.service"

const TYPE_OPTIONS = [
  { value: "cantine", label: "Cantine", icon: Utensils },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "tenue", label: "Tenue", icon: Shirt },
  { value: "assurance", label: "Assurance", icon: Shield },
  { value: "activite_parascolaire", label: "Activité parascolaire", icon: Activity },
  { value: "cooperative", label: "Coopérative", icon: Coffee },
  { value: "autre", label: "Autre", icon: Activity },
] as const

const emptyForm = {
  nom: "",
  type: "cantine" as OptionScolaire["type"],
  prix: 0,
  description: "",
  obligatoire: false,
  actif: true,
}

export default function OptionsScolairesSettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null
  const [options, setOptions] = useState<OptionScolaire[]>([])
  const [filterType, setFilterType] = useState("tous")
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(emptyForm)

  const refresh = async () => {
    if (!establishmentId) return
    setLoading(true)
    setError("")
    try {
      setOptions(await serviceOptions.obtenirToutesLesOptions(establishmentId))
    } catch (e) {
      setError((e as Error).message || "Impossible de charger les options scolaires.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [establishmentId])

  const filtered = useMemo(
    () => filterType === "tous" ? options : options.filter((option) => option.type === filterType),
    [options, filterType]
  )

  const activeCount = options.filter((option) => option.actif).length
  const average = options.length ? Math.round(options.reduce((sum, option) => sum + option.prix, 0) / options.length) : 0

  const submit = async () => {
    if (!establishmentId || !form.nom.trim() || form.prix < 0) return
    setSaving(true)
    setError("")
    try {
      await serviceOptions.creerOption(establishmentId, form)
      setForm(emptyForm)
      setShowModal(false)
      await refresh()
    } catch (e) {
      setError((e as Error).message || "Impossible d'enregistrer l'option.")
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (option: OptionScolaire) => {
    if (!establishmentId) return
    try {
      await serviceOptions.mettreAJourOption(establishmentId, option.id, { actif: !option.actif })
      await refresh()
    } catch (e) {
      setError((e as Error).message || "Impossible de modifier l'option.")
    }
  }

  const remove = async (option: OptionScolaire) => {
    if (!establishmentId || !confirm(`Supprimer « ${option.nom} » ?`)) return
    try {
      await serviceOptions.supprimerOption(establishmentId, option.id)
      await refresh()
    } catch (e) {
      setError((e as Error).message || "Impossible de supprimer l'option.")
    }
  }

  return (
    <div className="w-full min-w-0 bg-[#f7f8fc] text-[#172033]">
      <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <header className="border-b border-[#d7dae3] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">
                Configuration <span className="px-1">/</span> Paramètres <span className="px-1">/</span> Options scolaires
              </div>
              <h1 className="text-[24px] font-semibold leading-8 tracking-tight">Options scolaires</h1>
              <p className="mt-1 text-[13px] leading-5 text-[#5d6677]">
                Configurez les services et prestations proposés par l'établissement. Ces données sont enregistrées dans Supabase et utilisées par les inscriptions et la facturation.
              </p>
            </div>
            <button type="button" onClick={() => setShowModal(true)} className="inline-flex h-9 items-center justify-center gap-1.5 border border-[#173b8f] bg-[#173b8f] px-3 text-[11px] font-medium text-white hover:bg-[#123176]">
              <Plus className="h-3.5 w-3.5" /> Ajouter une option
            </button>
          </div>
        </header>

        {error && <div className="mt-3 border border-[#e5b7b7] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#9b2c2c]">{error}</div>}

        <section className="mt-4 grid grid-cols-2 border border-[#d7dae3] bg-white lg:grid-cols-3">
          <Stat label="Total options" value={options.length} />
          <Stat label="Options actives" value={activeCount} />
          <Stat label="Coût moyen" value={`${average.toLocaleString("fr-FR")} FCFA`} />
        </section>

        <section className="mt-3 overflow-hidden border border-[#d7dae3] bg-white">
          <div className="flex flex-col gap-2 bg-[#f2f3ff] p-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-[11px] font-medium text-[#515f74]">
              Type :
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 min-w-[190px] rounded border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#173b8f]">
                <option value="tous">Tous les types</option>
                {TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <span className="text-[11px] text-[#515f74] sm:ml-auto">{filtered.length} option(s) affichée(s)</span>
          </div>

          {loading ? (
            <div className="px-3 py-10 text-center text-[12px] text-[#515f74]">Chargement des options…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-[12px] text-[#515f74]">Aucune option configurée.</div>
          ) : (
            <div className="divide-y divide-[#d7dae3]/70">
              {filtered.map((option) => {
                const type = TYPE_OPTIONS.find((item) => item.value === option.type)
                const Icon = type?.icon ?? Activity
                return (
                  <article key={option.id} className="flex flex-col gap-3 p-3 hover:bg-[#f7f8fc] lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#d7dae3] bg-[#f2f3ff] text-[#173b8f]"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold">{option.nom}</p>
                        <p className="mt-0.5 text-[11px] text-[#5d6677]">{option.description || "Aucune description"}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="bg-[#dce1ff] px-2 py-1 text-[#264191]">{type?.label || "Autre"}</span>
                          <span className={`px-2 py-1 ${option.obligatoire ? "bg-[#ffefed] text-[#ba1a1a]" : "bg-[#f2f3ff] text-[#515f74]"}`}>{option.obligatoire ? "Obligatoire" : "Optionnel"}</span>
                          <span className={`px-2 py-1 ${option.actif ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f2f3ff] text-[#515f74]"}`}>{option.actif ? "Actif" : "Inactif"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#d7dae3]/70 pt-2 lg:min-w-[260px] lg:justify-end lg:border-t-0 lg:pt-0">
                      <p className="text-[14px] font-semibold tabular-nums">{option.prix.toLocaleString("fr-FR")} FCFA</p>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => void toggle(option)} className="h-7 border border-[#cfd3dc] bg-white px-2.5 text-[10px] font-medium hover:bg-[#f2f3ff]">{option.actif ? "Désactiver" : "Activer"}</button>
                        <button type="button" onClick={() => void remove(option)} className="inline-flex h-7 w-7 items-center justify-center border border-[#cfd3dc] bg-white text-[#515f74] hover:bg-[#ffefed] hover:text-[#ba1a1a]"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/45 p-3">
            <div className="w-full max-w-lg overflow-hidden border border-[#c5c5d3] bg-white">
              <div className="border-b border-[#d7dae3] bg-[#f7f8fb] px-4 py-3">
                <h2 className="text-[14px] font-semibold">Nouvelle option scolaire</h2>
                <p className="mt-0.5 text-[11px] text-[#5d6677]">Enregistrez une configuration propre à cet établissement.</p>
              </div>
              <div className="grid gap-3 p-4">
                <Field label="Nom *"><input className="field" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex. Cantine - repas complet" /></Field>
                <Field label="Type *"><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OptionScolaire["type"] })}>{TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
                <Field label="Prix (FCFA) *"><input className="field" type="number" min="0" value={form.prix} onChange={(e) => setForm({ ...form, prix: Number(e.target.value) || 0 })} /></Field>
                <Field label="Description"><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                <label className="flex items-center gap-2 text-[11px] font-medium text-[#444651]"><input type="checkbox" checked={form.obligatoire} onChange={(e) => setForm({ ...form, obligatoire: e.target.checked })} /> Obligatoire</label>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#d7dae3] bg-[#fafbfc] px-4 py-3">
                <button type="button" onClick={() => setShowModal(false)} className="h-8 border border-[#cfd3dc] bg-white px-3 text-[11px] font-medium">Annuler</button>
                <button type="button" disabled={saving || !form.nom.trim()} onClick={() => void submit()} className="h-8 border border-[#173b8f] bg-[#173b8f] px-3 text-[11px] font-medium text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .field { width: 100%; height: 32px; border: 1px solid rgba(197,197,211,.7); background: #fff; border-radius: 4px; padding: 0 10px; font-size: 12px; outline: none; color: #172033; }
        .field:focus { border-color: #173b8f; }
      `}</style>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="flex min-h-[70px] items-center justify-between border-b border-r border-[#d7dae3] p-3 last:border-r-0 lg:border-b-0"><div><p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#70798a]">{label}</p><p className="mt-1 text-[21px] font-semibold tabular-nums">{value}</p></div><span className="flex h-8 w-8 items-center justify-center bg-[#f2f3ff] text-[#173b8f]"><Activity className="h-4 w-4" /></span></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-[11px] font-medium text-[#444651]">{label}{children}</label>
}
