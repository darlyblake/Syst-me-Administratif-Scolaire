import type React from "react"
import { ParentNav } from "@/components/ParentNav"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50 text-slate-900">
      <ParentNav />
      <div className="min-w-0 lg:pl-64">
        <main className="mx-auto w-full max-w-[1440px] min-w-0 px-3 pb-28 pt-5 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  )
}
