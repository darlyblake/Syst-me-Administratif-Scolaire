"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText } from "lucide-react"

export function FinanceRapports() {
  return (
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
  )
}
