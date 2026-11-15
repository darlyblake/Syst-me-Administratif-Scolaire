"use client"

import type { ReactNode } from "react"
import { useParentPortal } from "@/hooks/use-parent-portal"

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />
}

function ParentLoadingSkeleton() {
  return (
    <div role="status" aria-label="Chargement de votre espace parent" aria-busy="true" className="mx-auto w-full max-w-4xl space-y-5">
      <div className="space-y-3 pb-4">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="h-8 w-56 max-w-[75%]" />
        <SkeletonLine className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0,1,2].map((item) => <div key={item} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><SkeletonLine className="h-3 w-20" /><SkeletonLine className="h-7 w-16" /><SkeletonLine className="h-3 w-28 max-w-full" /></div>)}
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4"><SkeletonLine className="h-5 w-36" /><SkeletonLine className="h-8 w-24" /></div>
        {[0,1,2,3].map((item) => <div key={item} className="flex items-center gap-3 border-t border-slate-100 pt-4"><SkeletonLine className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><SkeletonLine className="h-3 w-2/5" /><SkeletonLine className="h-3 w-3/5" /></div></div>)}
      </div>
      <span className="sr-only">Chargement des données depuis l’établissement…</span>
    </div>
  )
}

export function ParentPortalLoadingBoundary({ children }: { children: ReactNode }) {
  const { loading } = useParentPortal()
  if (loading) return <ParentLoadingSkeleton />
  return <>{children}</>
}
