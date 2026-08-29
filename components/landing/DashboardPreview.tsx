"use client"

import { BarChart3, GraduationCap, Users } from "lucide-react"

export function DashboardPreview() {
  const bars = [38, 55, 46, 72, 60, 84, 68, 92, 76, 88, 70, 96]

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-10 rounded-[3rem] bg-slate-200/60 blur-3xl animate-pulse-soft" />

      <div className="relative rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40 transition duration-500 hover:-translate-y-2 hover:shadow-slate-300/60 sm:rounded-[2rem] sm:p-3">
        <div className="overflow-hidden rounded-[1rem] border border-slate-100 bg-[#f7f7f5] sm:rounded-[1.5rem]">
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b bg-white px-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-950" />
              <span className="text-xs font-semibold">Tableau de bord</span>
            </div>
            <span className="text-[10px] text-slate-400">2026–2027</span>
          </div>

          {/* Content */}
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            {/* Main stat */}
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-950 p-4 text-white transition-transform duration-300 hover:scale-[1.02]">
                <p className="text-[11px] text-slate-300">Élèves inscrits</p>
                <p className="mt-2 text-2xl font-semibold">1 248</p>
                <p className="mt-1 text-[10px] text-slate-400">Année scolaire</p>
              </div>

              {/* Sub stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="mt-3 text-lg font-semibold">48</p>
                  <p className="text-[10px] text-slate-500">Classes</p>
                </div>
                <div className="rounded-xl border bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <p className="mt-3 text-lg font-semibold">76</p>
                  <p className="text-[10px] text-slate-500">Enseignants</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-xl border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-xs font-semibold">Activité scolaire</p>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex items-end justify-between gap-1">
                {bars.map((bar, i) => (
                  <div
                    key={i}
                    className="chart-bar flex-1 rounded-t bg-gradient-to-t from-slate-950 to-slate-700"
                    style={{
                      height: `${bar}%`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
