"use client"

import { useCallback, useEffect, useState } from "react"
import { History, RefreshCw, UserPlus, UserMinus, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabaseBrowser } from "@/lib/supabase/client"
import { useAuthentification } from "@/providers/authentification.provider"

interface HistoryRow {
  id: string
  student_id: string
  establishment_id: string
  event_type: "linked" | "unlinked" | "reactivated"
  relationship: string | null
  student_first_name: string | null
  student_last_name: string | null
  occurred_at: string
}

const eventLabels = {
  linked: "Association créée",
  unlinked: "Association retirée",
  reactivated: "Association réactivée",
} as const

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ParentAssociationHistoryPage() {
  const { utilisateur } = useAuthentification()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!utilisateur?.id) return
    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabaseBrowser
      .from("parent_student_association_history")
      .select("id,student_id,establishment_id,event_type,relationship,student_first_name,student_last_name,occurred_at")
      .eq("guardian_user_id", utilisateur.id)
      .order("occurred_at", { ascending: false })
      .limit(100)

    if (queryError) {
      setError("Impossible de charger l'historique des associations.")
    } else {
      setRows((data ?? []) as HistoryRow[])
    }
    setLoading(false)
  }, [utilisateur?.id])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-pierre"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Chargement de l'historique…</div>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-terre">Mes enfants</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-terre">Historique des associations</h1>
          <p className="mt-1 text-sm text-pierre">Retrouvez les associations ajoutées, retirées ou réactivées depuis votre compte.</p>
        </div>
        <Button variant="outline" onClick={() => void loadHistory()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </header>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="p-4 text-sm text-red-700">{error}</CardContent></Card>}

      {!error && rows.length === 0 && (
        <Card className="border-dashed border-terre/20 bg-papier"><CardContent className="flex flex-col items-center py-14 text-center"><History className="mb-3 h-9 w-9 text-terre/60" /><h2 className="font-semibold text-terre">Aucun historique</h2><p className="mt-1 text-sm text-pierre">Les prochaines modifications de vos associations apparaîtront ici.</p></CardContent></Card>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const name = `${row.student_first_name ?? "Élève"} ${row.student_last_name ?? ""}`.trim()
          const Icon = row.event_type === "linked" ? UserPlus : row.event_type === "reactivated" ? UserCheck : UserMinus
          return (
            <Card key={row.id} className="border-terre/10 bg-papier shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terre/10 text-terre"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base text-terre">{name}</CardTitle>
                    <p className="mt-1 text-xs text-pierre">{formatDate(row.occurred_at)}</p>
                  </div>
                  <Badge variant="outline">{eventLabels[row.event_type]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-pierre">
                {row.relationship && <span>Relation : {row.relationship}</span>}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
