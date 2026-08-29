"use client"

import { Check, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Reveal } from "./Reveal"

interface RoleCardProps {
  icon: React.ComponentType<{ className: string }>
  title: string
  description: string
  points: string[]
  href: string
  isActive?: boolean
  onSelect?: () => void
}

export function RoleCard({ icon: Icon, title, description, points, href, isActive = false, onSelect }: RoleCardProps) {
  const router = useRouter()

  const handleClick = () => {
    onSelect?.()
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className={`group w-full rounded-2xl border p-6 text-left transition-all duration-500 ${
        isActive
          ? "border-slate-950 bg-white shadow-xl shadow-slate-200/60"
          : "border-slate-200 bg-white/60 hover:-translate-y-2 hover:bg-white hover:shadow-xl"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </span>
        <ChevronRight className="h-5 w-5 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-700" />
      </div>

      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-5 space-y-2">
        {points.map((point) => (
          <div key={point} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="h-4 w-4 transition-transform group-hover:scale-110" />
            {point}
          </div>
        ))}
      </div>
    </button>
  )
}
