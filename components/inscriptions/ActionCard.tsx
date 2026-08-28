"use client"

import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionCardProps {
  href: string
  title: string
  description: string
  icon: LucideIcon
  color?: "terre" | "soleil" | "ambre" | "jardin"
  className?: string
}

const colorMap = {
  terre: "bg-terre-soft text-terre",
  soleil: "bg-soleil-soft text-soleil",
  ambre: "bg-amber-50 text-ambre",
  jardin: "bg-green-50 text-jardin",
}

export function ActionCard({
  href,
  title,
  description,
  icon: Icon,
  color = "terre",
  className,
}: ActionCardProps) {
  return (
    <Link href={href} className="block h-full hover:bg-papier transition">
      <div
        className={cn(
          "action-card-eco h-full flex items-start gap-3 border-y border-[#D8E0DC] py-4",
          className
        )}
      >
        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 icon-scale", colorMap[color])}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-encre">{title}</h3>
          <p className="text-sm text-pierre mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  )
}
