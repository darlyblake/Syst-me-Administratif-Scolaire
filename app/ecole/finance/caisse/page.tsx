"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinanceCaissePage() {
  return (
    <Suspense>
      <FinanceModule activeSection="mouvements" />
    </Suspense>
  )
}
