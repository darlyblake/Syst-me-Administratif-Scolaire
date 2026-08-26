"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft, FolderOpen, Search, Check, X, Archive, Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { serviceEleves } from "@/services/eleves.service"
import { serviceDossiersPapier } from "@/services/dossiers-papier.service"
import type { DossierPapier, DonneesEleve } from "@/types/models"

export default function DossiersPapierPage() {
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [selected, setSelected] = useState<DossierPapier | null>(null)

  const eleves = useMemo(() => serviceEleves.obtenirTousLesEleves(), [refresh])
  const dossiers = useMemo(() => serviceDossiersPapier.obtenirTous(), [refresh])

  const elevesMap = useMemo(() => {
    const m = new Map<string, DonneesEleve>()
    eleves.forEach((e) => m.set(e.id, e))
    return m
  }, [eleves])

  const rows = useMemo(() => {
    return dossiers
      .map((d) => ({ dossier: d, eleve: elevesMap.get(d.eleveId) }))
      .filter((r) => r.eleve)
      .filter((r) => {
        const e = r.eleve!
        const q = search.toLowerCase()
        const matchQ =
          !q ||
          e.nom.toLowerCase().includes(q) ||
          e.prenom.toLowerCase().includes(q) ||
          e.identifiant?.toLowerCase().includes(q)
        const matchS = !filterStatut || r.dossier.statut === filterStatut
        return matchQ && matchS
      })
  }, [dossiers, elevesMap, search, filterStatut])

  const badge = (s: string) => {
    if (s === "complet") return "bg-green-50 text-jardin"
    if (s === "incomplet") return "bg-soleil-soft text-soleil"
    if (s === "emprunte") return "bg-amber-50 text-ambre"
    return "bg-terre-soft text-pierre"
  }

  const label = (s: string) =>
    ({ complet: "Complet", incomplet: "Incomplet", emprunte: "Emprunté", archive: "Archivé" }[s] || s)

  const reload = () => setRefresh((k) => k + 1)

  const togglePiece = (pieceId: string, presente: boolean) => {
    if (!selected) return
    serviceDossiersPapier.togglePiece(selected.id, pieceId, presente)
    const updated = serviceDossiersPapier.obtenirParId(selected.id)
    setSelected(updated)
    reload()
    toast.success(presente ? "Pièce marquée présente" : "Pièce marquée absente")
  }

  const handleEmprunter = () => {
    if (!selected) return
    const qui = window.prompt("Emprunté par (nom) ?")
    if (!qui) return
    const motif = window.prompt("Motif ?") || "Consultation"
    const ok = serviceDossiersPapier.emprunter(selected.id, qui, motif)
    if (!ok) {
      toast.error("Dossier déjà emprunté ou introuvable")
      return
    }
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.success("Dossier emprunté")
  }

  const handleRendre = () => {
    if (!selected) return
    serviceDossiersPapier.rendre(selected.id)
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.success("Dossier rendu")
  }

  const handleArchiver = () => {
    if (!selected) return
    serviceDossiersPapier.archiver(selected.id)
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.message("Dossier archivé")
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Liste */}
      <section className="lg:col-span-3 bg-papier rounded-3xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-terre/8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pierre" />
              <Input
                placeholder="Nom, prénom, matricule…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-2xl border-terre/15 bg-creme/50"
              />
            </div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="complet">Complet</option>
              <option value="incomplet">Incomplet</option>
              <option value="emprunte">Emprunté</option>
              <option value="archive">Archivé</option>
            </select>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-papier">
                <tr className="text-left text-pierre border-b border-terre/8">
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium">Classe</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Manquantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terre/6">
                {rows.map(({ dossier, eleve }) => {
                  const manq = serviceDossiersPapier.piecesManquantes(dossier).length
                  return (
                    <tr
                      key={dossier.id}
                      onClick={() => setSelected(dossier)}
                      className={`cursor-pointer hover:bg-soleil-soft/40 transition ${
                        selected?.id === dossier.id ? "bg-terre-soft/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{eleve!.prenom} {eleve!.nom}</p>
                        <p className="text-xs text-pierre">{eleve!.identifiant}</p>
                      </td>
                      <td className="px-4 py-3 text-pierre">{eleve!.classe}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge(dossier.statut)}`}>
                          {label(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular">
                        {manq > 0 ? (
                          <span className="text-soleil font-medium">{manq}</span>
                        ) : (
                          <span className="text-jardin">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-center py-12 text-pierre">Aucun dossier papier</p>
            )}
          </div>
        </section>

      {/* Détail */}
      <section className="lg:col-span-2 bg-papier rounded-3xl shadow-soft p-5 min-h-[320px]">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-pierre text-sm">
            Sélectionnez un dossier
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              const e = elevesMap.get(selected.eleveId)
              return (
                <>
                  <div>
                    <h2 className="font-semibold text-lg">
                      {e?.prenom} {e?.nom}
                    </h2>
                    <p className="text-sm text-pierre">
                      {e?.classe} · {e?.identifiant}
                    </p>
                    <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge(selected.statut)}`}>
                      {label(selected.statut)}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Pièces</p>
                    <ul className="space-y-2">
                      {selected.pieces.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2 text-sm rounded-xl bg-creme/80 px-3 py-2"
                        >
                          <span>
                            {p.nom}
                            {p.obligatoire && (
                              <span className="text-xs text-pierre ml-1">(oblig.)</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePiece(p.id, !p.presente)}
                            className={`p-1.5 rounded-lg ${
                              p.presente ? "bg-green-50 text-jardin" : "bg-soleil-soft text-soleil"
                            }`}
                          >
                            {p.presente ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Emplacement</label>
                    <Input
                      className="mt-1 rounded-2xl"
                      defaultValue={selected.emplacement || ""}
                      placeholder="Ex. Armoire A – Rangée 3"
                      onBlur={(ev) => {
                        serviceDossiersPapier.setEmplacement(selected.id, ev.target.value)
                        reload()
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selected.statut !== "emprunte" && selected.statut !== "archive" && (
                      <Button size="sm" className="rounded-xl bg-ambre hover:bg-ambre/90 text-white" onClick={handleEmprunter}>
                        <Package className="h-4 w-4 mr-1" />
                        Emprunter
                      </Button>
                    )}
                    {selected.statut === "emprunte" && (
                      <Button size="sm" className="rounded-xl bg-jardin text-white" onClick={handleRendre}>
                        Rendre
                      </Button>
                    )}
                    {selected.statut !== "archive" && (
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={handleArchiver}>
                        <Archive className="h-4 w-4 mr-1" />
                        Archiver
                      </Button>
                    )}
                  </div>

                  {selected.emprunts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Historique emprunts</p>
                      <ul className="text-xs text-pierre space-y-1">
                        {selected.emprunts.slice().reverse().map((emp) => (
                          <li key={emp.id}>
                            {emp.empruntePar} — {emp.motif} —{" "}
                            {new Date(emp.dateSortie).toLocaleDateString("fr-FR")}
                            {emp.rendu ? " (rendu)" : " (en cours)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </section>
    </div>
  )
}
