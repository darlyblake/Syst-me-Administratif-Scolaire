"use client"

import Link from "next/link"
import { useState } from "react"
import { CreditCard, FileText, GraduationCap, Mail, Phone, Plus, RefreshCw, UserX } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { LinkChildModal } from "@/components/parent/LinkChildModal"

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA"
}

export default function ParentsEnfantsPage() {
  const { loading, error, refresh, children, grades, payments, claimChild } = useParentPortal()
  const [linkOpen, setLinkOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-pierre">
        <div className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 animate-spin" />Chargement de vos enfants…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-terre/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-terre">Espace parents</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-terre">Mes enfants</h1>
          <p className="mt-1 text-sm text-pierre">
            {children.length} enfant{children.length > 1 ? "s" : ""} associé{children.length > 1 ? "s" : ""} à votre compte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
          <Button onClick={() => setLinkOpen(true)}><Plus className="mr-2 h-4 w-4" />Ajouter un enfant</Button>
        </div>
      </header>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>Réessayer</Button>
          </CardContent>
        </Card>
      )}

      {children.length === 0 && !error && (
        <Card className="border-dashed border-terre/20 bg-papier">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-terre/10 text-terre"><GraduationCap className="h-7 w-7" /></div>
            <h2 className="font-semibold text-terre">Aucun enfant associé</h2>
            <p className="mt-1 max-w-md text-sm text-pierre">Ajoutez votre enfant avec son identifiant scolaire et sa date de naissance. Vous pouvez aussi scanner son QR code.</p>
            <Button className="mt-5" onClick={() => setLinkOpen(true)}><Plus className="mr-2 h-4 w-4" />Ajouter mon enfant</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {children.map((child) => {
          // The RLS policies are the authoritative security boundary. These UI filters
          // additionally prevent displaying academic/financial data when the guardian
          // link does not grant the corresponding permission.
          const childGrades = child.can_view_academic ? grades.filter((grade) => grade.student_id === child.id) : []
          const average = childGrades.length ? childGrades.reduce((sum, grade) => sum + grade.score, 0) / childGrades.length : null
          const paid = child.can_view_finance
            ? payments.filter((payment) => payment.enrollment_id === child.enrollment_id).reduce((sum, payment) => sum + payment.amount, 0)
            : 0

          return (
            <Card key={child.id} className="overflow-hidden border-terre/10 bg-papier shadow-sm">
              <div className="bg-terre px-6 py-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
                    {child.first_name?.[0]}{child.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{child.first_name} {child.last_name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-white/90"><GraduationCap className="h-4 w-4" />{child.class_name ?? "Classe non attribuée"}</p>
                  </div>
                </div>
              </div>

              <CardHeader className="pb-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={child.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}>{child.active ? "Actif" : "Inactif"}</Badge>
                  {child.student_number && <Badge variant="outline">Matricule : {child.student_number}</Badge>}
                  {child.relationship && <Badge variant="outline">{child.relationship}</Badge>}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-terre/10 p-3 text-sm">
                  <div><p className="text-xs text-pierre">Date de naissance</p><p className="mt-1 font-medium text-terre">{formatDate(child.birth_date)}</p></div>
                  <div><p className="text-xs text-pierre">Moyenne</p><p className="mt-1 font-medium text-terre">{child.can_view_academic && average !== null ? average.toFixed(1) + " / 20" : "Non disponible"}</p></div>
                </div>

                <div className="space-y-1.5 text-sm text-pierre">
                  {child.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{child.phone}</p>}
                  {child.email && <p className="flex items-center gap-2 break-all"><Mail className="h-3.5 w-3.5" />{child.email}</p>}
                </div>

                {child.can_view_finance && (
                  <div className="rounded-lg border border-terre/10 bg-creme p-4">
                    <p className="text-xs text-pierre">Total des paiements enregistrés</p>
                    <p className="mt-1 font-semibold text-terre">{formatAmount(paid)}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {child.can_view_academic && (
                    <>
                      <Button size="sm" asChild><Link href={"/parents/notes?eleve=" + child.id}><FileText className="mr-1.5 h-4 w-4" />Notes</Link></Button>
                      <Button size="sm" variant="outline" asChild><Link href={"/parents/absences?eleve=" + child.id}><UserX className="mr-1.5 h-4 w-4" />Absences</Link></Button>
                    </>
                  )}
                  {child.can_view_finance && <Button size="sm" variant="outline" asChild><Link href={"/parents/paiements?eleve=" + child.id}><CreditCard className="mr-1.5 h-4 w-4" />Paiements</Link></Button>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <LinkChildModal open={linkOpen} onOpenChange={setLinkOpen} onSubmit={async (input) => { await claimChild(input) }} />
    </div>
  )
}
