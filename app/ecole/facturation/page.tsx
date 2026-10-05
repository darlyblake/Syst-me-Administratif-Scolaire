"use client"

import { ReceiptText } from "lucide-react"

export default function FinanceFacturationPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-gray-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gray-200 bg-gray-50">
            <ReceiptText className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Facturation</h1>
            <p className="mt-1 text-sm text-gray-500">
              Préparation des factures, reçus et remboursements de l'établissement.
            </p>
          </div>
        </div>
      </header>

      <section className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Factures et reçus</h2>
          <p className="mt-1 text-xs text-gray-500">Espace de consultation et d'émission des documents financiers.</p>
        </div>
        <div className="px-4 py-5">
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            Cette fonctionnalité sera disponible prochainement. Elle permettra de consulter les
            opérations concernées et de générer les documents justificatifs associés aux paiements.
          </p>
        </div>
      </section>
    </div>
  )
}
