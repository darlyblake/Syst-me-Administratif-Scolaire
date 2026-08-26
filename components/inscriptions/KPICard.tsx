"use client"

import { Card, CardContent } from "@/components/ui/card"
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
    <Card className="stat-card-eco bg-papier rounded-3xl shadow-soft">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", colorMap[color])}>
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-encre tabular">
                {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
                {suffix && <span className="text-base font-medium ml-1">{suffix}</span>}
              </p>
              <p className="text-sm text-pierre mt-0.5">{title}</p>
            </div>
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive ? trendColorMap.positive : trendColorMap.neutral
            )}>
              {trend.positive ? "+" : ""}{trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
