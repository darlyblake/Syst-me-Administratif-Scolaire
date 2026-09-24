"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinanceRapportsPage() {
  return (
    <Suspense>
      <FinanceModule activeSection="rapports" />
    </Suspense>
  )
}
