"use client"
import { GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
type Props = { size?: number; className?: string }
/** Identité visuelle unique de NOVA : toque blanche sur fond bleu. */
export function AppBrandMark({ size = 40, className }: Props) {
 return <span aria-label="NOVA" role="img" className={cn("inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white",className)} style={{width:size,height:size}}><GraduationCap aria-hidden="true" style={{width:size*.58,height:size*.58}} strokeWidth={1.9}/></span>
}
