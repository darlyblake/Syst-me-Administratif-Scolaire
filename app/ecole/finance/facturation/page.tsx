"use client"

import { Receipt } from "lucide-react"

export default function FinanceFacturationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Facturation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les factures, reçus et remboursements.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <Receipt className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Factures et reçus
            </h2>
            <p className="text-sm text-gray-500">
              Cette section sera disponible prochainement. Elle permettra de consulter
              et d'émettre des factures, des reçus de paiement et des avoirs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
