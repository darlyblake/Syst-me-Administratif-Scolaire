"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"

export function FinanceDepenses() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 uppercase">Dépenses</h1>
          <p className="text-sm text-gray-500 mt-1">Dépenses opérationnelles de l'établissement</p>
        </div>
        <Button className="w-full sm:w-auto rounded bg-gray-900 text-white hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Dépense
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 w-full">
        <div className="relative w-full sm:min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Rechercher une dépense..." className="pl-9 bg-white border-gray-300 rounded" />
        </div>
        <select className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white">
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
