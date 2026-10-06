"use client"

import { useEffect, useState } from "react"
import { Activity, Bus, Coffee, Plus, Shield, Shirt, Trash2, Utensils } from "lucide-react"
import { serviceOptions } from "@/services/options.service"
import type { OptionScolaire } from "@/services/options.service"

const TYPE_OPTIONS = [
  { value: "cantine", label: "Cantine", icon: Utensils },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "tenue", label: "Tenue", icon: Shirt },
  { value: "assurance", label: "Assurance", icon: Shield },
  { value: "activite_parascolaire", label: "Activité parascolaire", icon: Activity },
  { value: "cooperative", label: "Coopérative", icon: Coffee },
] as const

export default function OptionsPage() {
  const [options, setOptions] = useState<OptionScolaire[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState("tous")
  const [nouvelleOption, setNouvelleOption] = useState({
    nom: "", type: "cantine" as OptionScolaire["type"], prix: 0, description: "", obligatoire: false, actif: true,
  })

  const refresh = () => setOptions(serviceOptions.obtenirToutesLesOptions())

  useEffect(() => {
    serviceOptions.initialiserOptionsParDefaut()
    refresh()
  }, [])

  const handleAjouterOption = () => {
    if (!nouvelleOption.nom || nouvelleOption.prix <= 0) {
      alert("Veuillez remplir le nom et le prix")
      return
    }
    serviceOptions.creerOption(nouvelleOption)
    refresh()
    setShowAddModal(false)
    setNouvelleOption({ nom: "", type: "cantine", prix: 0, description: "", obligatoire: false, actif: true })
  }

  const handleSupprimerOption = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette option ?")) {
      serviceOptions.supprimerOption(id)
      refresh()
    }
  }

  const handleActiverDesactiver = (id: string, actif: boolean) => {
    serviceOptions.mettreAJourOption(id, { actif })
    refresh()
  }

  const filtered = filterType === "tous" ? options : options.filter((o) => o.type === filterType)
  const totalOptions = options.length
  const optionsActives = options.filter((o) => o.actif).length
  const coutMoyen = options.length ? Math.round(options.reduce((sum, o) => sum + o.prix, 0) / options.length) : 0
  const getType = (type: OptionScolaire["type"]) => TYPE_OPTIONS.find((t) => t.value === type)
  const formatMoney = (value: number) => value.toLocaleString("fr-FR")

  return (
    <div className="w-full min-w-0 text-[#131b2e]">
      <header className="border-b border-[#c5c5d3]/60 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#00236f]" />
              <h1 className="text-[23px] font-semibold leading-7 tracking-[-0.01em]">Gestion des Options Scolaires</h1>
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-[#515f74]">Cantine, transport, tenue, assurance et activités scolaires</p>
          </div>
          <button type="button" onClick={() => setShowAddModal(true)} className="inline-flex h-8 items-center justify-center gap-1.5 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white hover:bg-[#00236f]">
            <Plus className="h-3.5 w-3.5" /> Nouvelle option
          </button>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-2 border border-[#c5c5d3]/50 bg-white lg:grid-cols-3">
        {[
          { label: "Total options", value: totalOptions, icon: Activity, tone: "text-[#00236f] bg-[#dce1ff]" },
          { label: "Options actives", value: optionsActives, icon: Shield, tone: "text-[#166534] bg-[#dcfce7]" },
          { label: "Coût moyen", value: `${formatMoney(coutMoyen)} FCFA`, icon: Coffee, tone: "text-[#7a5600] bg-[#fff7dc]" },
        ].map((item, index) => {
          const Icon = item.icon
          return <div key={item.label} className={`flex min-h-[70px] items-center justify-between border-b border-[#c5c5d3]/45 p-3 ${index < 2 ? "lg:border-r" : ""} ${index === 0 ? "border-r" : ""} lg:border-b-0`}>
            <div><p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#515f74]">{item.label}</p><p className="mt-1 text-[21px] font-semibold tabular-nums">{item.value}</p></div>
            <span className={`flex h-8 w-8 items-center justify-center ${item.tone}`}><Icon className="h-4 w-4" /></span>
          </div>
        })}
      </section>

      <section className="mt-3 overflow-hidden border border-[#c5c5d3]/45 bg-white">
        <div className="flex flex-col gap-2 bg-[#f2f3ff] p-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-[11px] font-medium text-[#515f74]">Type :</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 min-w-[190px] rounded border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]">
              <option value="tous">Tous les types</option>
              {TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <span className="text-[11px] text-[#515f74] sm:ml-auto">{filtered.length} option(s) affichée(s)</span>
        </div>

        <div className="divide-y divide-[#c5c5d3]/35">
          {filtered.length === 0 ? <div className="px-3 py-10 text-center text-[12px] text-[#515f74]">Aucune option trouvée</div> :
            filtered.map((option) => {
              const type = getType(option.type)
              const Icon = type?.icon ?? Activity
              return <article key={option.id} className="flex flex-col gap-3 p-3 hover:bg-[#f2f3ff] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#c5c5d3]/60 bg-[#f2f3ff] text-[#00236f]"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{option.nom}</p>
                    <p className="mt-0.5 text-[11px] text-[#515f74]">{option.description || "Aucune description"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="bg-[#dce1ff] px-2 py-1 text-[#264191]">{type?.label || option.type}</span>
                      <span className={`px-2 py-1 ${option.obligatoire ? "bg-[#ffefed] text-[#ba1a1a]" : "bg-[#f2f3ff] text-[#515f74]"}`}>{option.obligatoire ? "Obligatoire" : "Optionnel"}</span>
                      <span className={`px-2 py-1 ${option.actif ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f2f3ff] text-[#515f74]"}`}>{option.actif ? "Actif" : "Inactif"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#c5c5d3]/35 pt-2 lg:min-w-[260px] lg:justify-end lg:border-t-0 lg:pt-0">
                  <p className="text-[14px] font-semibold tabular-nums">{formatMoney(option.prix)} FCFA</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => handleActiverDesactiver(option.id, !option.actif)} className="h-7 border border-[#c5c5d3] bg-white px-2.5 text-[10px] font-medium hover:bg-[#f2f3ff]">{option.actif ? "Désactiver" : "Activer"}</button>
                    <button type="button" onClick={() => handleSupprimerOption(option.id)} className="inline-flex h-7 w-7 items-center justify-center border border-[#c5c5d3] bg-white text-[#515f74] hover:bg-[#ffefed] hover:text-[#ba1a1a]" aria-label="Supprimer l'option"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </article>
            })}
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/45 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden border border-[#c5c5d3] bg-white">
            <div className="border-b border-[#c5c5d3]/60 bg-[#f7f8fb] px-4 py-3">
              <h2 className="text-[14px] font-semibold">Nouvelle option scolaire</h2>
              <p className="mt-0.5 text-[11px] text-[#515f74]">Configurer une option proposée par l'établissement</p>
            </div>
            <div className="grid gap-3 p-4">
              <Field label="Nom *"><input value={nouvelleOption.nom} onChange={(e) => setNouvelleOption({ ...nouvelleOption, nom: e.target.value })} placeholder="Ex. Cantine - repas complet" className="field" /></Field>
              <Field label="Type *"><select value={nouvelleOption.type} onChange={(e) => setNouvelleOption({ ...nouvelleOption, type: e.target.value as OptionScolaire["type"] })} className="field">{TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></Field>
              <Field label="Prix (FCFA) *"><input type="number" min="0" value={nouvelleOption.prix} onChange={(e) => setNouvelleOption({ ...nouvelleOption, prix: parseInt(e.target.value) || 0 })} placeholder="50000" className="field" /></Field>
              <Field label="Description"><input value={nouvelleOption.description} onChange={(e) => setNouvelleOption({ ...nouvelleOption, description: e.target.value })} placeholder="Description de l'option" className="field" /></Field>
              <label className="flex items-center gap-2 text-[11px] font-medium text-[#444651]"><input type="checkbox" checked={nouvelleOption.obligatoire} onChange={(e) => setNouvelleOption({ ...nouvelleOption, obligatoire: e.target.checked })} className="h-3.5 w-3.5" /> Obligatoire</label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#fafbfc] px-4 py-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="h-8 border border-[#c5c5d3] bg-white px-3 text-[11px] font-medium hover:bg-[#f2f3ff]">Annuler</button>
              <button type="button" onClick={handleAjouterOption} className="h-8 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white hover:bg-[#00236f]">Ajouter l'option</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .field { width: 100%; height: 32px; border: 1px solid rgba(197,197,211,.7); background: #fff; border-radius: 4px; padding: 0 10px; font-size: 12px; outline: none; color: #131b2e; }
        .field:focus { border-color: #00236f; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-[11px] font-medium text-[#444651]">{label}{children}</label>
}
