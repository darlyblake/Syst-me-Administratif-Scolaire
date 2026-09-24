"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinanceTableauBordPage() {
  return (
    <Suspense>
      <FinanceModule activeSection="dashboard" />
    </Suspense>
  )
}
