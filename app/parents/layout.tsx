import type React from "react"
import { ParentNav } from "@/components/ParentNav"
import { ParentPortalProvider } from "@/hooks/use-parent-portal"
import "./parent-portal.css"

export default function ParentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ParentPortalProvider>
      <div className="min-h-dvh w-full min-w-0 bg-[#F4F7FC] text-slate-900">
        <ParentNav />
        <div className="min-w-0">
          <main className="parent-portal-content w-full min-w-0 pb-0">
            {children}
          </main>
        </div>
      </div>
    </ParentPortalProvider>
  )
}
