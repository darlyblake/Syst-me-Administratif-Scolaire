"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinanceComptabilitePage() {
  return (
    <Suspense>
      <FinanceModule activeSection="comptes" />
    </Suspense>
  )
}
