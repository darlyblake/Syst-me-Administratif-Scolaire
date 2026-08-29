"use client"

import { APP_NAME } from "@/lib/constants"

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="font-medium text-slate-800">{APP_NAME}</div>
        <div>Gestion scolaire simple, moderne et professionnelle.</div>
      </div>
    </footer>
  )
}
