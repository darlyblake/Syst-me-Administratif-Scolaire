"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StateFundingPageRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/ecole/settings/prises-en-charge")
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-screen text-sm text-slate-500">
      Redirection vers la gestion des organismes…
    </div>
  )
}
