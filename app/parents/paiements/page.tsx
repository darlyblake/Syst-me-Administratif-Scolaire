"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CreditCard, Wallet, Receipt } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { serviceParents } from "@/services/parents.service"

function formatMontant(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA"
}

const METHODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèque",
  virement: "Virement",
  mobile: "Mobile Money",
}

export default function ParentsPaiementsPage() {
  const searchParams = useSearchParams()
  const enfants = useMemo(() => serviceParents.obtenirEnfants(), [])
  const [eleveId, setEleveId] = useState(searchParams.get("eleve") || "tous")

  const paiements = useMemo(() => {
    return serviceParents.obtenirPaiements(eleveId === "tous" ? undefined : eleveId)
  }, [eleveId])

  const resume = useMemo(() => {
    const ids = eleveId === "tous" ? enfants.map((e) => e.id) : [eleveId]
    let totalPaye = 0
    let totalReste = 0
    ids.forEach((id) => {
      totalPaye += serviceParents.totalPaye(id)
      totalReste += serviceParents.resteAPayer(id)
    })
    return { totalPaye, totalReste, totalDu: totalPaye + totalReste }
  }, [eleveId, enfants])

  const nomEleve = (id: string) => {
    const e = enfants.find((x) => x.id === id)
    return e ? `${e.prenom} ${e.nom}` : id
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
          <CreditCard className="h-6 w-6 text-terre" />
          Paiements
        </h1>
        <p className="text-pierre">Historique et solde de scolarité</p>
      </div>

      <Select value={eleveId} onValueChange={setEleveId}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Filtrer par enfant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous les enfants</SelectItem>
          {enfants.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.prenom} {e.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-terre/10">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-pierre">Total dû</p>
              <p className="text-lg font-bold text-terre">{formatMontant(resume.totalDu)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-terre/10">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-pierre">Déjà payé</p>
              <p className="text-lg font-bold text-emerald-700">{formatMontant(resume.totalPaye)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-terre/10">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase text-pierre">Reste à payer</p>
              <p className="text-lg font-bold text-amber-700">{formatMontant(resume.totalReste)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
          style={{
            width: `${Math.min(100, (resume.totalPaye / (resume.totalDu || 1)) * 100)}%`,
          }}
        />
      </div>
      <p className="text-center text-sm text-pierre">
        {Math.round((resume.totalPaye / (resume.totalDu || 1)) * 100)} % payé
      </p>

      <Card className="border-terre/10">
        <CardHeader>
          <CardTitle className="text-base">Historique des paiements</CardTitle>
          <CardDescription>{paiements.length} opération(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paiements.length === 0 ? (
            <p className="py-8 text-center text-pierre">Aucun paiement enregistré.</p>
          ) : (
            paiements.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terre/10 p-4"
              >
                <div>
                  <p className="font-medium text-terre">
                    {p.description || p.typePaiement}
                  </p>
                  <p className="text-sm text-pierre">
                    {nomEleve(p.eleveId)} ·{" "}
                    {new Date(p.datePaiement).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="font-normal">
                      {METHODE_LABELS[p.methodePaiement] ?? p.methodePaiement}
                    </Badge>
                    {p.moisPaiement?.map((m) => (
                      <Badge key={m} variant="secondary" className="font-normal">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-lg font-bold text-emerald-700">+ {formatMontant(p.montant)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
