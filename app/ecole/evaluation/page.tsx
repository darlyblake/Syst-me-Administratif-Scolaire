"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Star, Trash2, TrendingUp } from "lucide-react"
import { serviceEvaluation } from "@/services/evaluation.service"
import { servicePersonnel } from "@/services/personnel.service"
import type { Evaluation } from "@/services/evaluation.service"

export default function EvaluationPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState("")
  const [selectedType, setSelectedType] = useState<Evaluation["type"]>("parent")
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState("")
  const [evaluateur, setEvaluateur] = useState("")
  const [criteres, setCriteres] = useState({ pedagogie: 5, ponctualite: 5, communication: 5, discipline: 5 })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("tous")

  const refresh = () => {
    setEvaluations(serviceEvaluation.obtenirToutesLesEvaluations())
    setPersonnel(servicePersonnel.obtenirToutLePersonnel())
  }

  useEffect(() => { refresh() }, [])

  const handleAjouterEvaluation = () => {
    if (!selectedPersonnel || !commentaire.trim()) {
      alert("Veuillez sélectionner un membre du personnel et ajouter un commentaire")
      return
    }
    serviceEvaluation.creerEvaluation({
      personnelId: selectedPersonnel,
      type: selectedType,
      date: new Date().toISOString(),
      note,
      commentaire,
      criteres,
      evaluateur: evaluateur || undefined,
    })
    refresh()
    setShowAddModal(false)
    setSelectedPersonnel("")
    setNote(5)
    setCommentaire("")
    setEvaluateur("")
    setCriteres({ pedagogie: 5, ponctualite: 5, communication: 5, discipline: 5 })
  }

  const handleSupprimerEvaluation = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette évaluation ?")) {
      serviceEvaluation.supprimerEvaluation(id)
      refresh()
    }
  }

  const getMember = (id: string) => personnel.find((p) => p.id === id)
  const filtered = evaluations.filter((evaluation) => {
    const member = getMember(evaluation.personnelId)
    const name = member ? `${member.prenom} ${member.nom}`.toLowerCase() : ""
    return (!searchTerm || name.includes(searchTerm.toLowerCase())) &&
      (filterType === "tous" || evaluation.type === filterType)
  })
  const stats = serviceEvaluation.obtenirStatistiquesGlobales()

  return (
    <div className="w-full min-w-0 text-[#131b2e]">
      <header className="border-b border-[#c5c5d3]/60 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#00236f]" />
              <h1 className="text-[23px] font-semibold leading-7 tracking-[-0.01em]">Évaluation du Personnel</h1>
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-[#515f74]">
              Suivi des évaluations du personnel par les parents et l'administration
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex h-8 items-center justify-center gap-1.5 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white hover:bg-[#00236f]"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvelle évaluation
          </button>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-2 border border-[#c5c5d3]/50 bg-white lg:grid-cols-3">
        {[
          { label: "Total évaluations", value: stats.total, tone: "text-[#00236f] bg-[#dce1ff]" },
          { label: "Moyenne générale", value: `${stats.moyenneGenerale}/5`, tone: "text-[#7a5600] bg-[#fff7dc]" },
          { label: "Évaluations parents", value: stats.parType.parent || 0, tone: "text-[#166534] bg-[#dcfce7]" },
        ].map((item, index) => (
          <div key={item.label} className={`flex min-h-[70px] items-center justify-between border-b border-[#c5c5d3]/45 p-3 ${index < 2 ? "lg:border-r" : ""} ${index === 0 ? "border-r" : ""} lg:border-b-0`}>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#515f74]">{item.label}</p>
              <p className="mt-1 text-[21px] font-semibold tabular-nums">{item.value}</p>
            </div>
            <span className={`flex h-8 w-8 items-center justify-center ${item.tone}`}>
              <Star className="h-4 w-4" />
            </span>
          </div>
        ))}
      </section>

      <section className="mt-3 overflow-hidden border border-[#c5c5d3]/45 bg-white">
        <div className="grid grid-cols-1 gap-2 bg-[#f2f3ff] p-2 md:grid-cols-12">
          <div className="relative md:col-span-7">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515f74]" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher par nom ou prénom…" className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white pl-8 pr-2.5 text-[12px] outline-none focus:border-[#00236f]" />
          </div>
          <div className="flex items-center gap-2 md:col-span-5">
            <label className="whitespace-nowrap text-[11px] font-medium text-[#515f74]">Type :</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]">
              <option value="tous">Tous les types</option>
              <option value="parent">Parents</option>
              <option value="administration">Administration</option>
            </select>
          </div>
        </div>

        <div className="border-b border-[#c5c5d3]/45 px-3 py-2 text-[11px] text-[#515f74]">
          {filtered.length} évaluation(s) affichée(s)
        </div>

        <div className="divide-y divide-[#c5c5d3]/35">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-[12px] text-[#515f74]">Aucune évaluation</div>
          ) : filtered.map((evaluation) => {
            const member = getMember(evaluation.personnelId)
            const statsMember = serviceEvaluation.calculerStatistiquesPersonnel(evaluation.personnelId)
            return (
              <article key={evaluation.id} className="p-3 hover:bg-[#f2f3ff]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[13px] font-semibold">{member ? `${member.prenom} ${member.nom}` : "Personnel inconnu"}</p>
                    <p className="mt-0.5 text-[11px] text-[#515f74]">{member?.poste || "Poste inconnu"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${star <= evaluation.note ? "fill-[#b58a24] text-[#b58a24]" : "text-[#c5c5d3]"}`} />)}</div>
                    <span className="text-[13px] font-semibold">{evaluation.note}/5</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 border border-[#c5c5d3]/45 bg-[#fafbfc] md:grid-cols-4">
                  {[
                    ["Pédagogie", evaluation.criteres.pedagogie],
                    ["Ponctualité", evaluation.criteres.ponctualite],
                    ["Communication", evaluation.criteres.communication],
                    ["Discipline", evaluation.criteres.discipline],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border-b border-r border-[#c5c5d3]/35 px-2.5 py-2 last:border-r-0 md:border-b-0">
                      <p className="text-[10px] uppercase tracking-[.03em] text-[#515f74]">{label}</p>
                      <p className="mt-0.5 text-[13px] font-semibold">{value}/5</p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[12px] leading-5 text-[#444651]">“{evaluation.commentaire}”</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#c5c5d3]/35 pt-2">
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="bg-[#dce1ff] px-2 py-1 text-[#264191]">{evaluation.type === "parent" ? "Parent" : "Administration"}</span>
                    <span className="bg-[#f2f3ff] px-2 py-1 text-[#515f74]">{new Date(evaluation.date).toLocaleDateString("fr-FR")}</span>
                    {evaluation.evaluateur && <span className="bg-[#f2f3ff] px-2 py-1 text-[#515f74]">Par : {evaluation.evaluateur}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#515f74]">
                    <span>Moyenne : <strong className="text-[#00236f]">{statsMember.moyenne}/5</strong> ({statsMember.nombre})</span>
                    <button type="button" onClick={() => handleSupprimerEvaluation(evaluation.id)} className="inline-flex h-7 w-7 items-center justify-center border border-[#c5c5d3] bg-white text-[#515f74] hover:bg-[#ffefed] hover:text-[#ba1a1a]" aria-label="Supprimer l'évaluation">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/45 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden border border-[#c5c5d3] bg-white">
            <div className="border-b border-[#c5c5d3]/60 bg-[#f7f8fb] px-4 py-3">
              <h2 className="text-[14px] font-semibold">Nouvelle évaluation</h2>
              <p className="mt-0.5 text-[11px] text-[#515f74]">Saisir une évaluation du personnel</p>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-4">
              <div className="grid gap-3">
                <Field label="Membre du personnel *">
                  <select value={selectedPersonnel} onChange={(e) => setSelectedPersonnel(e.target.value)} className="field"><option value="">Sélectionner</option>{personnel.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select>
                </Field>
                <Field label="Type d'évaluation *">
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as Evaluation["type"])} className="field"><option value="parent">Parent</option><option value="administration">Administration</option></select>
                </Field>
                <Field label="Évaluateur (optionnel)"><input value={evaluateur} onChange={(e) => setEvaluateur(e.target.value)} placeholder="Nom de l'évaluateur" className="field" /></Field>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-[#444651]">Notes par critère (1–5)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([["pedagogie","Pédagogie"],["ponctualite","Ponctualité"],["communication","Communication"],["discipline","Discipline"]] as const).map(([key,label]) => (
                      <Field key={key} label={label}><input type="number" min="1" max="5" value={criteres[key]} onChange={(e) => setCriteres({ ...criteres, [key]: Math.min(5, Math.max(1, parseInt(e.target.value) || 5)) })} className="field" /></Field>
                    ))}
                  </div>
                </div>
                <Field label="Note globale (1–5) *"><input type="number" min="1" max="5" value={note} onChange={(e) => setNote(Math.min(5, Math.max(1, parseInt(e.target.value) || 5)))} className="field" /></Field>
                <Field label="Commentaire *"><textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Commentez l'évaluation…" className="field min-h-[100px] py-2" /></Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#fafbfc] px-4 py-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="h-8 border border-[#c5c5d3] bg-white px-3 text-[11px] font-medium hover:bg-[#f2f3ff]">Annuler</button>
              <button type="button" onClick={handleAjouterEvaluation} className="h-8 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white hover:bg-[#00236f]">Ajouter l'évaluation</button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .field { width: 100%; height: 32px; border: 1px solid rgba(197,197,211,.7); background: #fff; border-radius: 4px; padding: 0 10px; font-size: 12px; outline: none; color: #131b2e; }
        .field:focus { border-color: #00236f; }
        textarea.field { height: auto; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-[11px] font-medium text-[#444651]">{label}{children}</label>
}
