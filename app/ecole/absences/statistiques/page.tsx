"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAttendanceStatistics } from "@/hooks/useAbsences"

function getPeriod(period: string) {
  const end = new Date()
  const start = new Date(end)
  if (period === "semaine") start.setDate(end.getDate() - 6)
  if (period === "mois") start.setMonth(end.getMonth() - 1)
  if (period === "trimestre") start.setMonth(end.getMonth() - 3)
  if (period === "annee") start.setFullYear(end.getFullYear() - 1)
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export default function StatistiquesAbsences() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const [selectedClasse, setSelectedClasse] = useState("all")
  const [selectedPeriode, setSelectedPeriode] = useState("mois")
  const period = useMemo(() => getPeriod(selectedPeriode), [selectedPeriode])
  const { data, isLoading, error } = useAttendanceStatistics({ establishmentId, ...period, classId: selectedClasse === "all" ? null : selectedClasse })
  const classes = academicStructure.flatMap((cycle) => (cycle.grade_levels ?? []).flatMap((level) => (level.school_classes ?? []).map((schoolClass) => ({ id: schoolClass.id, name: schoolClass.name }))))

  const indicators = [
    ["Taux de présence", data ? `${data.presence_rate}%` : "-"],
    ["Total des présences", data?.present ?? "-"],
    ["Total des absences", data?.absent ?? "-"],
    ["Total des retards", data?.late ?? "-"],
    ["Absences justifiées", data?.excused ?? "-"],
  ] as const

  return <div className="min-h-screen p-4"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex items-center gap-4"><Button variant="outline" size="sm" asChild><Link href="/ecole/tableau-bord"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button><div><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><BarChart3 className="h-6 w-6" />Statistiques de présence</h1><p className="text-gray-600">Résumé fourni par le backend</p></div></header>
    <Card><CardContent className="flex flex-wrap items-center gap-4 p-4"><div className="space-y-2"><Label>Classe</Label><Select value={selectedClasse} onValueChange={setSelectedClasse}><SelectTrigger className="w-56"><SelectValue placeholder="Toutes les classes" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les classes</SelectItem>{classes.map((schoolClass) => <SelectItem key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Période</Label><Select value={selectedPeriode} onValueChange={setSelectedPeriode}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semaine">Cette semaine</SelectItem><SelectItem value="mois">Ce mois</SelectItem><SelectItem value="trimestre">Ce trimestre</SelectItem><SelectItem value="annee">Cette année</SelectItem></SelectContent></Select></div><p className="text-sm text-slate-500">Du {period.from} au {period.to}</p></CardContent></Card>
    {estEnCoursDeChargement || isLoading ? <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Chargement des statistiques...</p> : null}
    {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    {!isLoading && !error && !data ? <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">Aucune donnée disponible pour cette période.</p> : null}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{indicators.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-slate-900">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Données détaillées indisponibles</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">Les statistiques par classe, l’évolution temporelle, les motifs, les élèves concernés et les alertes nécessitent une agrégation backend dédiée.</p></CardContent></Card>
  </div></div>
}