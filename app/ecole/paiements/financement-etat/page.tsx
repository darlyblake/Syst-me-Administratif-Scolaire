"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Landmark, RefreshCw, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { getPaymentSummaryByEstablishment, type EstablishmentPaymentSummary } from "@/lib/supabase/services/payment.service"

const money = (value: number) => `${Number(value || 0).toLocaleString("fr-FR")} FCFA`

export default function StateFundingPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: years, activeYear, selectedYear } = useAcademicYears(establishmentId)
  const year = selectedYear ?? activeYear ?? years[0]
  const [summary, setSummary] = useState<EstablishmentPaymentSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!establishmentId || !year?.id) return
    setLoading(true)
    setError(null)
    try {
      setSummary(await getPaymentSummaryByEstablishment(establishmentId, year.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le financement de l'État.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [establishmentId, year?.id])

  const stateProgress = summary && summary.state_expected > 0
    ? Math.min(100, (summary.state_paid / summary.state_expected) * 100)
    : 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild><Link href="/ecole/paiements"><ArrowLeft className="mr-2 h-4 w-4" />Paiements</Link></Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financement par l'État</h1>
            <p className="text-sm text-slate-600">Suivi séparé des sommes prises en charge par l'État.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Les montants ci-dessous ne sont pas des impayés familiaux. Une somme « restante » correspond au financement de l'État qui n'a pas encore été encaissé.
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && !summary ? <div className="text-sm text-slate-500">Chargement...</div> : summary && <>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardDescription>Financement attendu</CardDescription><CardTitle className="text-xl">{money(summary.state_expected)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-slate-500"><Landmark className="h-4 w-4" />{summary.state_schedules} échéance(s) État</div></CardContent></Card>
          <Card><CardHeader><CardDescription>Financement encaissé</CardDescription><CardTitle className="text-xl">{money(summary.state_paid)}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-green-700"><WalletCards className="h-4 w-4" />{stateProgress.toFixed(0)} % encaissé</div></CardContent></Card>
          <Card><CardHeader><CardDescription>Financement restant</CardDescription><CardTitle className="text-xl">{money(summary.state_remaining)}</CardTitle></CardHeader><CardContent><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700 transition-all" style={{ width: `${stateProgress}%` }} /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Familles : situation indépendante</CardTitle><CardDescription>Les sommes dues par les parents restent séparées du financement public.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div><div className="text-sm text-slate-500">À payer</div><div className="font-semibold">{money(summary.family_expected)}</div></div>
            <div><div className="text-sm text-slate-500">Encaissé</div><div className="font-semibold">{money(summary.family_paid)}</div></div>
            <div><div className="text-sm text-slate-500">Impayé familial</div><div className="font-semibold">{money(summary.family_remaining)}</div></div>
          </CardContent>
        </Card>
      </>}
    </div>
  )
}
