"use client"

import { Suspense } from "react"
import { FinanceModule } from "@/components/finance/FinanceModule"

export default function FinanceDepensesPage() {
  return (
    <Suspense>
      <FinanceModule activeSection="depenses" />
    </Suspense>
  )
}
