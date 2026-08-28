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
    <Link href={href} className="block h-full">
      <div
        className={cn(
          "action-card-eco h-full p-5 rounded-3xl border border-transparent bg-papier shadow-soft",
          className
        )}
      >
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center mb-4 icon-scale", colorMap[color])}>
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h3 className="font-semibold text-encre">{title}</h3>
        <p className="text-sm text-pierre mt-1.5 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  )
}
