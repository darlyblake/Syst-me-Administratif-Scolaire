"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  UserPlus, RefreshCw, ArrowRightLeft, BarChart3,
  Search, Printer, ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ActionCard } from "@/components/inscriptions/ActionCard"
import { KPICard } from "@/components/inscriptions/KPICard"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"
import { serviceEleves } from "@/services/eleves.service"
import { serviceTransfert } from "@/services/transfert.service"
import type { DonneesEleve } from "@/types/models"

export default function InscriptionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"inscription" | "reinscription">("inscription")
  const [search, setSearch] = useState("")
  const [filterClasse, setFilterClasse] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const eleves = useMemo(() => serviceEleves.obtenirTousLesEleves(), [refreshKey])
  const transfertsEnAttente = useMemo(() => serviceTransfert.getEnAttente().length, [refreshKey])

  const classes = useMemo(
    () => Array.from(new Set(eleves.map((e) => e.classe))).sort(),
    [eleves]
  )

  const filtered = eleves.filter((e) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.identifiant?.toLowerCase().includes(q)
    const matchClasse = !filterClasse || e.classe === filterClasse
    const matchStatut = !filterStatut || e.statut === filterStatut
    return matchSearch && matchClasse && matchStatut
  })

  const kpis = {
    total: eleves.filter((e) => e.statut === "actif").length,
    nouvelles: eleves.filter((e) => e.typeInscription === "inscription" && e.statut === "actif").length,
    reinscriptions: eleves.filter((e) => e.typeInscription === "reinscription").length,
    transferts: transfertsEnAttente,
  }

  const openInscription = () => {
    setModalType("inscription")
    setShowModal(true)
  }

  const openReinscription = () => {
    setModalType("reinscription")
    setShowModal(true)
  }

  const onSuccess = () => {
    setShowModal(false)
    setRefreshKey((k) => k + 1)
    toast.success(
      modalType === "inscription" ? "Inscription enregistrée" : "Réinscription enregistrée"
    )
  }

  const badgeType = (t: string) =>
    t === "inscription"
      ? "bg-terre-soft text-terre"
      : "bg-soleil-soft text-soleil"

  const badgeStatut = (s: string) => {
    if (s === "actif") return "bg-green-50 text-jardin"
    if (s === "transfere") return "bg-amber-50 text-ambre"
    return "bg-red-50 text-rouge-terre"
  }

  const labelStatut = (s: string) =>
    s === "actif" ? "Actif" : s === "transfere" ? "Transféré" : "Inactif"

  return (
    <div className="space-y-8">
      {/* Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button type="button" onClick={openInscription} className="text-left">
            <div className="action-card-eco h-full p-5 rounded-3xl bg-papier shadow-soft hover:shadow-soft-lg border border-transparent hover:border-terre/15 transition hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-2xl bg-terre-soft text-terre flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold">Nouvelle inscription</h3>
              <p className="text-sm text-pierre mt-1">Inscrire un nouvel élève (paiement cash)</p>
            </div>
          </button>
          <button type="button" onClick={openReinscription} className="text-left">
            <div className="action-card-eco h-full p-5 rounded-3xl bg-papier shadow-soft hover:shadow-soft-lg transition hover:-translate-y-0.5">
              <div className="w-11 h-11 rounded-2xl bg-soleil-soft text-soleil flex items-center justify-center mb-4">
                <RefreshCw className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold">Réinscription</h3>
              <p className="text-sm text-pierre mt-1">Renouveler pour la nouvelle année</p>
            </div>
          </button>
          <ActionCard
            href="/ecole/inscriptions/transfert"
            title="Transfert"
            description="Envoyer ou recevoir un élève"
            icon={ArrowRightLeft}
            color="ambre"
          />
          <ActionCard
            href="/ecole/inscriptions/statistiques"
            title="Rapports"
            description="Statistiques d'inscription"
            icon={BarChart3}
            color="jardin"
          />
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Élèves actifs" value={kpis.total} icon={UserPlus} color="terre" />
        <KPICard title="Nouvelles inscriptions" value={kpis.nouvelles} icon={UserPlus} color="jardin" />
        <KPICard title="Réinscriptions" value={kpis.reinscriptions} icon={RefreshCw} color="soleil" />
        <KPICard
          title="Transferts en attente"
          value={kpis.transferts}
          icon={ArrowRightLeft}
          color="ambre"
          trend={kpis.transferts > 0 ? { value: String(kpis.transferts), positive: false } : undefined}
        />
      </section>

      {/* Tableau */}
      <section className="bg-papier rounded-3xl shadow-soft overflow-hidden">
        <div className="p-5 border-b border-terre/8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pierre" />
            <Input
              placeholder="Rechercher (nom, prénom, matricule…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-2xl border-terre/15 bg-creme/50"
            />
          </div>
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50 text-sm"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="transfere">Transféré</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-pierre border-b border-terre/8">
                <th className="px-5 py-3.5 font-medium">Élève</th>
                <th className="px-5 py-3.5 font-medium">Classe</th>
                <th className="px-5 py-3.5 font-medium">Type</th>
                <th className="px-5 py-3.5 font-medium">Date</th>
                <th className="px-5 py-3.5 font-medium">Statut</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terre/6">
              {filtered.map((e: DonneesEleve) => (
                <tr key={e.id} className="hover:bg-soleil-soft/40 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-terre-soft text-terre font-semibold text-sm flex items-center justify-center">
                        {(e.prenom?.[0] || "") + (e.nom?.[0] || "")}
                      </div>
                      <div>
                        <p className="font-medium">{e.prenom} {e.nom}</p>
                        <p className="text-xs text-pierre">{e.identifiant}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-pierre">{e.classe}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeType(e.typeInscription)}`}>
                      {e.typeInscription === "inscription" ? "Nouvelle" : "Réinscription"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-pierre">
                    {e.dateInscription
                      ? new Date(e.dateInscription).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStatut(e.statut)}`}>
                      {labelStatut(e.statut)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => window.open(`/receipt?id=${e.identifiant}`, "_blank")}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-14 text-pierre">
            <p className="mb-3">Aucune inscription trouvée</p>
            <Button onClick={openInscription} className="bg-terre hover:bg-terre-dark rounded-2xl">
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvelle inscription
            </Button>
          </div>
        )}
      </section>

      <NouvelleInscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onSuccess}
        typeInscription={modalType}
      />
    </div>
  )
}
