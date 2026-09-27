
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, FileText, ArrowRight, Check } from "lucide-react"

export function FinanceModule({ activeSection }: { activeSection: string }) {
  // Modal states
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showAddDepenseModal, setShowAddDepenseModal] = useState(false)
  const [showAddMovementModal, setShowAddMovementModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* Remove the large colored header as per the new instructions to be plain and administrative */}
      
      {activeSection === "dashboard" && (
        <div className="space-y-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 uppercase">Vue d'ensemble</h1>
            <p className="text-sm text-gray-500 mt-1">Tableau de bord financier - Année scolaire 2026-2027</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 p-4 rounded bg-white">
              <p className="text-sm text-gray-500">Caisse (Solde actuel)</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">4 500 000 <span className="text-sm font-normal">FCFA</span></p>
            </div>
            <div className="border border-gray-200 p-4 rounded bg-white">
              <p className="text-sm text-gray-500">Total Encaissé</p>
              <p className="text-2xl font-bold mt-1 text-green-700">12 450 000 <span className="text-sm font-normal">FCFA</span></p>
            </div>
            <div className="border border-gray-200 p-4 rounded bg-white">
              <p className="text-sm text-gray-500">Reste à recouvrer</p>
              <p className="text-2xl font-bold mt-1 text-orange-600">3 200 000 <span className="text-sm font-normal">FCFA</span></p>
            </div>
            <div className="border border-gray-200 p-4 rounded bg-white">
              <p className="text-sm text-gray-500">Total Dépenses</p>
              <p className="text-2xl font-bold mt-1 text-red-600">7 950 000 <span className="text-sm font-normal">FCFA</span></p>
            </div>
          </div>
        </div>
      )}

      {activeSection === "mouvements" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 uppercase">Mouvements de Caisse</h1>
              <p className="text-sm text-gray-500 mt-1">Historique complet des encaissements et décaissements</p>
            </div>
            <Button onClick={() => setShowAddMovementModal(true)} className="rounded bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Mouvement
            </Button>
          </div>

          <div className="flex gap-4 mb-4">
            <Input placeholder="Rechercher (référence, description)..." className="max-w-sm rounded" />
            <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white">
              <option value="">Tous les types</option>
              <option value="entree">Entrées (Encaissements)</option>
              <option value="sortie">Sorties (Dépenses, Paie)</option>
            </select>
            <Input type="date" className="w-auto rounded bg-white" />
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Catégorie</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Description</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Montant</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Solde Caisse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">01/09/2026</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Entrée</span></td>
                  <td className="px-4 py-3 text-gray-600">Scolarité</td>
                  <td className="px-4 py-3 text-gray-600">Paiement Septembre - Dupont Jean (6ème A)</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">+ 45 000</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">1 450 000</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">02/09/2026</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Sortie</span></td>
                  <td className="px-4 py-3 text-gray-600">Fournitures</td>
                  <td className="px-4 py-3 text-gray-600">Achat papier rame x10</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">- 25 000</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">1 425 000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "paiements" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 uppercase">Scolarité</h1>
              <p className="text-sm text-gray-500 mt-1">Suivi détaillé des échéances des élèves</p>
            </div>
            <Button onClick={() => setShowAddPaymentModal(true)} className="rounded bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Encaisser un paiement
            </Button>
          </div>

          <div className="flex gap-4 mb-4">
            <Input placeholder="Rechercher un élève..." className="max-w-sm rounded" />
            <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white">
              <option value="">Toutes les classes</option>
              <option value="6eA">6ème A</option>
              <option value="6eB">6ème B</option>
            </select>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white">
              <option value="">Tous les statuts</option>
              <option value="ajour">À jour</option>
              <option value="retard">En retard</option>
            </select>
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Élève</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Classe</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Sept.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Oct.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Nov.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Déc.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Jan.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Fév.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Mar.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Avr.</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Mai</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Juin</th>
                  <th className="px-4 py-3 font-medium text-gray-700">État Global</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">Dupont Jean</td>
                    <td className="px-4 py-3 text-gray-600">6ème A</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-orange-500 font-bold" title="Partiel: 25000 / 45000">25k</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">Retard partiel</span></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">Martin Sophie</td>
                    <td className="px-4 py-3 text-gray-600">6ème A</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">À jour</span></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">Diallo Amadou <br/><span className="text-[10px] text-blue-600 font-normal border border-blue-200 px-1 rounded">Boursier État</span></td>
                    <td className="px-4 py-3 text-gray-600">6ème A</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">✓</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">X</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">X</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">X</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3 text-center text-gray-300">-</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Bloqué</span></td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "depenses" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 uppercase">Dépenses</h1>
              <p className="text-sm text-gray-500 mt-1">Dépenses opérationnelles de l'établissement</p>
            </div>
            <Button onClick={() => setShowAddDepenseModal(true)} className="rounded bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Dépense
            </Button>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Rechercher une dépense..." className="pl-9 bg-white border-gray-300 rounded" />
            </div>
            <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white">
              <option value="">Toutes les catégories</option>
              <option value="fournitures">Fournitures</option>
              <option value="entretien">Entretien</option>
              <option value="loyer">Loyer</option>
            </select>
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Libellé</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Catégorie</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Bénéficiaire/Fournisseur</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Montant</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">01/09/2026</td>
                  <td className="px-4 py-3 font-medium text-gray-900">Achat rames papier</td>
                  <td className="px-4 py-3 text-gray-600">Fournitures</td>
                  <td className="px-4 py-3 text-gray-600">Librairie Centrale</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">25 000 FCFA</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Payée</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">05/09/2026</td>
                  <td className="px-4 py-3 font-medium text-gray-900">Réparation plomberie</td>
                  <td className="px-4 py-3 text-gray-600">Entretien</td>
                  <td className="px-4 py-3 text-gray-600">Plombier Diallo</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">15 000 FCFA</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">En attente</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "paie" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 uppercase">Paie et Salaires</h1>
              <p className="text-sm text-gray-500 mt-1">Gestion des rémunérations du personnel</p>
            </div>
            <Button className="rounded bg-gray-900 text-white hover:bg-gray-800">
              <FileText className="h-4 w-4 mr-2" />
              Générer les Fiches
            </Button>
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Employé</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Poste</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Salaire Base</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Primes</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Retenues</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-right">Net à Payer</th>
                  <th className="px-4 py-3 font-medium text-gray-700 text-center">Statut (Septembre)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Traoré Aminata</td>
                  <td className="px-4 py-3 text-gray-600">Professeur Mathématiques</td>
                  <td className="px-4 py-3 text-right text-gray-600">250 000</td>
                  <td className="px-4 py-3 text-right text-gray-600">25 000</td>
                  <td className="px-4 py-3 text-right text-gray-600">0</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">275 000 FCFA</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Payé</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Sylla Ousmane</td>
                  <td className="px-4 py-3 text-gray-600">Surveillant Général</td>
                  <td className="px-4 py-3 text-right text-gray-600">180 000</td>
                  <td className="px-4 py-3 text-right text-gray-600">10 000</td>
                  <td className="px-4 py-3 text-right text-red-600">- 5 000</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">185 000 FCFA</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Brouillon</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === "rapports" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 uppercase">Rapports Financiers</h1>
              <p className="text-sm text-gray-500 mt-1">Export et analyse des finances de l'établissement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded p-6 bg-white">
              <h3 className="font-semibold text-gray-900 mb-2">Bilan Périodique</h3>
              <p className="text-sm text-gray-500 mb-4">Exportez le résumé de toutes les entrées et sorties sur une période définie.</p>
              <div className="flex gap-2 mb-4">
                <Input type="date" className="rounded border-gray-300" />
                <Input type="date" className="rounded border-gray-300" />
              </div>
              <Button variant="outline" className="w-full rounded border-gray-300">
                <FileText className="h-4 w-4 mr-2" />
                Générer PDF
              </Button>
            </div>

            <div className="border border-gray-200 rounded p-6 bg-white">
              <h3 className="font-semibold text-gray-900 mb-2">État des Retards de Scolarité</h3>
              <p className="text-sm text-gray-500 mb-4">Liste complète des élèves ayant des échéances non soldées.</p>
              <Button variant="outline" className="w-full rounded border-gray-300 mt-10">
                <FileText className="h-4 w-4 mr-2" />
                Générer Excel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
