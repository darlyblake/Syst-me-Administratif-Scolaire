"use client"

import type React from "react"
import { Suspense } from "react"
import { ParentNav } from "@/components/ParentNav"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white lg:hidden" />}>
        <ParentNav />
      </Suspense>
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  )
}
