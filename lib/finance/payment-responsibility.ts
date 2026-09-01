export type PaymentResponsibility = "family" | "state" | "other"

export interface FinancialScheduleLike {
  payer_type?: PaymentResponsibility | null
  status?: string | null
  due_date?: string | null
  category?: string | null
}

/**
 * Règle métier centrale :
 * - seules les échéances explicitement familiales peuvent générer une relance parent ;
 * - une échéance État est suivie financièrement, mais ne constitue jamais une dette parentale.
 */
export function isFamilyResponsibility(item: FinancialScheduleLike): boolean {
  return (item.payer_type ?? "family") === "family"
}

export function canNotifyParentForPayment(item: FinancialScheduleLike): boolean {
  if (!isFamilyResponsibility(item)) return false
  return !["paid", "cancelled", "waived"].includes(item.status ?? "")
}

export function isOverdueFamilyPayment(item: FinancialScheduleLike, now = new Date()): boolean {
  if (!canNotifyParentForPayment(item)) return false
  if (!item.due_date) return false
  return new Date(item.due_date) < now
}

export function getPayerLabel(type?: PaymentResponsibility | null): string {
  switch (type) {
    case "state": return "État"
    case "other": return "Autre organisme"
    default: return "Famille"
  }
}