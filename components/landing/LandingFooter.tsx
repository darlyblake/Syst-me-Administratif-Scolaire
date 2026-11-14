"use client"

import { APP_NAME } from "@/lib/constants"

export function LandingFooter() {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="font-semibold text-slate-900">{APP_NAME}</div>
        <div>Une plateforme pour simplifier le suivi de la vie scolaire.</div>
      </div>
    </footer>
  )
}
