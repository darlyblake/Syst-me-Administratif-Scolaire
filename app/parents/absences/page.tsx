"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, RefreshCw, UserX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useParentPortal } from "@/hooks/use-parent-portal"

const CONFIG: Record<string, { label: string; className: string; icon: typeof UserX }> = {
  absent: { label: "Absent", className: "bg-rose-50 text-rose-700 border-rose-200", icon: UserX },
  justifie: { label: "Justifié", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  non_justifie: { label: "Non justifié", className: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
  retard: { label: "Retard", className: "bg-orange-50 text-orange-700 border-orange-200", icon: Clock },
}

export default function ParentsAbsencesPage() {
  const params = useSearchParams()
  const { loading, error, refresh, children, attendance } = useParentPortal()
  const [id, setId] = useState(params.get("eleve") || "tous")

  const list = useMemo(
    () => attendance.filter((item) => id === "tous" || item.student_id === id),
    [attendance, id],
  )

  const stats = useMemo(() => ({
    total: list.length,
    justifiees: list.filter((item) => item.status === "justifie").length,
    retards: list.filter((item) => item.status === "retard").length,
    non: list.filter((item) => item.status === "non_justifie" || item.status === "absent").length,
  }), [list])

  const childName = (studentId: string) => {
    const child = children.find((item) => item.id === studentId)
    return child ? `${child.first_name} ${child.last_name}` : "Élève"
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-pierre">Chargement des absences...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-terre">
            <UserX className="h-6 w-6" />
            Absences & retards
          </h1>
          <p className="text-pierre">Consultez uniquement les présences de vos enfants associés.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button variant="outline" onClick={() => void refresh()} className="border-red-200 bg-white text-red-700 hover:bg-red-50">Réessayer</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-terre">Enfant</p>
          <p className="text-xs text-pierre">Le filtre ne peut afficher que vos enfants associés.</p>
        </div>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Filtrer par enfant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les enfants</SelectItem>
            {children.map((child) => <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Justifiées", stats.justifiees],
          ["Retards", stats.retards],
          ["Absences non justifiées", stats.non],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-pierre">{label}</p><p className="mt-1 text-2xl font-bold text-terre">{value}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-terre/15 px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-3 font-medium text-terre">Aucune absence enregistrée</p>
              <p className="mt-1 text-sm text-pierre">Aucun enregistrement ne correspond au filtre sélectionné.</p>
            </div>
          ) : list.map((item) => {
            const cfg = CONFIG[item.status] ?? CONFIG.absent
            const Icon = cfg.icon
            return (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-terre/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className={`rounded-lg border p-2 ${cfg.className}`}><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium capitalize text-terre">{new Date(item.attendance_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                    <p className="text-sm text-pierre">{childName(item.student_id)}</p>
                    {item.reason && <p className="text-sm text-pierre">Motif : {item.reason}</p>}
                  </div>
                </div>
                <Badge variant="outline" className={`w-fit ${cfg.className}`}>{cfg.label}</Badge>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
