"use client"

import Image from "next/image"

export function DashboardPreview() {
  return (
    <div className="landing-hero-preview relative mx-auto w-full max-w-3xl">
      <div className="landing-preview-glow absolute -inset-8 rounded-[2.5rem] bg-blue-200/50 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-[0_28px_80px_-35px_rgba(30,64,175,0.38)] sm:rounded-3xl sm:p-3">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white sm:rounded-2xl">
          <div className="flex h-11 items-center justify-between border-b border-slate-100 bg-white px-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
              <span className="text-xs font-semibold text-slate-700">Aperçu de l’espace administration</span>
            </div>
            <span className="text-[10px] text-slate-400">Interface réelle</span>
          </div>
          <Image
            src="/captures/dashboard-admin.png"
            alt="Capture réelle du tableau de bord de l’administration scolaire"
            width={1600}
            height={1000}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  )
}
