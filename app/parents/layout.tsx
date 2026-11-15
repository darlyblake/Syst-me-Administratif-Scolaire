import type React from "react"
import { ParentNav } from "@/components/ParentNav"
import { ParentPortalProvider } from "@/hooks/use-parent-portal"
import "./parent-portal.css"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ParentPortalProvider>
      <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#F4F7FC] text-slate-900">
        <ParentNav />
        <div className="min-w-0 lg:pl-[248px]">
          <main className="parent-portal-content w-full min-w-0 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-10">
            {children}
          </main>
        </div>
      </div>
    </ParentPortalProvider>
  )
}
