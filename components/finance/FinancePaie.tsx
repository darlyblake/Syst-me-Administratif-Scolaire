"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export function FinancePaie() {
  return (
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
              <th className="px-4 py-3 font-medium text-gray-700 text-right">Net à Payer</th>
              <th className="px-4 py-3 font-medium text-gray-700 text-center">Statut (Ce mois)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">Traoré Aminata</td>
              <td className="px-4 py-3 text-gray-600">Professeur</td>
              <td className="px-4 py-3 text-right text-gray-600">250 000</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">275 000 FCFA</td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Payé</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
