"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CreditCard, ShieldCheck, Wallet } from "lucide-react"

type PayerType = "family" | "state" | "other"

export interface FundingSchedule {
  id: string
  amount_due: number
  amount_paid?: number | null
  status?: string | null
  payer_type?: PayerType | null
  category?: "tuition" | "registration" | "option" | "caution" | string | null
}

interface Props { schedules: FundingSchedule[]; currency?: string }

const money = (value: number, currency: string) => `${value.toLocaleString("fr-FR")} ${currency}`

function totalFor(items: FundingSchedule[], payer: PayerType, field: "due" | "paid") {
  return items.filter(x => (x.payer_type ?? "family") === payer)
    .reduce((sum, x) => sum + (field === "due" ? Number(x.amount_due || 0) : Number(x.amount_paid || 0)), 0)
}

export function StudentFundingSummary({ schedules, currency = "FCFA" }: Props) {
  const familyDue = totalFor(schedules, "family", "due")
  const familyPaid = totalFor(schedules, "family", "paid")
  const stateExpected = totalFor(schedules, "state", "due")
  const statePaid = totalFor(schedules, "state", "paid")
  const caution = schedules.filter(x => x.category === "caution")
  const cautionPaid = caution.reduce((s, x) => s + Number(x.amount_paid || 0), 0)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5 text-blue-600" /> À la charge de la famille</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{money(familyDue - familyPaid, currency)}</div>
          <p className="mt-1 text-sm text-muted-foreground">Reste à régler par la famille</p>
          {familyDue === 0 && <Badge variant="secondary" className="mt-3">Aucune dette familiale</Badge>}
        </CardContent>
      </Card>

      <Card className="border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-emerald-600" /> Prise en charge par l'État</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{money(stateExpected - statePaid, currency)}</div>
          <p className="mt-1 text-sm text-muted-foreground">Financement restant à recevoir</p>
          {stateExpected > 0 && <Badge variant="outline" className="mt-3"><ShieldCheck className="mr-1 h-3 w-3" /> Ne constitue pas une dette parentale</Badge>}
        </CardContent>
      </Card>

      {caution.length > 0 && (
        <Card className="md:col-span-2 border-amber-200">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-5 w-5 text-amber-600" /> Caution / dépôt</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-semibold">{money(cautionPaid, currency)}</div><p className="text-sm text-muted-foreground">Montant encaissé comme caution</p></div>
            <Badge variant="outline">À suivre séparément des revenus de scolarité</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
