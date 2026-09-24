"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinancePaiementsPage() {
  return (
    <Suspense>
      <FinanceModule activeSection="paiements" />
    </Suspense>
  )
}
