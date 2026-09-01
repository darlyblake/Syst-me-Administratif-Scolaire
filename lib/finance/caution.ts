export type CautionStatus = "none" | "held" | "partially_refunded" | "refunded"

export interface CautionRecord {
  required: number
  collected: number
  refunded: number
}

export interface CautionSummary {
  status: CautionStatus
  balanceHeld: number
  refundable: number
}

export function getCautionSummary(record: CautionRecord): CautionSummary {
  const collected = Math.max(0, Number(record.collected) || 0)
  const refunded = Math.min(collected, Math.max(0, Number(record.refunded) || 0))
  const required = Math.max(0, Number(record.required) || 0)
  const balanceHeld = collected - refunded

  if (collected === 0 && required === 0) return { status: "none", balanceHeld: 0, refundable: 0 }
  if (balanceHeld === 0 && refunded > 0) return { status: "refunded", balanceHeld: 0, refundable: 0 }
  if (refunded > 0) return { status: "partially_refunded", balanceHeld, refundable: balanceHeld }
  return { status: "held", balanceHeld, refundable: balanceHeld }
}

/** Une caution est un passif temporaire : elle ne doit jamais être agrégée aux revenus de scolarité. */
export function isCautionRevenue(): false {
  return false
}
