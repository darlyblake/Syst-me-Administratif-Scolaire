"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color?: "terre" | "soleil" | "ambre" | "jardin"
  suffix?: string
  trend?: {
    value: string
    positive?: boolean
  }
}

const colorMap = {
  terre: "bg-terre-soft text-terre",
  soleil: "bg-soleil-soft text-soleil",
  ambre: "bg-amber-50 text-ambre",
  jardin: "bg-green-50 text-jardin",
}

const trendColorMap = {
  positive: "text-jardin bg-green-50",
  negative: "text-rouge-terre bg-red-50",
  neutral: "text-pierre bg-terre-soft",
}

export function KPICard({
  title,
  value,
  icon: Icon,
  color = "terre",
  suffix = "",
  trend,
}: KPICardProps) {
  return (
    <div className="stat-card-eco border-b border-[#D8E0DC] py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", colorMap[color])}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-encre tabular">
                {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
                {suffix && <span className="text-base font-medium ml-1">{suffix}</span>}
              </p>
              <p className="text-sm text-pierre mt-0.5">{title}</p>
            </div>
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 border border-[#D8E0DC]",
              trend.positive ? trendColorMap.positive : trendColorMap.neutral
            )}>
              {trend.positive ? "+" : ""}{trend.value}
            </span>
          )}
        </div>
    </div>
  )
}
