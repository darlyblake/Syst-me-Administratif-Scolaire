"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function LegacyStateImportRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const organizationId = searchParams.get("organizationId")
    router.replace(organizationId
      ? `/ecole/students/import-organisme?organizationId=${encodeURIComponent(organizationId)}`
      : "/ecole/settings/prises-en-charge")
  }, [router, searchParams])
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Redirection vers l’importation des organismes…</div>
}
