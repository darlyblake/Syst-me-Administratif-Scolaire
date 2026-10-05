"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[parents] erreur de rendu client", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-xl border border-red-200 bg-white p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">Espace parent</p>
        <h1 className="mt-2 text-xl font-bold text-slate-950">Impossible d’afficher cette page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Une erreur est survenue dans l’interface parent. Vous pouvez relancer l’affichage sans vous déconnecter.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-slate-400">Référence : {error.digest}</p>}
        <Button className="mt-5 rounded-lg" onClick={() => reset()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    </div>
  )
}
