import type React from "react"
import { ParentNav } from "@/components/ParentNav"
import { ParentPortalProvider } from "@/hooks/use-parent-portal"
import "./parent-portal.css"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ParentPortalProvider>
      <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#F8FAFF] text-slate-900">
        <ParentNav />
        <div className="min-w-0 lg:pl-[248px]">
          <main className="parent-portal-content w-full min-w-0 pb-0">
            {children}
          </main>
        </div>
      </div>
    </ParentPortalProvider>
  )
}
