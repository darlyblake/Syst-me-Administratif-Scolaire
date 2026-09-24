"use client"

import { GraduationCap } from "lucide-react"
import Link from "next/link"

/**
 * Frais scolaires — cette fonctionnalité est accessible via les Paramètres
 * de l'école (Settings > Scolarité). Cette page sert de redirection claire.
 */
export default function FinanceFraisScolairesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Frais scolaires</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consultez et configurez les tarifs par niveau scolaire.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <GraduationCap className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Tarifs et frais de scolarité
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              La configuration des frais scolaires (tarifs par niveau, frais d'inscription,
              modes de paiement et échéances) se trouve dans les Paramètres de l'école.
            </p>
            <Link
              href="/ecole/settings/scolarite"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              <GraduationCap className="h-4 w-4" />
              Accéder aux frais scolaires
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
