import type React from "react"
import { ParentNav } from "@/components/ParentNav"
import { ParentPortalProvider } from "@/hooks/use-parent-portal"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ParentPortalProvider>
      <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F4F7FC] text-slate-900">
        <ParentNav />
        <div className="min-w-0 lg:pl-64">
          <main className="mx-auto w-full max-w-[1120px] min-w-0 px-3 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:px-8 lg:py-7 lg:pb-10 [&_section]:overflow-hidden [&_section]:rounded-lg [&_section]:border [&_section]:border-slate-200 [&_section]:bg-white">
            {children}
          </main>
        </div>
      </div>
    </ParentPortalProvider>
  )
}
