"use client"

import { useState } from "react"
import type React from "react"
import Sidebar from "@/components/Sidebar"

export default function EcoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-creme text-encre">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ${
          isSidebarOpen ? "lg:pl-64" : ""
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-papier border-b border-[#D8E0DC]">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
                className="p-2 rounded-md hover:bg-terre-soft transition"
              >
                <svg
                  className="w-5 h-5 text-pierre"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-terre">École Vivante</h1>
                <p className="text-xs text-pierre hidden sm:block">
                  {new Date().toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Notifications" className="relative p-2.5 rounded-md hover:bg-terre-soft transition">
                <svg
                  className="w-5 h-5 text-pierre"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rouge-terre rounded-full"></span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
